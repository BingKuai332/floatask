'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
test('portable installer preserves user data, rejects unsafe archives and rolls back failed copies', {skip:process.platform!=='win32'}, () => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'floatask-installer-'));
 try {
  const fixture=path.join(root,'package','FloatAsk-win32-x64');
  fs.mkdirSync(path.join(fixture,'resources'),{recursive:true});
  fs.writeFileSync(path.join(fixture,'FloatAsk.exe'),'new executable');fs.writeFileSync(path.join(fixture,'resources','app.asar'),'new application');
  const helper=path.resolve(__dirname,'../resources/update.ps1');
  function powershell(script,args) {return spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-File',script,...args],{encoding:'utf8',windowsHide:true,timeout:30000});}
  function prepare(name,malicious=false) {
   const destination=path.join(root,name,'app'),work=path.join(destination,'userdata','updates');fs.mkdirSync(work,{recursive:true});
   fs.writeFileSync(path.join(destination,'FloatAsk.exe'),'old executable');
   fs.writeFileSync(path.join(destination,'userdata','history.json'),'private-history');
   const archive=path.join(work,'update.zip');
   const result=malicious ? powershell(path.join(__dirname,'unsafe-archive.ps1'),['-Archive',archive]) : powershell(path.resolve(__dirname,'../scripts/release.ps1'),['-Source',fixture,'-Destination',archive]);
   assert.equal(result.status,0,result.stderr);
   const task=path.join(work,'task.json');fs.writeFileSync(task,JSON.stringify({parentPid:0,destination,executable:path.join(destination,'FloatAsk.exe'),archive,sha256:crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),userData:path.join(destination,'userdata'),readyFile:path.join(work,'update-ready-aabb.json')}));
   return {destination,work,task};
  }
  const normal=prepare('中文路径 with spaces');
  let result=powershell(helper,['-TaskFile',normal.task,'-NoRestart']);assert.equal(result.status,0,result.stderr+result.stdout+fs.readFileSync(path.join(normal.work,'update-result.json'),'utf8'));
  assert.equal(fs.readFileSync(path.join(normal.destination,'FloatAsk.exe'),'utf8'),'new executable');
  assert.equal(fs.readFileSync(path.join(normal.destination,'userdata','history.json'),'utf8'),'private-history');
  assert.equal(fs.existsSync(path.join(normal.work,'update-ready-aabb.json')),true,'helper acknowledges successful startup');
  const failed=prepare('rollback');fs.writeFileSync(path.join(failed.destination,'resources'),'blocks resource directory');
  result=powershell(helper,['-TaskFile',failed.task,'-NoRestart']);assert.equal(result.status,1);
  assert.equal(fs.readFileSync(path.join(failed.destination,'FloatAsk.exe'),'utf8'),'old executable');
  assert.equal(fs.readFileSync(path.join(failed.destination,'userdata','history.json'),'utf8'),'private-history');
  const unsafe=prepare('traversal',true);result=powershell(helper,['-TaskFile',unsafe.task,'-NoRestart']);assert.equal(result.status,1);
  const report=JSON.parse(fs.readFileSync(path.join(unsafe.work,'update-result.json'),'utf8').replace(/^\uFEFF/,''));assert.equal(report.ok,false);assert.match(report.message,/escapes|layout/);
 } finally {if(path.dirname(root)===path.resolve(os.tmpdir()) && path.basename(root).startsWith('floatask-installer-'))fs.rmSync(root,{recursive:true,force:true});}
});
