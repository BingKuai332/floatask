'use strict';

class AIError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AIError';
    this.code = options.code || 'ai_error';
    this.status = options.status || 0;
    this.detail = options.detail || '';
    this.hint = options.hint || '';
  }
}

function endpoint(baseUrl) {
  let base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) throw new AIError('还没有填写 API 地址', { code: 'config', hint: '打开设置填写接口地址' });
  if (!/\/chat\/completions$/i.test(base)) base += '/chat/completions';
  return base;
}

function headers(config) {
  const h = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream'
  };
  if (config.apiKey) h.Authorization = `Bearer ${config.apiKey}`;
  if (config.provider === 'openrouter') {
    h['HTTP-Referer'] = 'https://floatask.local';
    h['X-Title'] = 'FloatAsk';
  }
  return h;
}

function normalizeError(status, raw) {
  let detail = String(raw || '').slice(0, 1200);
  try {
    const json = JSON.parse(raw);
    detail = json.error?.message || json.message || json.error || detail;
    if (typeof detail !== 'string') detail = JSON.stringify(detail);
  } catch { /* plain-text error */ }

  let message = '模型请求失败';
  let hint = '';
  let code = 'http';
  if (status === 401 || status === 403) {
    message = 'API Key 无效或没有权限';
    hint = '到设置里检查 Key，注意不要多复制空格。';
    code = 'auth';
  } else if (status === 404) {
    message = '接口地址或模型名不存在';
    hint = '检查 Base URL 是否以 /v1 结尾，以及模型名称是否正确。';
    code = 'not_found';
  } else if (status === 429) {
    message = '请求太频繁，或账户额度不足';
    hint = '稍等几秒重试，或到服务商控制台检查余额。';
    code = 'rate_limit';
  } else if (status === 400) {
    message = '请求参数不被模型接受';
    hint = '可能是模型不支持图片或参数；已尝试自动降级。';
    code = 'bad_request';
  } else if (status >= 500) {
    message = '模型服务暂时不可用';
    hint = '稍后重试，或换一个模型服务。';
    code = 'server';
  }
  return new AIError(message, { code, status, detail: detail || raw, hint });
}

function toApiMessages(messages) {
  return messages.map((m) => {
    if (m.image && m.role === 'user') {
      return {
        role: 'user',
        content: [
          { type: 'text', text: m.content || '请理解这张截图。' },
          { type: 'image_url', image_url: { url: m.image, detail: 'low' } }
        ]
      };
    }
    return { role: m.role, content: m.content };
  });
}

async function readError(res) {
  const text = await res.text().catch(() => '');
  return normalizeError(res.status, text);
}

/**
 * Stream a chat completion over SSE.
 * Returns { text, usage }.
 */
async function streamChat({ config, messages, signal, onDelta, onReasoning }) {
  const url = endpoint(config.baseUrl);
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', forwardAbort, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), 180000);

  const body = {
    model: config.model,
    messages: toApiMessages(messages),
    stream: true,
    temperature: Number.isFinite(config.temperature) ? config.temperature : 0.4,
    max_tokens: config.maxTokens || 1200
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: headers(config),
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeout);
    if (signal?.aborted) throw new AIError('已停止', { code: 'aborted' });
    if (err.name === 'AbortError') throw new AIError('请求超时', { code: 'timeout', hint: '网络较慢或服务无响应，稍后重试。' });
    throw new AIError('无法连接模型服务', {
      code: 'network',
      detail: err.cause?.code || err.message,
      hint: '检查网络、Base URL，或代理/防火墙设置。'
    });
  }

  if (!res.ok) {
    clearTimeout(timeout);
    throw await readError(res);
  }

  const contentType = res.headers.get('content-type') || '';
  let full = '';
  let usage = null;

  try {
    if (contentType.includes('text/event-stream') && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;

      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).replace(/\r$/, '').trim();
          buffer = buffer.slice(newline + 1);
          if (!line || line.startsWith(':') || !line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            finished = true;
            break;
          }
          try {
            const json = JSON.parse(data);
            if (json.usage) usage = json.usage;
            const choice = json.choices?.[0];
            const delta = choice?.delta?.content ?? choice?.text ?? '';
            if (typeof delta === 'string' && delta) {
              full += delta;
              onDelta?.(delta);
            }
            const reasoning = choice?.delta?.reasoning_content;
            if (typeof reasoning === 'string' && reasoning && onReasoning) onReasoning(reasoning);
          } catch {
            // Ignore keep-alive or malformed chunks.
          }
        }
      }
    } else {
      const json = await res.json();
      const choice = json.choices?.[0];
      const content = choice?.message?.content ?? choice?.text ?? '';
      full = typeof content === 'string' ? content : JSON.stringify(content);
      if (full) onDelta?.(full);
      usage = json.usage || null;
    }
  } catch (err) {
    if (signal?.aborted) throw new AIError('已停止', { code: 'aborted' });
    if (err.name === 'AbortError') throw new AIError('请求超时', { code: 'timeout' });
    throw new AIError('读取模型响应失败', {
      code: 'stream',
      detail: err.message,
      hint: '连接可能中断了，请重试。'
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', forwardAbort);
  }

  if (!full.trim()) {
    throw new AIError('模型没有返回内容', {
      code: 'empty',
      hint: '可能是模型名不对，或服务商返回了空响应。'
    });
  }
  return { text: full, usage };
}

async function testConnection(config) {
  const started = Date.now();
  let res;
  try {
    res = await fetch(endpoint(config.baseUrl), {
      method: 'POST',
      headers: headers(config),
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: '只回复：OK' }],
        stream: false,
        max_tokens: 8,
        temperature: 0
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new AIError('连接超时', { code: 'timeout', hint: '30 秒内没有响应，检查网络或 Base URL。' });
    }
    throw new AIError('无法连接模型服务', {
      code: 'network',
      detail: err.cause?.code || err.message,
      hint: '检查 Base URL、网络和代理设置。'
    });
  }
  if (!res.ok) throw await readError(res);
  let json;
  try {
    json = await res.json();
  } catch {
    throw new AIError('接口返回的不是标准 JSON', {
      code: 'format',
      hint: '确认该地址是 OpenAI 兼容接口（/v1/chat/completions）。'
    });
  }
  const reply = json.choices?.[0]?.message?.content ?? '';
  return {
    ok: true,
    latencyMs: Date.now() - started,
    model: json.model || config.model,
    reply: typeof reply === 'string' ? reply.slice(0, 120) : ''
  };
}

module.exports = { AIError, streamChat, testConnection, endpoint };
