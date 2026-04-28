export interface TruncatedText {
  text: string;
  truncated: boolean;
  omittedLines: number;
  omittedBytes: number;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char] ?? char));
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED]")
    .replace(/\b(?:ANTHROPIC_API_KEY|OPENAI_API_KEY)\s*=\s*[^\s]+/gi, match => {
      const [name] = match.split("=");
      return `${name.trim()}=[REDACTED]`;
    })
    .replace(/\b(?:token|password|secret)\s*[:=]\s*[^\s,;]+/gi, match => {
      const [name] = match.split(/[:=]/);
      return `${name.trim()}=[REDACTED]`;
    })
    .replace(/Authorization\s*:\s*Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Authorization: Bearer [REDACTED]")
    .replace(/Cookie\s*:\s*[^\r\n]+/gi, "Cookie: [REDACTED]");
}

export function truncateOutput(value: string, maxLines = 120, maxBytes = 12 * 1024): TruncatedText {
  const redacted = redactSensitiveText(value);
  const lines = redacted.split(/\r?\n/);
  const limitedLines = lines.slice(0, maxLines);
  let text = limitedLines.join("\n");
  let omittedLines = Math.max(0, lines.length - limitedLines.length);
  let omittedBytes = 0;

  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    let bytes = 0;
    let end = 0;
    for (const char of text) {
      const next = Buffer.byteLength(char, "utf8");
      if (bytes + next > maxBytes) {
        break;
      }
      bytes += next;
      end += char.length;
    }
    omittedBytes = Buffer.byteLength(text.slice(end), "utf8");
    text = text.slice(0, end);
  }

  const truncated = omittedLines > 0 || omittedBytes > 0;
  if (truncated) {
    const suffix = [
      "",
      `[truncated: ${omittedLines} line(s), ${omittedBytes} byte(s) omitted]`
    ].join("\n");
    text = `${text}${suffix}`;
  }

  return { text, truncated, omittedLines, omittedBytes };
}

export function shortJson(value: unknown, maxLength = 600): string {
  const json = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const redacted = redactSensitiveText(json ?? "");
  return redacted.length > maxLength ? `${redacted.slice(0, maxLength)}...` : redacted;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
