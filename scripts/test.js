'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const checks = spawnSync(process.execPath, ['--test', path.join(__dirname, '../tests/unit.test.js')], {stdio:'inherit', windowsHide:true});
if (checks.status !== 0) process.exit(checks.status ?? 1);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const testData = fs.mkdtempSync(path.join(os.tmpdir(), 'floatask-smoke-'));
env.FLOATASK_USER_DATA = testData;
const result = spawnSync(require('electron'), ['--no-sandbox', '--disable-gpu', '--disable-crash-reporter', path.join(__dirname, '../tests/electron-smoke.js')], {env, stdio:'inherit', windowsHide:true, timeout:60000});
// Only remove this runner's explicitly created temporary test directory.
if (path.dirname(testData) === path.resolve(os.tmpdir()) && path.basename(testData).startsWith('floatask-smoke-')) {
  fs.rmSync(testData, {recursive:true, force:true});
}
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
