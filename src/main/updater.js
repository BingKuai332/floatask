'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const REPOSITORY = 'BingKuai332/floatask';
const MAX_DOWNLOAD = 800 * 1024 * 1024;
function versionParts(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value));
  if (!match) throw new Error('update.invalidVersion');
  return match.slice(1).map(Number);
}
function isNewer(candidate, current) {
  const a = versionParts(candidate), b = versionParts(current);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
function releaseInfo(release, current) {
  if (release.draft || release.prerelease || !isNewer(release.tag_name, current)) return null;
  const version = release.tag_name.replace(/^v/, '');
  const name = `FloatAsk-v${version}-win32-x64.zip`;
  const zip = release.assets?.find(a => a.name === name);
  const checksum = release.assets?.find(a => a.name === name + '.sha256');
  if (!zip || !checksum || !Number.isSafeInteger(zip.size) || zip.size <= 0 || zip.size > MAX_DOWNLOAD) throw new Error('update.noPackage');
  const prefix = `https://github.com/${REPOSITORY}/releases/download/${release.tag_name}/`;
  for (const asset of [zip, checksum]) {
    if (asset.browser_download_url !== prefix + asset.name) throw new Error('update.invalidSource');
  }
  return { version, name, size: zip.size, url: zip.browser_download_url, checksumUrl: checksum.browser_download_url,
    releaseUrl: `https://github.com/${REPOSITORY}/releases/tag/${release.tag_name}` };
}
function createUpdater({ app, onState = () => {}, request = (...args) => fetch(...args), launch = spawn, executable = process.execPath, platform = process.platform }) {
  let state = { phase: 'idle', currentVersion: app.getVersion(), available: null, progress: 0, error: '' };
  let busy = false, downloaded = null;
  const folder = path.join(app.getPath('userData'), 'updates');
  const capable = platform === 'win32' && app.isPackaged;
  function emit(patch) { state = { ...state, ...patch }; onState(getState()); return getState(); }
  function getState() { return { ...state, available: state.available ? { ...state.available } : null, canInstall: capable }; }
  async function get(url, timeout = 30000) {
    const res = await request(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'FloatAsk/' + app.getVersion() }, signal: AbortSignal.timeout(timeout) });
    if (res.status === 404) { const err = new Error('update.noRelease'); err.status = 404; throw err; }
    if (!res.ok) throw new Error('update.network');
    if (res.url && !['api.github.com','github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(new URL(res.url).hostname)) throw new Error('update.invalidSource');
    return res;
  }
  function fail(error) { return emit({ phase: 'error', error: /^update\./.test(error.message) ? error.message : 'update.failed' }); }
  async function check() {
    if (busy || state.phase === 'ready') return getState();
    busy = true;
    emit({ phase: 'checking', error: '', available: null });
    try {
      const release = await (await get(`https://api.github.com/repos/${REPOSITORY}/releases/latest`)).json();
      const available = releaseInfo(release, app.getVersion());
      return emit({ phase: available ? 'available' : 'current', available });
    } catch (error) {
      if (error.status === 404) return emit({ phase: 'noRelease' });
      return fail(error);
    } finally { busy = false; }
  }
  async function download() {
    if (busy) return getState();
    if (!capable) return fail(new Error('update.devOnly'));
    const available = state.available;
    if (!available) return getState();
    busy = true; downloaded = null;
    emit({ phase: 'downloading', progress: 0, error: '' });
    const filename = path.join(folder, available.name);
    const partial = filename + '.part';
    let file;
    try {
      fs.mkdirSync(folder, { recursive: true });
      const checksumResponse = await get(available.checksumUrl);
      if (Number(checksumResponse.headers.get('content-length') || 0) > 4096) throw new Error('update.checksum');
      let checksumText = '';
      for await (const chunk of checksumResponse.body) { checksumText += Buffer.from(chunk).toString(); if (checksumText.length > 4096) throw new Error('update.checksum'); }
      const match = /^([a-f0-9]{64})\s+\*?([^\r\n]+)\s*$/i.exec(checksumText.trim());
      if (!match || match[2] !== available.name) throw new Error('update.checksum');
      const expected = match[1].toLowerCase();
      const response = await get(available.url, 10 * 60 * 1000);
      file = await fs.promises.open(partial, 'w');
      const hash = crypto.createHash('sha256'); let bytes = 0, lastPercent = -1;
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > available.size || bytes > MAX_DOWNLOAD) throw new Error('update.size');
        hash.update(chunk); await file.writeFile(chunk);
        const percent = Math.floor(bytes * 100 / available.size);
        if (percent !== lastPercent) { lastPercent = percent; emit({ progress: percent }); }
      }
      await file.close(); file = null;
      if (bytes !== available.size) throw new Error('update.size');
      if (hash.digest('hex') !== expected) throw new Error('update.checksum');
      await fs.promises.rename(partial, filename);
      downloaded = { filename, sha256: expected };
      return emit({ phase: 'ready', progress: 100 });
    } catch (error) { return fail(error); }
    finally {
      // A failed close/delete must not leave the updater permanently busy.
      try { if (file) await file.close(); }
      catch (error) { console.warn('[updater] partial file close failed:', error.code); }
      try { await fs.promises.rm(partial, { force: true }); }
      catch (error) { console.warn('[updater] partial file cleanup failed:', error.code); }
      busy = false;
    }
  }
  async function install() {
    if (busy || !downloaded || state.phase !== 'ready' || !capable) return { ok: false };
    busy = true;
    try {
      const destination = path.dirname(path.resolve(executable));
      if (path.basename(executable).toLowerCase() !== 'floatask.exe') throw new Error('update.invalidDestination');
      const probe = path.join(destination, `.floatask-update-probe-${process.pid}`);
      fs.writeFileSync(probe, ''); fs.unlinkSync(probe);
      const helper = path.join(folder, 'apply-update.ps1');
      fs.copyFileSync(path.join(__dirname, '../../resources/update.ps1'), helper);
      const task = path.join(folder, 'update-task.json');
      const readyFile = path.join(folder, `update-ready-${crypto.randomBytes(8).toString('hex')}.json`);
      const report = path.join(folder, 'update-result.json');
      fs.rmSync(report, { force: true });
      fs.writeFileSync(task, JSON.stringify({ parentPid: process.pid, destination, executable: path.resolve(executable),
        archive: downloaded.filename, sha256: downloaded.sha256, userData: app.getPath('userData'),
        readyFile,
        launchArgs: process.argv.slice(1).filter(arg => ['--no-sandbox','--disable-gpu','--disable-crash-reporter'].includes(arg)) }));
      const child = launch('powershell.exe', ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',helper,'-TaskFile',task], {
        detached: true, windowsHide: true, stdio: 'ignore'
      });
      await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
      child.unref();
      // Process creation alone does not prove that PowerShell loaded the helper.
      // Keep the application alive until the script has validated the task and checksum.
      try {
        const deadline = Date.now() + 30000;
        while (!fs.existsSync(readyFile)) {
          if (typeof child.exitCode === 'number' || fs.existsSync(report) || Date.now() >= deadline) throw new Error('update.installFailed');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        // A helper that never became ready must not linger and race a later retry.
        try { child.kill(); } catch { /* it may already have exited */ }
        throw error;
      } finally {
        try { fs.rmSync(readyFile, { force: true }); }
        catch (error) { console.warn('[updater] readiness file cleanup failed:', error.code); }
      }
      emit({ phase: 'installing' });
      return { ok: true };
    } catch (error) { fail(error); busy = false; return { ok: false }; }
  }
  try {
    const result = JSON.parse(fs.readFileSync(path.join(folder, 'update-result.json'), 'utf8').replace(/^\uFEFF/, ''));
    if (result.ok === false) state = { ...state, phase: 'error', error: 'update.installFailed' };
  } catch { /* no previous installation */ }
  return { getState, check, download, install };
}
module.exports = { REPOSITORY, versionParts, isNewer, releaseInfo, createUpdater };
