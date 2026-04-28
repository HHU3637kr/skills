import { escapeHtml } from "./sanitize";

export function renderSafeMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    html.push(`<p>${paragraph.map(renderInline).join("<br>")}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) {
      return;
    }
    html.push(`<ul>${list.map(item => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  const flushCode = () => {
    const label = codeLang ? `<div class="codeLabel">${escapeHtml(codeLang)}</div>` : "";
    html.push(`<div class="codeBlock">${label}<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre></div>`);
    codeLines = [];
    codeLang = "";
  };

  for (const line of lines) {
    const fence = /^```([A-Za-z0-9_-]+)?\s*$/.exec(line);
    if (fence) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
        codeLang = fence[1] ?? "";
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const listMatch = /^\s*(?:[-*+]|\d+\.)\s+(.+)$/.exec(line);
    if (listMatch) {
      flushParagraph();
      list.push(listMatch[1]);
      continue;
    }

    const quoteMatch = /^\s*>\s?(.+)$/.exec(line);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${renderInline(quoteMatch[1])}</blockquote>`);
      continue;
    }

    if (/^\s*\|.+\|\s*$/.test(line)) {
      flushParagraph();
      flushList();
      html.push(`<pre class="tableText">${escapeHtml(line)}</pre>`);
      continue;
    }

    paragraph.push(line);
  }

  if (inCode) {
    flushCode();
  }
  flushParagraph();
  flushList();

  return html.join("");
}

function renderInline(value: string): string {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
