'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createT } = require('../src/shared/i18n');
function transport(fetch) {
 const context={module:{exports:{}},require:name=>{assert.equal(name,'./i18n');return {t:createT('en')};},fetch,
  AbortController,AbortSignal,TextDecoder,setTimeout,clearTimeout};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/main/ai.js'),'utf8'),context);
 return context.module.exports;
}
const config={baseUrl:'https://example.invalid/v1',model:'mock'};
test('streaming consumes a final data line without a newline and split UTF-8 chunks', async()=>{
 const data=Buffer.from('data: '+JSON.stringify({choices:[{delta:{content:'最后一段回答'}}]}));
 const api=transport(async()=>new Response(new ReadableStream({start(controller){for(let i=0;i<data.length;i++)controller.enqueue(data.subarray(i,i+1));controller.close();}}),{headers:{'content-type':'text/event-stream'}}));
 const deltas=[];const result=await api.streamChat({config,messages:[],onDelta:delta=>deltas.push(delta)});
 assert.equal(result.text,'最后一段回答');assert.equal(deltas.join(''),'最后一段回答');
});
test('DONE cancels an open response instead of leaking the reader and connection',async()=>{
 let cancelled=false;
 const api=transport(async()=>new Response(new ReadableStream({start(controller){controller.enqueue(Buffer.from('data: {"choices":[{"delta":{"content":"Answer"}}]}\n\ndata: [DONE]\n\n'));},cancel(){cancelled=true;}}),{headers:{'content-type':'text/event-stream'}}));
 assert.equal((await api.streamChat({config,messages:[]})).text,'Answer');assert.equal(cancelled,true);
});
test('network and HTTP failures detach abort listeners',async()=>{
 for(const fetch of [async()=>{throw Error('offline');},async()=>new Response('{"error":{"message":"unauthorized"}}',{status:401})]){
  let added=0,removed=0;
  const signal={aborted:false,addEventListener(){added++;},removeEventListener(){removed++;}};
  await assert.rejects(transport(fetch).streamChat({config,messages:[],signal}));
  assert.equal(added,1);assert.equal(removed,1);
 }
});
