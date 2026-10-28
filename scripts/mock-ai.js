'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.MOCK_AI_PORT || 8787);
const LOG = path.join(__dirname, '..', '..', 'mock-last-request.json');

const DEFAULT_ANSWER = [
  '**是什么**：Transformer 是一种基于自注意力机制的神经网络架构，用来处理文本、代码等序列数据 [1]。',
  '',
  '**有什么用**',
  '- 它能同时关注一句话里不同位置的信息，不必像 RNN 那样逐步传递。',
  '- 训练可以高度并行，因此能利用大规模语料做出通用语言模型。',
  '- 现代大模型（包括你正在用的这类助手）大多建立在 Transformer 之上。',
  '',
  '**和这里的关系**：如果这段文字出现在技术文章里，作者通常是在解释大模型的地基；如果出现在代码旁，它多半是在说明某个注意力层的实现。',
  '',
  '**一句话记住**：它让模型学会“看整句话，再决定每个词该关注谁”。'
].join('\n');

function answerFor(body) {
  const messages = body.messages || [];
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const text = typeof lastUser?.content === 'string'
    ? lastUser.content
    : Array.isArray(lastUser?.content)
      ? lastUser.content.map((c) => c.text || '').join(' ')
      : '';
  if (/更通俗/.test(text)) {
    return '**打个比方**：把一句话想成一群人开会。Transformer 让每个人都能直接听到所有人的发言，再决定自己该重点听谁，而不是只能听前一个人转述。\n\n所以它特别适合理解长句子里前后呼应的关系。';
  }
  if (/例子/.test(text)) {
    return '**例子**：句子“小猫追着球跑，因为它很兴奋”里，“它”指谁？Transformer 的注意力会让“它”同时看“小猫”和“球”，再结合“兴奋”判断更可能指小猫。\n\n这就是“自注意力”在上下文里分配权重的过程。';
  }
  return DEFAULT_ANSWER;
}

function sseChunk(content) {
  return `data: ${JSON.stringify({
    id: 'chatcmpl-mock',
    object: 'chat.completion.chunk',
    model: 'mock-model',
    choices: [{ index: 0, delta: { content }, finish_reason: null }]
  })}\n\n`;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || !req.url.includes('/chat/completions')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'not found' } }));
    return;
  }

  console.log('REQ', req.method, req.url, req.headers['content-length'], req.headers['transfer-encoding']);
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    console.log('END body bytes', raw.length);
    let body = {};
    try { body = JSON.parse(raw); } catch { /* ignore */ }
    fs.writeFileSync(LOG, JSON.stringify(body, null, 2), 'utf8');
    const answer = answerFor(body);
    console.log('ANSWER chars', answer.length, 'stream', body.stream);

    if (body.stream === false) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'chatcmpl-mock',
        model: 'mock-model',
        choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
      }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.flushHeaders();
    res.on('error', (err) => console.log('RES ERROR', err.message));
    const pieces = answer.match(/[\s\S]{1,18}/g) || [answer];
    console.log('PIECES', pieces.length);
    for (const piece of pieces) res.write(sseChunk(piece));
    res.write('data: [DONE]\n\n');
    res.end();
    console.log('DONE send');
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock AI listening on http://127.0.0.1:${PORT}/v1`);
});
