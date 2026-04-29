import type { AgentEvent } from "./types";

export function readableEventText(event: AgentEvent): string {
  if (event.type === "done") {
    return "";
  }

  if (isClaudeCodeResultPayload(event.payload)) {
    return "";
  }

  const text = extractText(event.payload);
  if (text) {
    return text;
  }

  if (event.type === "error") {
    return typeof event.payload === "string" ? event.payload : JSON.stringify(event.payload);
  }

  return "";
}

function isClaudeCodeResultPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (value as { type?: unknown }).type === "result";
}

function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  const blockType = typeof record.type === "string" ? record.type : undefined;
  if (blockType === "tool_use" || blockType === "tool_result" || blockType === "thinking") {
    return "";
  }

  for (const key of ["text", "output_text", "result", "message", "content"]) {
    const candidate = record[key];
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  const message = record.message;
  if (message && typeof message === "object") {
    const nested = extractText(message);
    if (nested) {
      return nested;
    }
  }

  const content = record.content;
  if (Array.isArray(content)) {
    return content.map(item => extractText(item)).filter(Boolean).join("\n");
  }

  return "";
}

