import type { AgentRole } from "../agentAdapters/types";

export type TeamMessageType =
  | "handoff"
  | "question"
  | "blocker"
  | "review_request"
  | "phase_request"
  | "status";

export interface TeamMessage {
  id: string;
  specId: string;
  from: AgentRole;
  to: AgentRole | "all";
  type: TeamMessageType;
  subject: string;
  body: string;
  artifacts: string[];
  requiresResponse: boolean;
  timestamp: string;
}
export interface TeamBus {
  sendMessage(message: Omit<TeamMessage, "id" | "timestamp">): Promise<TeamMessage>;
  readMessages(specId: string, role: AgentRole, since?: string): Promise<TeamMessage[]>;
  requestPhaseChange(input: {
    specId: string;
    from: AgentRole;
    targetPhase: string;
    reason: string;
  }): Promise<TeamMessage>;
}
