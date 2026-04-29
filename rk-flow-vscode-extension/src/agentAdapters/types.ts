export type AgentEngine = "claude-code" | "external-cli";

export type AgentRole =
  | "TeamLead"
  | "spec-explorer"
  | "spec-writer"
  | "spec-tester"
  | "spec-executor"
  | "spec-debugger"
  | "spec-ender";

export interface AgentSession {
  id: string;
  role: AgentRole;
  engine: AgentEngine;
  model: string;
  workspaceUri: string;
  specDir: string;
  gitBranch: string;
  createdAt: string;
  updatedAt: string;
}
export type AgentEventType =
  | "message"
  | "tool_call"
  | "tool_result"
  | "permission_request"
  | "error"
  | "done";

export interface AgentEvent {
  id: string;
  sessionId: string;
  role: AgentRole;
  type: AgentEventType;
  timestamp: string;
  payload: unknown;
  raw?: unknown;
}

export interface AgentAdapter {
  readonly engine: AgentEngine;
  detect(): Promise<boolean>;
  start(session: AgentSession, prompt: string): AsyncIterable<AgentEvent>;
  resume(session: AgentSession, prompt: string): AsyncIterable<AgentEvent>;
  stop(session: AgentSession): Promise<void>;
}

export interface BackendStatus {
  engine: AgentEngine;
  available: boolean;
  detail?: string;
}

export interface BackendSession {
  engine: AgentEngine;
  sessionId: string;
  model: string;
  status: "none" | "resumable" | "running" | "expired" | "error";
}

export interface BackendInvokeRequest {
  session: AgentSession;
  prompt: string;
  resumed: boolean;
  turnId: string;
}

export interface AgentBackend extends AgentAdapter {
  detectStatus(): Promise<BackendStatus>;
  loadSession(session: AgentSession): Promise<BackendSession>;
  invoke(request: BackendInvokeRequest): AsyncIterable<AgentEvent>;
  cancel(turnId: string): Promise<void>;
}
