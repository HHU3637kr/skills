import type { AgentRole } from "../agentAdapters/types";
import type { TeamMessageType } from "../teamBus/types";

export type RoleTimelineItemType =
  | "turn_start"
  | "user_message"
  | "assistant_message"
  | "plan"
  | "tool_call"
  | "tool_result"
  | "artifact"
  | "team_bus"
  | "system_status"
  | "error"
  | "turn_end";

export type RoleTimelineSource = "user" | "agent" | "system" | "team_bus";

export interface RoleTimelineItemBase {
  id: string;
  specId: string;
  role: AgentRole;
  turnId: string;
  sessionId?: string;
  type: RoleTimelineItemType;
  timestamp: string;
  source: RoleTimelineSource;
  rawEventId?: string;
}

export interface TurnStartItem extends RoleTimelineItemBase {
  type: "turn_start";
  source: "system" | "team_bus";
  title: string;
}

export interface UserMessageItem extends RoleTimelineItemBase {
  type: "user_message";
  source: "user" | "team_bus";
  body: string;
}

export interface AssistantMessageItem extends RoleTimelineItemBase {
  type: "assistant_message";
  source: "agent";
  body: string;
  format: "markdown";
  final: boolean;
}

export interface PlanItem extends RoleTimelineItemBase {
  type: "plan";
  source: "agent";
  title: string;
  steps: Array<{
    id: string;
    text: string;
    status: "pending" | "running" | "completed" | "failed" | "skipped";
  }>;
}

export interface ToolCallItem extends RoleTimelineItemBase {
  type: "tool_call";
  source: "agent";
  toolUseId?: string;
  toolName: string;
  title: string;
  inputSummary: string;
  rawInput?: unknown;
  collapsed: boolean;
}

export interface ToolResultItem extends RoleTimelineItemBase {
  type: "tool_result";
  source: "agent";
  toolUseId?: string;
  toolName: string;
  title: string;
  status: "success" | "failed" | "canceled";
  outputSummary: string;
  outputPreview?: string;
  rawOutput?: unknown;
  exitCode?: number;
  durationMs?: number;
  collapsed: boolean;
}

export interface ArtifactItem extends RoleTimelineItemBase {
  type: "artifact";
  source: "agent" | "system";
  artifactType: "file" | "diff" | "log" | "test" | "package" | "link";
  title: string;
  path?: string;
  summary?: string;
}

export interface TeamBusItem extends RoleTimelineItemBase {
  type: "team_bus";
  source: "team_bus";
  to: AgentRole | "all";
  messageType: TeamMessageType;
  subject: string;
  body: string;
  artifacts: string[];
  requiresResponse: boolean;
}

export interface SystemStatusItem extends RoleTimelineItemBase {
  type: "system_status";
  source: "system";
  status: "started" | "resumed" | "retrying" | "completed" | "waiting" | "info";
  message: string;
}

export interface ErrorItem extends RoleTimelineItemBase {
  type: "error";
  source: "system" | "agent";
  severity: "warning" | "error";
  message: string;
  detail?: string;
}

export interface TurnEndItem extends RoleTimelineItemBase {
  type: "turn_end";
  source: "system";
  status: "completed" | "failed";
}

export type RoleTimelineItem =
  | TurnStartItem
  | UserMessageItem
  | AssistantMessageItem
  | PlanItem
  | ToolCallItem
  | ToolResultItem
  | ArtifactItem
  | TeamBusItem
  | SystemStatusItem
  | ErrorItem
  | TurnEndItem;

export interface PrivateRoleChatMessage {
  id: string;
  specId: string;
  from: AgentRole | "user";
  to: AgentRole | "user";
  direction: "user_to_agent" | "agent_to_user";
  body: string;
  model: string;
  artifacts: string[];
  isError: boolean;
  timestamp: string;
}
