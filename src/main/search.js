'use strict';

const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function normalizeSpace(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t\r\f\v]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function decodeHtml(buffer, contentType = '') {
  let charset = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1] || '';
  if (!charset) {
    const head = Buffer.from(buffer).slice(0, 8192).toString('latin1');
    charset = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1] || 'utf-8';
  }
  try {
    return new TextDecoder(charset.toLowerCase()).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

async function fetchHtml(url, timeoutMs = 8000) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': UA,
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8'
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get('content-type') || '';
  if (contentType && !/html|xml|text\/plain/i.test(contentType)) {
    throw new Error('不是网页内容');
  }
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > 2_500_000) throw new Error('页面太大');
  return decodeHtml(buffer, contentType);
}

function decodeBingUrl(href) {
  if (!href) return '';
  try {
    const url = new URL(href, 'https://www.bing.com');
    if (/(^|\.)bing\.com$/i.test(url.hostname) && url.pathname.includes('/ck/a')) {
      const u = url.searchParams.get('u');
      if (u && u.startsWith('a1')) {
        const decoded = Buffer.from(u.slice(2), 'base64url').toString('utf8');
        if (/^https?:\/\//i.test(decoded)) return decoded;
      }
    }
    if (/^https?:\/\//i.test(url.href)) return url.href;
  } catch { /* ignore */ }
  return '';
}

function parseBing(html) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();
  $('li.b_algo').each((_, el) => {
    const node = $(el);
    if (node.hasClass('b_ad') || node.hasClass('b_adLastChild')) return;
    const anchor = node.find('h2 a').first();
    const title = normalizeSpace(anchor.text());
    const url = decodeBingUrl(anchor.attr('href'));
    if (!title || !url || seen.has(url)) return;
    let snippet = normalizeSpace(node.find('.b_caption p').first().text());
    if (!snippet) snippet = normalizeSpace(node.find('p').first().text());
    seen.add(url);
    results.push({ title, url, snippet: snippet.slice(0, 500), content: '' });
  });
  return results;
}

function parseBaidu(html) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();
  $('div.result, div.result-op').each((_, el) => {
    const node = $(el);
    const anchor = node.find('h3 a').first();
    const title = normalizeSpace(anchor.text());
    let url = anchor.attr('href') || '';
    if (url.startsWith('/')) url = 'https://www.baidu.com' + url;
    if (!title || !url || seen.has(url)) return;
    let snippet = normalizeSpace(node.find('.c-abstract, .content-right_8Zs40, .c-span-last').first().text());
    seen.add(url);
    results.push({ title, url, snippet: snippet.slice(0, 500), content: '' });
  });
  return results;
}

function extractReadable(html, finalUrl = '') {
  const $ = cheerio.load(html);
  $('script,style,noscript,svg,canvas,iframe,nav,header,footer,aside,form,button,select,input,textarea,' +
    '.nav,.navbar,.menu,.sidebar,.footer,.header,.breadcrumb,.ad,.ads,.advertisement,.share,.comment,.comments,' +
    '[aria-hidden="true"]').remove();

  let root = $('article').first();
  if (!root.length) root = $('main, [role="main"]').first();
  if (!root.length) {
    let best = null;
    let bestScore = 0;
    $('div, section').each((_, el) => {
      const n = $(el);
      const paragraphs = n.find('p').length;
      const textLength = normalizeSpace(n.text()).length;
      if (paragraphs < 2 || textLength < 200) return;
      const score = textLength + paragraphs * 80;
      if (score > bestScore) {
        bestScore = score;
        best = n;
      }
    });
    root = best ? $(best) : $('body');
  }

  const lines = [];
  const seen = new Set();
  root.find('h1,h2,h3,p,li,pre,blockquote,td').each((_, el) => {
    const node = $(el);
    if (node.closest('nav, footer, header, aside').length) return;
    let text = normalizeSpace(node.text());
    if (!text || text.length < 8) return;
    if (text.length > 1200) text = text.slice(0, 1200) + '…';
    if (seen.has(text)) return;
    seen.add(text);
    lines.push(text);
    if (lines.length >= 45) return false;
    return;
  });

  let text = lines.join('\n');
  if (text.length < 160) {
    text = normalizeSpace($('body').text()).slice(0, 5000);
  }
  return text.slice(0, 5000);
}

async function enrich(results, limit = 3) {
  const chosen = results.slice(0, limit);
  await Promise.allSettled(chosen.map(async (item) => {
    try {
      const html = await fetchHtml(item.url, 6000);
      const content = extractReadable(html, item.url);
      if (content && content.length >= 80) item.content = content;
    } catch { /* snippet is still useful */ }
  }));
  return results;
}

function cleanQuery(query) {
  return String(query || '')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

async function bingSearch(query) {
  const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&count=8&setlang=zh-Hans&ensearch=0`;
  const html = await fetchHtml(url, 9000);
  return parseBing(html);
}

async function searxngSearch(query, baseUrl) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(base)) throw new Error('SearXNG 地址无效');
  const url = `${base}/search?q=${encodeURIComponent(query)}&format=json&language=zh-CN`;
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/json' },
    signal: AbortSignal.timeout(9000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.results || []).slice(0, 8).map((r) => ({
    title: normalizeSpace(r.title),
    url: r.url,
    snippet: normalizeSpace(r.content || '').slice(0, 500),
    content: ''
  })).filter((r) => r.title && /^https?:\/\//i.test(r.url) && r.url);
}

async function searchWeb(query, options = {}) {
  const q = cleanQuery(query);
  const provider = options.provider || 'bing';
  if (!q || provider === 'off') return { query: q, results: [], provider: 'off' };

  let results = [];
  let engine = provider;
  if (provider === 'searxng') {
    try {
      results = await searxngSearch(q, options.searxngUrl);
    } catch (err) {
      throw new Error(`SearXNG 检索失败：${err.message}`);
    }
  } else {
    try {
      results = await bingSearch(q);
    } catch (err) {
      throw new Error(`必应检索失败：${err.message}`);
    }
    if (!results.length) {
      try {
        const baiduHtml = await fetchHtml(`https://www.baidu.com/s?wd=${encodeURIComponent(q)}`, 9000);
        results = parseBaidu(baiduHtml);
        engine = 'baidu';
      } catch { /* keep empty */ }
    }
  }

  const seen = new Set();
  results = results.filter((r) => {
    if (!r.url || seen.has(r.url) || !/^https?:\/\//i.test(r.url)) return false;
    seen.add(r.url);
    return true;
  }).slice(0, 6);

  if (options.fetchPages !== false && results.length) {
    await enrich(results, options.pageLimit ?? 3);
  }
  return { query: q, results, provider: engine };
}

module.exports = { searchWeb, extractReadable, parseBing, cleanQuery };
