'use strict';

/**
 * Electron 30+ no longer ships a postinstall hook for its binary.
 * Make sure the matching runtime exists before `npm start`/`npm run pack`.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const electronDir = path.join(root, 'node_modules', 'electron');
const binary = path.join(electronDir, 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
const installScript = path.join(electronDir, 'install.js');

if (fs.existsSync(binary)) process.exit(0);

if (!fs.existsSync(installScript)) {
  console.error('\n[floatask] electron 依赖还没安装，请先运行：npm install\n');
  process.exit(1);
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_SKIP_BINARY_DOWNLOAD;
env.ELECTRON_MIRROR = env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
env.electron_config_cache = env.electron_config_cache || path.join(root, '.electron-cache');

console.log('[floatask] 正在下载 Electron 运行时（首次启动需要，约 160MB）…');
const result = spawnSync(process.execPath, [installScript], {
  cwd: root,
  env,
  stdio: 'inherit'
});

if (result.status !== 0) {
  console.error('\n[floatask] Electron 运行时下载失败。');
  console.error('可以设置 ELECTRON_MIRROR 后重试，例如：');
  console.error('  $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"');
  console.error('  npm start\n');
  process.exit(result.status || 1);
}

if (!fs.existsSync(binary)) {
  console.error('[floatask] Electron 下载完成但没有找到可执行文件：' + binary);
  process.exit(1);
}
console.log('[floatask] Electron 运行时已就绪。');
