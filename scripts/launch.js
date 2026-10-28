'use strict';

/**
 * Launch Electron with a clean environment.
 * Some terminals (including agent sandboxes) set ELECTRON_RUN_AS_NODE=1,
 * which would turn the Electron binary into a plain Node process.
 */
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_NO_ATTACH_CONSOLE;

const appRoot = path.join(__dirname, '..');
const userData = env.FLOATASK_USER_DATA || path.join(appRoot, '.userdata');
env.FLOATASK_USER_DATA = userData;
try { require('fs').mkdirSync(userData, { recursive: true }); } catch { /* main will fall back */ }

// Some confined Windows sessions cannot initialize Chromium's GPU sandbox or
// crashpad. These switches keep the UI usable in such environments; on a normal
// desktop they are harmless for a small utility window.
const early = [];
const appArgs = [];
for (const arg of process.argv.slice(2)) {
  if (/^--remote-debugging-port=/.test(arg) || /^--inspect/.test(arg)) early.push(arg);
  else appArgs.push(arg);
}

const args = [
  '--no-sandbox',
  '--disable-gpu',
  '--disable-crash-reporter',
  ...early,
  `--user-data-dir=${userData}`,
  appRoot,
  ...appArgs
];
const child = spawn(electron, args, {
  cwd: path.join(__dirname, '..'),
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error('[floatask] failed to launch Electron:', err.message);
  process.exit(1);
});
