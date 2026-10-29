'use strict';

/**
 * Local conversation history, stored as plain JSON under userData.
 * No screenshots are kept — only text, metadata and sources.
 */
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const MAX_RECORDS = 500;
const MAX_SELECTION_CHARS = 2000;
const MAX_TOTAL_MESSAGE_CHARS = 60000;
const MAX_SOURCES = 8;

let records = [];
let loaded = false;
let filePath = null;

function historyPath() {
  if (!filePath) filePath = path.join(app.getPath('userData'), 'history.json');
  return filePath;
}

function load() {
  if (loaded) return records;
  loaded = true;
  try {
    const raw = fs.readFileSync(historyPath(), 'utf8');
    const data = JSON.parse(raw);
    records = Array.isArray(data.records) ? data.records.filter((r) => r && typeof r.id === 'string' && Array.isArray(r.messages)).map(r => ({ ...r, messages: clampMessages(r.messages), sources: Array.isArray(r.sources) ? r.sources.slice(0, MAX_SOURCES) : [] })) : [];
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[history] could not read history:', err.message);
    records = [];
  }
  return records;
}

function persist() {
  try {
    const dir = path.dirname(historyPath());
    fs.mkdirSync(dir, { recursive: true });
    const tmp = historyPath() + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ schemaVersion: 1, records }, null, 2), 'utf8');
    fs.renameSync(tmp, historyPath());
  } catch (err) {
    console.warn('[history] could not write history:', err.message);
    loaded = false;
    throw err;
  }
}

function clampMessages(messages) {
  const out = [];
  let budget = MAX_TOTAL_MESSAGE_CHARS;
  for (const item of messages || []) {
    if (!item || !item.content) continue;
    if (item.role !== 'user' && item.role !== 'assistant') continue;
    const content = String(item.content).slice(0, Math.max(0, budget));
    budget -= content.length;
    out.push({ role: item.role, content });
    if (budget <= 0) break;
  }
  return out;
}

function makeTitle(session) {
  const base = String(session.selectionText || session.lastQuestion || '')
    .replace(/\s+/g, ' ').trim();
  if (base) return base.slice(0, 48);
  const firstUser = (session.history || []).find((m) => m.role === 'user');
  if (firstUser) return String(firstUser.content).replace(/\s+/g, ' ').trim().slice(0, 48);
  return '';
}

function sourceOf(session) {
  if (session.windowInfo?.process === 'clipboard') return 'clipboard';
  if (session.manual) return 'manual';
  return 'selection';
}

/**
 * Upsert the in-flight session into history. Called after each completed
 * (or partially completed) answer.
 */
function record(session, meta = {}) {
  load();
  const messages = clampMessages(session.history || []);
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) return null;

  if (!session.historyId) session.historyId = `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const existing = records.find((r) => r.id === session.historyId);
  const now = Date.now();

  if (existing) {
    existing.updatedAt = now;
    existing.messages = messages;
    existing.messageCount = messages.length;
    existing.title = existing.title || makeTitle(session);
    existing.selectionText = String(session.selectionText || '').slice(0, MAX_SELECTION_CHARS);
    existing.sources = (session.pendingSources || session.sources || []).slice(0, MAX_SOURCES)
      .map(({ title, url }) => ({ title, url }));
    existing.model = meta.model || existing.model;
    existing.provider = meta.provider || existing.provider;
    existing.hasImage = existing.hasImage || Boolean(session.imageDataUrl);
    persist();
    return existing;
  }

  const rec = {
    id: session.historyId,
    createdAt: now,
    updatedAt: now,
    favorite: false,
    title: makeTitle(session),
    source: sourceOf(session),
    windowTitle: String(session.windowInfo?.title || '').slice(0, 160),
    process: String(session.windowInfo?.process || '').slice(0, 80),
    selectionText: String(session.selectionText || '').slice(0, MAX_SELECTION_CHARS),
    messages,
    messageCount: messages.length,
    sources: (session.pendingSources || session.sources || []).slice(0, MAX_SOURCES)
      .map(({ title, url }) => ({ title, url })),
    model: meta.model || '',
    provider: meta.provider || '',
    hasImage: Boolean(session.imageDataUrl)
  };
  records.unshift(rec);
  trim();
  persist();
  return rec;
}

function trim() {
  records.sort((a,b) => b.updatedAt - a.updatedAt);
  if (records.length <= MAX_RECORDS) return;
  const overflow = records.length - MAX_RECORDS;
  // Drop the oldest non-favorite records first; favorites survive longer.
  const doomed = [];
  for (let i = records.length - 1; i >= 0 && doomed.length < overflow; i--) {
    if (!records[i].favorite) doomed.push(i);
  }
  for (const index of doomed) records.splice(index, 1);
  // Explicit favorites are never silently removed.
}

/** Light rows for the list view. */
function list() {
  load();
  return records
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      favorite: Boolean(r.favorite),
      title: r.title || '',
      source: r.source,
      windowTitle: r.windowTitle || '',
      messageCount: r.messageCount || (r.messages || []).length,
      snippet: String(
        [...(r.messages || [])].reverse().find((m) => m.role === 'assistant')?.content || ''
      ).replace(/\s+/g, ' ').trim().slice(0, 120)
    }));
}

function get(id) {
  load();
  const rec = records.find((r) => r.id === id);
  return rec ? JSON.parse(JSON.stringify(rec)) : null;
}

function setFavorite(id, favorite) {
  load();
  const rec = records.find((r) => r.id === id);
  if (!rec) return false;
  rec.favorite = Boolean(favorite);
  persist();
  return true;
}

function remove(id) {
  load();
  const index = records.findIndex((r) => r.id === id);
  if (index < 0) return false;
  records.splice(index, 1);
  persist();
  return true;
}

/** Remove everything; favorites are kept unless keepFavorites is false. */
function clear(keepFavorites = true) {
  load();
  const before = records.length;
  records = keepFavorites ? records.filter((r) => r.favorite) : [];
  persist();
  return before - records.length;
}

module.exports = { load, record, list, get, setFavorite, remove, clear, historyPath };
