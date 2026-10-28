'use strict';

const { app } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PS_EXE = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

function tempDir() {
  // app.getPath('temp') can be denied in confined Windows sessions.
  // userData is the one directory we know the app can write.
  const dir = path.join(app.getPath('userData'), 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureScript(name) {
  const source = path.join(__dirname, '..', '..', 'resources', name);
  const dest = path.join(tempDir(), name);
  const content = fs.readFileSync(source);
  let current = null;
  try { current = fs.readFileSync(dest); } catch { /* missing */ }
  if (!current || !current.equals(content)) fs.writeFileSync(dest, content);
  return dest;
}

function parseJson(stdout) {
  const lines = String(stdout || '').split(/\r?\n/).map((l) => l.replace(/^\uFEFF/, '').trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].startsWith('{')) continue;
    try { return JSON.parse(lines[i]); } catch { /* try earlier line */ }
  }
  return null;
}

function runPowerShell(scriptPath, args = [], timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const child = spawn(PS_EXE, [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      ...args
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch { /* ignore */ }
      reject(new Error('Windows 脚本执行超时'));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        const parsed = parseJson(stdout);
        const message = parsed?.error || stderr.trim() || `PowerShell 退出码 ${code}`;
        reject(new Error(message));
        return;
      }
      const parsed = parseJson(stdout);
      if (!parsed) {
        reject(new Error(stderr.trim() || '无法解析 Windows 返回结果'));
        return;
      }
      resolve(parsed);
    });
  });
}

function cleanOcrText(text) {
  let value = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  for (let i = 0; i < 3; i++) {
    value = value
      .replace(/([\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g, '$1')
      .replace(/([\u3400-\u9fff])\s+([，。！？；：、）》】”’])/g, '$1$2')
      .replace(/([（《【“‘])\s+([\u3400-\u9fff])/g, '$1$2');
  }
  return value.replace(/[ \t]{2,}/g, ' ').slice(0, 6000).trim();
}

async function recognizeImage(pngPath) {
  const script = ensureScript('ocr.ps1');
  const result = await runPowerShell(script, ['-Path', pngPath], 30000);
  return {
    text: cleanOcrText(result.text),
    rawText: String(result.text || ''),
    lang: result.lang || '',
    lineCount: result.lineCount || 0,
    width: result.width || 0,
    height: result.height || 0
  };
}

const FALLBACK_FONTS = [
  'Microsoft YaHei UI',
  'Microsoft YaHei',
  'Segoe UI',
  'SimSun',
  'SimHei',
  'KaiTi',
  'FangSong',
  'DengXian',
  'Cascadia Code',
  'Consolas'
];

let fontCache = null;

async function listSystemFonts(force = false) {
  if (!force && fontCache && Date.now() - fontCache.at < 10 * 60 * 1000) return fontCache.value;
  let fonts = [];
  try {
    const script = ensureScript('fonts.ps1');
    const result = await runPowerShell(script, [], 20000);
    const raw = Array.isArray(result?.fonts) ? result.fonts : [result?.fonts].filter(Boolean);
    fonts = raw
      .map((name) => String(name || '').trim())
      .filter((name) => name && !name.startsWith('@') && name.length <= 120);
  } catch (err) {
    console.warn('[fonts] enumeration failed:', err.message);
  }
  const seen = new Set();
  fonts = fonts.filter((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const usedFallback = !fonts.length;
  if (usedFallback) fonts = FALLBACK_FONTS.slice();
  const value = { fonts, fallback: usedFallback };
  fontCache = usedFallback ? null : { at: Date.now(), value };
  return value;
}

async function getForegroundInfo(ignorePid = 0) {
  try {
    const script = ensureScript('context.ps1');
    const result = await runPowerShell(script, ['-IgnorePid', String(ignorePid)], 8000);
    return {
      title: String(result.title || '').slice(0, 300),
      process: String(result.process || '').slice(0, 80),
      pid: Number(result.pid) || 0,
      rect: result.rect || null
    };
  } catch (err) {
    console.warn('[context] failed:', err.message);
    return { title: '', process: '', pid: 0, rect: null };
  }
}

module.exports = {
  recognizeImage,
  getForegroundInfo,
  cleanOcrText,
  tempDir,
  ensureScript,
  runPowerShell,
  listSystemFonts
};
