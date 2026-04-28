import type { AgentRole } from "../agentAdapters/types";
import type { TeamMessageType } from "./types";

export interface TeamMessageRequest {
  to: AgentRole | "all";
  type: TeamMessageType;
  subject: string;
  body: string;
  artifacts: string[];
  requiresResponse: boolean;
}

const roles: AgentRole[] = [
  "TeamLead",
  "spec-explorer",
  "spec-writer",
  "spec-tester",
  "spec-executor",
  "spec-debugger",
  "spec-ender"
];

const messageTypes: TeamMessageType[] = [
  "handoff",
  "question",
  "blocker",
  "review_request",
  "phase_request",
  "status"
];

export function extractTeamMessageRequests(text: string): TeamMessageRequest[] {
  const requests: TeamMessageRequest[] = [];

  for (const block of teamProtocolBlocks(text)) {
    const parsed = parseJson(block);
    if (!parsed) {
      continue;
    }

    for (const candidate of normalizeProtocolPayload(parsed)) {
      const request = toTeamMessageRequest(candidate);
      if (request) {
        requests.push(request);
      }
    }
  }

  return requests;
}

export function stripTeamMessageBlocks(text: string): string {
  return text
    .replace(/```(?:json|jsonc|rk-flow-team-message)?\s*\r?\n([\s\S]*?)```/gi, (full, body: string) => {
      return body.includes("rkFlowTeamMessage") ? "" : full;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function teamProtocolBlocks(text: string): string[] {
  return Array.from(text.matchAll(/```(?:json|jsonc|rk-flow-team-message)?\s*\r?\n([\s\S]*?)```/gi))
    .map(match => match[1])
    .filter(block => block.includes("rkFlowTeamMessage"));
}

function parseJson(block: string): unknown {
  try {
    return JSON.parse(block.trim());
  } catch {
    return undefined;
  }
}

function normalizeProtocolPayload(parsed: unknown): unknown[] {
  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  const record = parsed as Record<string, unknown>;
  const single = record.rkFlowTeamMessage;
  const multiple = record.rkFlowTeamMessages;

  if (Array.isArray(multiple)) {
    return multiple;
  }

  return single ? [single] : [];
}

function toTeamMessageRequest(value: unknown): TeamMessageRequest | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const to = normalizeRecipient(record.to);
  const type = normalizeMessageType(record.type);
  const subject = stringValue(record.subject);
  const body = stringValue(record.body);

  if (!to || !type || !subject || !body) {
    return undefined;
  }

  return {
    to,
    type,
    subject,
    body,
    artifacts: Array.isArray(record.artifacts) ? record.artifacts.filter((item): item is string => typeof item === "string") : [],
    requiresResponse: record.requiresResponse === true
  };
}

function normalizeRecipient(value: unknown): AgentRole | "all" | undefined {
  if (value === "all") {
    return "all";
  }

  return typeof value === "string" && roles.includes(value as AgentRole) ? value as AgentRole : undefined;
}

function normalizeMessageType(value: unknown): TeamMessageType | undefined {
  return typeof value === "string" && messageTypes.includes(value as TeamMessageType) ? value as TeamMessageType : undefined;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}
