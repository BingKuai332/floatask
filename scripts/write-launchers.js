'use strict';

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'dist', 'FloatAsk-win32-x64');
if (!fs.existsSync(dir)) {
  console.error('[floatask] packaged directory not found:', dir);
  process.exit(1);
}

const content = [
  '@echo off',
  'setlocal',
  'set "ELECTRON_RUN_AS_NODE="',
  'set "ROOT=%~dp0"',
  'if not exist "%ROOT%userdata" mkdir "%ROOT%userdata"',
  'set "FLOATASK_USER_DATA=%ROOT%userdata"',
  'start "" "%ROOT%FloatAsk.exe" --no-sandbox --disable-gpu --disable-crash-reporter --user-data-dir="%ROOT%userdata"',
  'endlocal',
  ''
].join('\r\n');

fs.writeFileSync(path.join(dir, 'Start-FloatAsk.cmd'), content, 'ascii');
fs.writeFileSync(path.join(dir, '启动浮问.cmd'), content, 'utf8');
console.log('[floatask] launchers written to', dir);
