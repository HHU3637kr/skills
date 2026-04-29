import type { AgentRole } from "../agentAdapters/types";
import type { TeamMessageType } from "../teamBus/types";

export const agentRoles: AgentRole[] = [
  "TeamLead",
  "spec-explorer",
  "spec-writer",
  "spec-executor",
  "spec-tester",
  "spec-debugger",
  "spec-ender"
];

export function isAgentRole(value: unknown): value is AgentRole {
  return typeof value === "string" && agentRoles.includes(value as AgentRole);
}

export function isTeamMessageType(value: unknown): value is TeamMessageType {
  return typeof value === "string" && ["handoff", "question", "blocker", "review_request", "phase_request", "status"].includes(value);
}
