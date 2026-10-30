'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');

async function temporary(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'floatask-history-capture-'));
  try { await run(directory); }
  finally {
    if (path.dirname(directory) === path.resolve(os.tmpdir()) && path.basename(directory).startsWith('floatask-history-capture-')) fs.rmSync(directory, {recursive:true,force:true});
  }
}
function historyModule(directory) {
  const context = {module:{exports:{}},console,require:name => name === 'electron' ? {app:{getPath:() => directory}} : require(name)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/main/history.js'),'utf8'),context);
  return context.module.exports;
}
test('long history keeps newest turns in order and refreshes summaries across release/reload', async () => temporary(directory => {
  const history = historyModule(directory);
  const session = {selectionText:'Original selection',history:[{role:'user',content:'Original question'},{role:'assistant',content:'A'.repeat(59990)}]};
  const record = history.record(session);
  assert(history.list()[0].snippet.startsWith('A'));
  session.history.push({role:'user',content:'A recent follow-up'},{role:'assistant',content:'LATEST searchable answer'});
  history.record(session);
  let saved = history.get(record.id);
  assert.equal(saved.messages.at(-2).content,'A recent follow-up');
  assert.equal(saved.messages.at(-1).content,'LATEST searchable answer');
  assert(saved.messages.reduce((count,message) => count + message.content.length,0) <= 60000);
  assert.equal(history.list({query:'LATEST SEARCHABLE'})[0].snippet,'LATEST searchable answer');
  history.setFavorite(record.id,true);
  assert.equal(history.list({favorites:true})[0].favorite,true);
  history.release();
  saved = history.get(record.id);
  assert.equal(saved.messages.at(-2).role,'user');
  assert.equal(saved.messages.at(-1).role,'assistant');
  assert.equal(history.list({favorites:true,query:'LATEST SEARCHABLE'})[0].snippet,'LATEST searchable answer');
}));

test('BOM and malformed row fields do not hide valid persisted history or break searching', async () => temporary(directory => {
  fs.writeFileSync(path.join(directory,'history.json'),'\uFEFF'+JSON.stringify({records:[
    {id:'valid',title:'Valid session',messages:[{role:'assistant',content:'Searchable text'}]},
    {id:'legacy',title:{toString:'not callable'},updatedAt:{valueOf:'not callable'},sources:[null,{url:'https://example.com',title:'Source'}],messages:[{role:'assistant',content:{toString:'not callable'}},{role:'assistant',content:'Usable legacy text'}]}
  ]}));
  const history = historyModule(directory);
  assert.equal(history.list().length,2);
  assert.equal(history.list({query:'SEARCHABLE'})[0].id,'valid');
  assert.equal(history.list({query:'usable legacy'})[0].id,'legacy');
  assert.equal(history.get('legacy').sources.length,1);
  assert.equal(history.get('legacy').sources[0].url,'https://example.com');
  history.setFavorite('legacy',true); history.release();
  assert.equal(history.list({favorites:true})[0].snippet,'Usable legacy text');
}));

function captureModule(directory, options = {}) {
  const calls = {crops:[],resizes:[]};
  function image(width,height) {
    return {isEmpty:() => false,getSize:() => ({width,height}),
      crop(rect) {calls.crops.push(rect);return image(rect.width,rect.height);},
      resize(size) {calls.resizes.push(size);return image(size.width || Math.max(1,Math.round(width * size.height / height)),size.height || Math.max(1,Math.round(height * size.width / width)));},
      toPNG:() => Buffer.from('mock OCR PNG'),
      toJPEG:() => {if(options.failJPEG)throw new Error('JPEG failed');return Buffer.from('mock JPEG');},
      toDataURL:() => {if(options.failPreview)throw new Error('preview failed');return 'data:image/png;base64,cHJldmlldw==';}
    };
  }
  const size = options.size || {width:100,height:100};
  const context = {module:{exports:{}},require:name => name === 'electron' ? {
    desktopCapturer:{getSources:async () => [{display_id:String(options.sourceId ?? 1),thumbnail:image(size.width,size.height)}]},
    screen:{getAllDisplays:() => [{id:1}]}
  } : name === './powershell' ? {tempDir:() => directory} : require(name)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/main/capture.js'),'utf8'),context);
  return {capture:context.module.exports.captureRegion,calls,display:{id:1,scaleFactor:1,size}};
}
test('capture intersects display edges and rejects missing monitors instead of capturing another screen', async () => temporary(async directory => {
  let fixture = captureModule(directory);
  await fixture.capture(fixture.display,{x:-10,y:10,width:30,height:20});
  assert.equal(fixture.calls.crops[0].x,0);assert.equal(fixture.calls.crops[0].width,20);
  await assert.rejects(fixture.capture(fixture.display,{x:200,y:0,width:20,height:20}),/边界/);
  fixture = captureModule(directory,{sourceId:2});
  await assert.rejects(fixture.capture(fixture.display,{x:0,y:0,width:20,height:20}),/屏幕已不可用/);
  assert.equal(fixture.calls.crops.length,0);
}));
test('capture cleans OCR files on later encoding failures and keeps thin vision dimensions positive', async () => temporary(async directory => {
  for (const options of [{failJPEG:true},{failPreview:true}]) {
    const fixture = captureModule(directory,options);
    await assert.rejects(fixture.capture(fixture.display,{x:0,y:0,width:20,height:20},{vision:true}),/failed/);
    assert.equal(fs.readdirSync(directory).length,0,'failed capture must not leave OCR PNGs behind');
  }
  const fixture = captureModule(directory,{size:{width:8,height:32768}});
  const result = await fixture.capture(fixture.display,{x:0,y:0,width:8,height:32768},{vision:true});
  assert(fixture.calls.resizes.some(size => size.width === 1 && size.height === 1600));
  assert(result.visionDataUrl.startsWith('data:image/jpeg;base64,'));
}));
