'use strict';

const { t } = require('./i18n');

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
  if (!base) throw new AIError(t('ai.noBaseUrl'), { code: 'config', hint: t('ai.noBaseUrlHint') });
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

  let message = t('ai.fallback');
  let hint = '';
  let code = 'http';
  if (status === 401 || status === 403) {
    message = t('ai.auth');
    hint = t('ai.authHint');
    code = 'auth';
  } else if (status === 404) {
    message = t('ai.notFound');
    hint = t('ai.notFoundHint');
    code = 'not_found';
  } else if (status === 429) {
    message = t('ai.rateLimit');
    hint = t('ai.rateLimitHint');
    code = 'rate_limit';
  } else if (status === 400) {
    message = t('ai.badRequest');
    hint = t('ai.badRequestHint');
    code = 'bad_request';
  } else if (status >= 500) {
    message = t('ai.server');
    hint = t('ai.serverHint');
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
          { type: 'text', text: m.content || t('ai.imageFallbackText') },
          { type: 'image_url', image_url: { url: m.image, detail: 'low' } }
        ]
      };
    }
    return { role: m.role, content: m.content };
  });
}

async function readError(res) {
  const text = await res.text().catch(() => '');
  const err = normalizeError(res.status, text);
  return err;
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
    signal?.removeEventListener('abort', forwardAbort);
    if (signal?.aborted) throw new AIError(t('ai.aborted'), { code: 'aborted' });
    if (err.name === 'AbortError') throw new AIError(t('ai.timeout'), { code: 'timeout', hint: t('ai.timeoutHint') });
    throw new AIError(t('ai.network'), {
      code: 'network',
      detail: err.cause?.code || err.message,
      hint: t('ai.networkHint')
    });
  }

  if (!res.ok) {
    try { throw await readError(res); }
    finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', forwardAbort);
    }
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

      function consumeLine(rawLine) {
        const line = rawLine.replace(/\r$/, '').trim();
        if (!line || line.startsWith(':') || !line.startsWith('data:')) return;
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          finished = true;
          return;
        }
        let json;
        try { json = JSON.parse(data); }
        catch { return; } // Ignore keep-alive or malformed chunks.
        if (json.usage) usage = json.usage;
        const choice = json.choices?.[0];
        const delta = choice?.delta?.content ?? choice?.text ?? '';
        if (typeof delta === 'string' && delta) {
          full += delta;
          onDelta?.(delta);
        }
        const reasoning = choice?.delta?.reasoning_content;
        if (typeof reasoning === 'string' && reasoning && onReasoning) onReasoning(reasoning);
      }
      try {
        while (!finished) {
          const { value, done } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            if (buffer.trim()) consumeLine(buffer);
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          let newline;
          while (!finished && (newline = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newline);
            buffer = buffer.slice(newline + 1);
            consumeLine(line);
          }
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
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
    if (signal?.aborted) throw new AIError(t('ai.aborted'), { code: 'aborted' });
    if (err.name === 'AbortError') throw new AIError(t('ai.timeout'), { code: 'timeout' });
    throw new AIError(t('ai.stream'), {
      code: 'stream',
      detail: err.message,
      hint: t('ai.streamHint')
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', forwardAbort);
  }

  if (!full.trim()) {
    throw new AIError(t('ai.empty'), {
      code: 'empty',
      hint: t('ai.emptyHint')
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
        messages: [{ role: 'user', content: t('ai.testMessage') }],
        stream: false,
        max_tokens: 8,
        temperature: 0
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new AIError(t('ai.testTimeout'), { code: 'timeout', hint: t('ai.testTimeoutHint') });
    }
    throw new AIError(t('ai.network'), {
      code: 'network',
      detail: err.cause?.code || err.message,
      hint: t('ai.networkHint')
    });
  }
  if (!res.ok) throw await readError(res);
  let json;
  try {
    json = await res.json();
  } catch {
    throw new AIError(t('ai.badJson'), {
      code: 'format',
      hint: t('ai.badJsonHint')
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
