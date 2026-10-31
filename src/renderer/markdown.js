'use strict';

(function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inline(raw) {
    let text = escapeHtml(raw);
    const codes = [];
    text = text.replace(/`([^`\n]+)`/g, (_match, code) => {
      codes.push(code);
      return `\u0000C${codes.length - 1}\u0000`;
    });
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
      return `<a data-url="${url}">${label}</a>`;
    });
    text = text.replace(/\[(\d{1,2})\]/g, '<span class="cite">[$1]</span>');
    text = text.replace(/\u0000C(\d+)\u0000/g, (_match, index) => `<code>${codes[Number(index)]}</code>`);
    return text;
  }

  function isTableSeparator(line) {
    const value = line.trim();
    if (!value.includes('|') || !value.includes('-')) return false;
    return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(value);
  }

  function splitTableRow(line) {
    let value = line.trim();
    if (value.startsWith('|')) value = value.slice(1);
    if (value.endsWith('|')) value = value.slice(0, -1);
    return value.split('|').map((cell) => cell.trim());
  }

  // Design page 10: the copy action always sits at the code block's top
  // right, next to the language label.
  function copyLabel() {
    return (typeof window !== 'undefined' && window.FloatAskI18n && window.FloatAskI18n.t)
      ? window.FloatAskI18n.t('result.copyCode')
      : '复制';
  }

  function codeBlock(lang, code) {
    const label = escapeHtml(String(lang || '').trim());
    const cls = label ? ` class="language-${label}"` : '';
    return `<div class="code-block"${label ? ` data-lang="${label}"` : ''}>` +
      `<div class="code-head"><span class="code-lang">${label}</span>` +
      `<button type="button" class="code-copy">${copyLabel()}</button></div>` +
      `<pre><code${cls}>${escapeHtml(code)}</code></pre></div>`;
  }

  function render(markdown) {
    let source = String(markdown || '').replace(/\r\n?/g, '\n');
    const fences = [];
    source = source.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
      fences.push({ lang: String(lang || '').trim(), code });
      return `\n\u0000F${fences.length - 1}\u0000\n`;
    });

    const lines = source.split('\n');
    const out = [];
    let i = 0;

    function flushParagraph(buffer) {
      if (!buffer.length) return;
      out.push(`<p>${buffer.map((line) => inline(line)).join('<br>')}</p>`);
      buffer.length = 0;
    }

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph([]);
        i++;
        continue;
      }

      const fenceRef = /^\u0000F(\d+)\u0000$/.exec(trimmed);
      if (fenceRef) {
        const fence = fences[Number(fenceRef[1])];
        out.push(codeBlock(fence.lang, fence.code.replace(/\n$/, '')));
        i++;
        continue;
      }

      if (/^```/.test(trimmed)) {
        const lang = trimmed.slice(3).trim();
        const code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) {
          code.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++;
        out.push(codeBlock(lang, code.join('\n')));
        continue;
      }

      const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);
      if (heading) {
        const level = heading[1].length;
        out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        i++;
        continue;
      }

      if (/^([-*_])\1{2,}$/.test(trimmed.replace(/\s+/g, ''))) {
        out.push('<hr>');
        i++;
        continue;
      }

      if (trimmed.startsWith('>')) {
        const quote = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quote.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        out.push(`<blockquote>${quote.map((item) => inline(item)).join('<br>')}</blockquote>`);
        continue;
      }

      if (/^[-*+]\s+/.test(trimmed)) {
        const items = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
          i++;
        }
        out.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
        continue;
      }

      if (/^\d+[.)]\s+/.test(trimmed)) {
        const items = [];
        while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
          i++;
        }
        out.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
        continue;
      }

      if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        const header = splitTableRow(trimmed);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim()) {
          rows.push(splitTableRow(lines[i]));
          i++;
        }
        const headHtml = header.map((cell) => `<th>${inline(cell)}</th>`).join('');
        const bodyHtml = rows.map((row) => {
          const cells = header.map((_unused, index) => `<td>${inline(row[index] || '')}</td>`).join('');
          return `<tr>${cells}</tr>`;
        }).join('');
        out.push(`<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`);
        continue;
      }

      // Paragraph: gather consecutive plain lines.
      const paragraph = [];
      while (i < lines.length) {
        const current = lines[i];
        const t = current.trim();
        if (!t) break;
        if (/^```/.test(t) || /^(#{1,4})\s+/.test(t) || /^[-*+]\s+/.test(t) || /^\d+[.)]\s+/.test(t) ||
            t.startsWith('>') || /^\u0000F\d+\u0000$/.test(t) || /^([-*_])\1{2,}$/.test(t.replace(/\s+/g, ''))) {
          break;
        }
        paragraph.push(current);
        i++;
      }
      if (!paragraph.length) {
        paragraph.push(lines[i]);
        i++;
      }
      out.push(`<p>${paragraph.map((item) => inline(item)).join('<br>')}</p>`);
    }

    return out.join('');
  }

  // One delegated listener covers every page that renders markdown (result
  // and history) without page-side wiring.
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (event) => {
      const button = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('.code-copy')
        : null;
      if (!button) return;
      const block = typeof button.closest === 'function' ? button.closest('.code-block') : null;
      const code = block && block.querySelector('pre code');
      if (!code || typeof window === 'undefined' || !window.floatask) return;
      event.preventDefault();
      Promise.resolve(window.floatask.copyText(code.textContent)).then(() => {
        const t = (window.FloatAskI18n && window.FloatAskI18n.t) ? window.FloatAskI18n.t('result.copiedCode') : '已复制';
        const original = button.textContent;
        button.textContent = t;
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = original;
          button.classList.remove('copied');
        }, 1200);
      }).catch(() => {});
    });
  }

  window.FloatAskMarkdown = { render, escapeHtml, codeBlock };
})();
