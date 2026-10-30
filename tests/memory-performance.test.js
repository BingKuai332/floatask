'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm');
test('large history transfers summaries only, searches full messages, and reloads after cache release',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'floatask-memory-'));
 try {
  const records=Array.from({length:500},(_,i)=>({id:'h'+i,updatedAt:i,title:'Session '+i,favorite:i===12,messages:[{role:'assistant',content:'X'.repeat(49970)+' unique-'+i+' ending'}]}));
  fs.writeFileSync(path.join(directory,'history.json'),JSON.stringify({records}));
  const context={require:name=>name==='electron'?{app:{getPath:()=>directory}}:require(name),module:{exports:{}},console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/main/history.js'),'utf8'),context);
  const history=context.module.exports;
  const summaries=history.list();
  const previousBytes=Buffer.byteLength(JSON.stringify(records));
  const summaryBytes=Buffer.byteLength(JSON.stringify(summaries));
  assert(summaryBytes < previousBytes / 100,'no full messages should be transferred or indexed in the renderer');
  assert.equal(history.list({query:'UNIQUE-12 ENDING',favorites:true}).length,1);
  assert.equal(history.list({query:'does not exist'}).length,0);
  const session={historyId:'h12',history:[{role:'assistant',content:'Updated answer'}]};
  history.record(session);assert.equal(history.list({query:'updated answer'})[0].snippet,'Updated answer');
  history.release();assert.equal(history.get('h12').favorite,true,'release must not remove persisted records');
  console.log(`History fixture (500 records): full records ${previousBytes} bytes; summaries ${summaryBytes} bytes; list refresh IPC 501 -> 1`);
 } finally {if(path.dirname(directory)===path.resolve(os.tmpdir()) && path.basename(directory).startsWith('floatask-memory-'))fs.rmSync(directory,{recursive:true,force:true});}
});
test('text-only capture skips JPEG and unused PNG buffers; vision resizes the longest edge',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/main/capture.js'),'utf8');
 for(const enabled of [false,true]){
  let png=0,jpeg=0;const sizes=[];
  const image={isEmpty:()=>false,getSize:()=>({width:300,height:3000}),crop(){return this;},resize(size){sizes.push(size);return this;},toPNG(){png++;return Buffer.from('png');},toJPEG(){jpeg++;return Buffer.from('jpg');},toDataURL:()=>'data:preview'};
  const context={module:{exports:{}},require:name=>name==='electron'?{desktopCapturer:{getSources:async()=>[{display_id:'1',thumbnail:image}]},nativeImage:{}}:name==='fs'?{writeFileSync(){}}:name==='./powershell'?{tempDir:()=>os.tmpdir()}:require(name)};
  vm.runInNewContext(source,context);
  const result=await context.module.exports.captureRegion({id:1,scaleFactor:1,size:{width:300,height:3000}},{x:0,y:0,width:300,height:3000},{vision:enabled});
  assert.equal(png,1,'only the OCR PNG should be encoded');assert.equal(jpeg,enabled?1:0);assert(!('pngBuffer' in result));
  if(enabled)assert(sizes.some(size=>size.width===160 && size.height===1600));else assert.equal(result.visionDataUrl,null);
 }
});
