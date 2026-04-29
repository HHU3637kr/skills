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

export type TeamDeliveryStatus =
  | "pending"
  | "delivered"
  | "seen"
  | "handled"
  | "failed";

export interface TeamDeliveryState {
  messageId: string;
  recipient: AgentRole;
  state: TeamDeliveryStatus;
  requiresResponse: boolean;
  responseMessageId?: string;
  updatedAt: string;
}

export interface TeamMailboxEntry {
  id: string;
  messageId: string;
  recipient: AgentRole;
  state: TeamDeliveryStatus;
  requiresResponse: boolean;
  timestamp: string;
  message: TeamMessage;
}

export interface TeamBus {
  sendMessage(message: Omit<TeamMessage, "id" | "timestamp">): Promise<TeamMessage>;
  readMessages(specId: string, role: AgentRole, since?: string): Promise<TeamMessage[]>;
  readDeliveryStates(specId: string): Promise<TeamDeliveryState[]>;
  readMailbox(specId: string, role: AgentRole): Promise<TeamMailboxEntry[]>;
  markSeen(specId: string, messageId: string, recipient: AgentRole): Promise<void>;
  markHandled(specId: string, messageId: string, recipient: AgentRole, responseMessageId?: string): Promise<void>;
  requestPhaseChange(input: {
    specId: string;
    from: AgentRole;
    targetPhase: string;
    reason: string;
  }): Promise<TeamMessage>;
}
