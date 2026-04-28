import * as fs from "fs/promises";
import * as path from "path";
import type { AgentRole } from "../agentAdapters/types";
import { appendJsonLine } from "../audit/jsonlStore";
import { createId } from "../common/id";
import type { SpecBinding } from "../specs/types";
import type {
  ErrorItem,
  PrivateRoleChatMessage,
  RoleTimelineItem
} from "./timelineTypes";

const timelineFileName = "agent-timeline.jsonl";
const privateChatFileName = "agent-chat.jsonl";

export async function appendTimelineItem(spec: SpecBinding, item: RoleTimelineItem): Promise<RoleTimelineItem> {
  await appendJsonLine(timelinePath(spec), item);
  return item;
}

export async function appendTimelineItems(spec: SpecBinding, items: RoleTimelineItem[]): Promise<RoleTimelineItem[]> {
  for (const item of items) {
    await appendTimelineItem(spec, item);
  }
  return items;
}

export async function readTimelineItems(spec: SpecBinding): Promise<RoleTimelineItem[]> {
  return readJsonLinesLenient<RoleTimelineItem>(timelinePath(spec));
}

export async function readTimelineForRole(spec: SpecBinding, role: AgentRole): Promise<RoleTimelineItem[]> {
  const items = await readTimelineItems(spec);
  if (items.length) {
    return items.filter(item => item.role === role);
  }

  const privateMessages = await readPrivateRoleChatMessages(spec);
  return convertPrivateMessagesToTimeline(privateMessages).filter(item => item.role === role);
}

export async function readPrivateRoleChatMessages(spec: SpecBinding): Promise<PrivateRoleChatMessage[]> {
  return readJsonLinesLenient<PrivateRoleChatMessage>(path.join(spec.specDirFsPath, privateChatFileName));
}

export function convertPrivateMessagesToTimeline(messages: PrivateRoleChatMessage[]): RoleTimelineItem[] {
  const items: RoleTimelineItem[] = [];
  const lastTurnByRole = new Map<AgentRole, string>();

  for (const message of messages) {
    const role = roleFromPrivateMessage(message);
    if (!role) {
      continue;
    }

    if (message.direction === "user_to_agent") {
      const turnId = createId("turn");
      lastTurnByRole.set(role, turnId);
      items.push({
        id: `${message.id}-timeline`,
        specId: message.specId,
        role,
        turnId,
        type: "user_message",
        timestamp: message.timestamp,
        source: "user",
        body: message.body
      });
      continue;
    }

    const turnId = lastTurnByRole.get(role) ?? createId("turn");
    if (message.isError) {
      const errorItem: ErrorItem = {
        id: `${message.id}-timeline`,
        specId: message.specId,
        role,
        turnId,
        type: "error",
        timestamp: message.timestamp,
        source: "agent",
        severity: "error",
        message: message.body
      };
      items.push(errorItem);
      continue;
    }

    items.push({
      id: `${message.id}-timeline`,
      specId: message.specId,
      role,
      turnId,
      type: "assistant_message",
      timestamp: message.timestamp,
      source: "agent",
      body: message.body,
      format: "markdown",
      final: true
    });
  }

  return items;
}

export function timelinePath(spec: SpecBinding): string {
  return path.join(spec.specDirFsPath, timelineFileName);
}

async function readJsonLinesLenient<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const values: T[] = [];
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }
      try {
        values.push(JSON.parse(line) as T);
      } catch {
        // Keep UI recoverable if one JSONL line is damaged.
      }
    }
    return values;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function roleFromPrivateMessage(message: PrivateRoleChatMessage): AgentRole | undefined {
  const role = message.direction === "user_to_agent" ? message.to : message.from;
  return isAgentRole(role) ? role : undefined;
}

function isAgentRole(value: unknown): value is AgentRole {
  return typeof value === "string" && [
    "TeamLead",
    "spec-explorer",
    "spec-writer",
    "spec-tester",
    "spec-executor",
    "spec-debugger",
    "spec-ender"
  ].includes(value);
}
