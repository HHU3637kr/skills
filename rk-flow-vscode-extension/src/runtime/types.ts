import type { AgentEngine, AgentRole } from "../agentAdapters/types";

export const runtimeVersion = 1;

export const runtimeAgentRoles: AgentRole[] = [
  "TeamLead",
  "spec-explorer",
  "spec-writer",
  "spec-executor",
  "spec-tester",
  "spec-debugger",
  "spec-ender"
];

export type SpecRuntimeLifecycle =
  | "created"
  | "initialized"
  | "active"
  | "paused"
  | "resumed"
  | "completing"
  | "archived";

export type RoleLifecycleState =
  | "active"
  | "paused"
  | "completing"
  | "archived";

export type RoleActivityState =
  | "idle"
  | "queued"
  | "running"
  | "waiting"
  | "blocked"
  | "failed";

export type BackendSessionState =
  | "none"
  | "resumable"
  | "running"
  | "expired"
  | "error";

export interface RoleRuntimeState {
  role: AgentRole;
  lifecycle: RoleLifecycleState;
  activity: RoleActivityState;
  backend: BackendSessionState;
  backendEngine: AgentEngine;
  sessionId?: string;
  mailboxCursor: number;
  mailboxBacklog: number;
  currentTaskId?: string;
  lastError?: string;
  updatedAt: string;
}

export interface SpecRuntimeDocument {
  version: number;
  specId: string;
  specDir: string;
  state: SpecRuntimeLifecycle;
  activeRole: AgentRole;
  roles: Record<AgentRole, RoleRuntimeState>;
  createdAt: string;
  updatedAt: string;
}

export interface RoleRuntimePatch {
  lifecycle?: RoleLifecycleState;
  activity?: RoleActivityState;
  backend?: BackendSessionState;
  backendEngine?: AgentEngine;
  sessionId?: string;
  mailboxCursor?: number;
  mailboxBacklog?: number;
  currentTaskId?: string;
  lastError?: string;
}
