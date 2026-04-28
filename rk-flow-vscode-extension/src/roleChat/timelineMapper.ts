import type { AgentEvent, AgentRole } from "../agentAdapters/types";
import { createId } from "../common/id";
import type { SpecBinding } from "../specs/types";
import { extractTeamMessageRequests, stripTeamMessageBlocks } from "../teamBus/protocol";
import { normalizeWhitespace, shortJson, truncateOutput } from "./sanitize";
import type {
  AssistantMessageItem,
  ErrorItem,
  RoleTimelineItem,
  SystemStatusItem,
  TeamBusItem,
  ToolCallItem,
  ToolResultItem
} from "./timelineTypes";

export interface MapAgentEventInput {
  spec: SpecBinding;
  role: AgentRole;
  turnId: string;
  sessionId: string;
  event: AgentEvent;
}

export function mapAgentEventToTimelineItems(input: MapAgentEventInput): RoleTimelineItem[] {
  const { event } = input;
  const payload = event.payload;

  if (isClaudeResult(payload)) {
    return [];
  }

  const items: RoleTimelineItem[] = [];
  items.push(...mapSystemStatus(input));
  items.push(...mapToolContent(input));

  if (event.type === "permission_request") {
    items.push(systemStatus(input, "waiting", "Permission required."));
  }

  if (event.type === "error") {
    items.push(errorItem(input, "error", readablePayload(payload)));
  }

  const text = extractText(payload);
  if (text) {
    const teamItems = mapTeamBusItems(input, text);
    const visibleText = stripTeamMessageBlocks(text);
    if (visibleText) {
      items.push(assistantMessage(input, visibleText));
    }
    items.push(...teamItems);
  }

  if (!items.length && event.type !== "done") {
    items.push(systemStatus(input, "info", `Received ${event.type} event.`));
  }

  return items;
}

export function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
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
    return content
      .map(item => extractText(item))
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function mapSystemStatus(input: MapAgentEventInput): SystemStatusItem[] {
  const raw = payloadRecord(input.event.payload);
  if (!raw) {
    return [];
  }

  const rawType = stringValue(raw.type) ?? stringValue(raw.event);
  const subtype = stringValue(raw.subtype) ?? stringValue(raw.sub_type);

  if (rawType === "system" && subtype === "api_retry") {
    return [systemStatus(input, "retrying", "Claude Code API retrying.")];
  }

  if (rawType === "system" && subtype === "init") {
    const sessionId = stringValue(raw.session_id) ?? input.sessionId;
    const model = stringValue(raw.model);
    const message = model ? `Claude Code session initialized (${model}).` : "Claude Code session initialized.";
    return [{
      ...base(input),
      type: "system_status",
      source: "system",
      status: sessionId === input.sessionId ? "started" : "resumed",
      message,
      sessionId
    }];
  }

  if (input.event.type === "done") {
    return [systemStatus(input, "completed", "Agent run completed.")];
  }

  return [];
}

function mapToolContent(input: MapAgentEventInput): Array<ToolCallItem | ToolResultItem> {
  const payload = payloadRecord(input.event.payload);
  const content = extractContentItems(payload);
  const items: Array<ToolCallItem | ToolResultItem> = [];

  for (const item of content) {
    const type = stringValue(item.type);
    if (type === "tool_use") {
      items.push(toolCall(input, item));
    } else if (type === "tool_result") {
      items.push(toolResult(input, item));
    }
  }

  if (!items.length && input.event.type === "tool_call") {
    items.push(toolCall(input, payload ?? { type: "tool_use", input: input.event.payload }));
  }

  if (!items.length && input.event.type === "tool_result") {
    items.push(toolResult(input, payload ?? { type: "tool_result", content: input.event.payload }));
  }

  return items;
}

function mapTeamBusItems(input: MapAgentEventInput, text: string): TeamBusItem[] {
  return extractTeamMessageRequests(text).map(request => ({
    ...base(input),
    id: createId("timeline"),
    type: "team_bus",
    source: "team_bus",
    to: request.to,
    messageType: request.type,
    subject: request.subject,
    body: request.body,
    artifacts: request.artifacts,
    requiresResponse: request.requiresResponse
  }));
}

function assistantMessage(input: MapAgentEventInput, body: string): AssistantMessageItem {
  return {
    ...base(input),
    type: "assistant_message",
    source: "agent",
    body,
    format: "markdown",
    final: false
  };
}

function toolCall(input: MapAgentEventInput, item: Record<string, unknown>): ToolCallItem {
  const toolName = stringValue(item.name) ?? stringValue(item.tool_name) ?? "tool";
  const rawInput = item.input ?? item.parameters ?? item;
  return {
    ...base(input),
    type: "tool_call",
    source: "agent",
    toolName,
    title: `Tool call: ${toolName}`,
    inputSummary: summarizeToolInput(toolName, rawInput),
    rawInput,
    collapsed: true
  };
}

function toolResult(input: MapAgentEventInput, item: Record<string, unknown>): ToolResultItem {
  const toolName = stringValue(item.name) ?? stringValue(item.tool_name) ?? "tool";
  const rawOutput = item.content ?? item.output ?? item.result ?? item;
  const output = readablePayload(rawOutput);
  const preview = truncateOutput(output);
  const failed = item.is_error === true || item.error === true || input.event.type === "error";

  return {
    ...base(input),
    type: "tool_result",
    source: "agent",
    toolName,
    title: `Tool result: ${toolName}`,
    status: failed ? "failed" : "success",
    outputSummary: summarizeToolOutput(output),
    outputPreview: preview.text,
    rawOutput,
    exitCode: typeof item.exit_code === "number" ? item.exit_code : undefined,
    collapsed: true
  };
}

function systemStatus(
  input: MapAgentEventInput,
  status: SystemStatusItem["status"],
  message: string
): SystemStatusItem {
  return {
    ...base(input),
    type: "system_status",
    source: "system",
    status,
    message
  };
}

function errorItem(
  input: MapAgentEventInput,
  severity: ErrorItem["severity"],
  message: string
): ErrorItem {
  return {
    ...base(input),
    type: "error",
    source: "agent",
    severity,
    message: message || "Unknown agent error."
  };
}

function base(input: MapAgentEventInput) {
  return {
    id: createId("timeline"),
    specId: input.spec.id,
    role: input.role,
    turnId: input.turnId,
    sessionId: input.sessionId,
    timestamp: input.event.timestamp,
    rawEventId: input.event.id
  };
}

function payloadRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

function extractContentItems(payload: Record<string, unknown> | undefined): Array<Record<string, unknown>> {
  if (!payload) {
    return [];
  }

  const direct = payload.content;
  if (Array.isArray(direct)) {
    return direct.filter(isRecord);
  }

  const message = payload.message;
  if (isRecord(message) && Array.isArray(message.content)) {
    return message.content.filter(isRecord);
  }

  return [];
}

function summarizeToolInput(toolName: string, value: unknown): string {
  const record = payloadRecord(value);
  if (!record) {
    return shortJson(value);
  }

  const command = stringValue(record.command);
  if (toolName.toLowerCase() === "bash" && command) {
    return command;
  }

  const filePath = stringValue(record.file_path) ?? stringValue(record.path);
  if (filePath) {
    return filePath;
  }

  const pattern = stringValue(record.pattern);
  if (pattern) {
    return pattern;
  }

  return shortJson(record);
}

function summarizeToolOutput(value: string): string {
  const normalized = normalizeWhitespace(value);
  return normalized.length > 160 ? `${normalized.slice(0, 160)}...` : normalized || "No output.";
}

function readablePayload(value: unknown): string {
  const text = extractText(value);
  if (text) {
    return text;
  }

  return shortJson(value, 2000);
}

function isClaudeResult(value: unknown): boolean {
  const record = payloadRecord(value);
  return record?.type === "result";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
