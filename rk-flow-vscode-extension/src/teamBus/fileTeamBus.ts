import * as fs from "fs/promises";
import * as path from "path";
import { appendJsonLine, readJsonLines } from "../audit/jsonlStore";
import { createId, nowIso } from "../common/id";
import type { AgentRole } from "../agentAdapters/types";
import { RuntimeStore } from "../runtime/runtimeStore";
import { runtimeAgentRoles } from "../runtime/types";
import type { TeamBus, TeamDeliveryState, TeamMailboxEntry, TeamMessage } from "./types";

export class FileTeamBus implements TeamBus {
  constructor(
    private readonly resolveSpecDir: (specId: string) => Promise<string | undefined>,
    private readonly runtimeStore?: RuntimeStore
  ) {}

  async sendMessage(message: Omit<TeamMessage, "id" | "timestamp">): Promise<TeamMessage> {
    const specDir = await this.getSpecDir(message.specId);
    const teamMessage: TeamMessage = {
      ...message,
      id: createId("team"),
      timestamp: nowIso()
    };

    await appendJsonLine(path.join(specDir, "team-chat.jsonl"), teamMessage);
    const deliveryStates = await this.deliverToMailboxes(specDir, teamMessage);
    await appendJsonLine(path.join(specDir, "audit-log.jsonl"), {
      id: createId("audit"),
      timestamp: nowIso(),
      type: "team_message",
      messageId: teamMessage.id,
      from: teamMessage.from,
      to: teamMessage.to,
      messageType: teamMessage.type,
      subject: teamMessage.subject,
      artifacts: teamMessage.artifacts,
      requiresResponse: teamMessage.requiresResponse,
      deliveries: deliveryStates.map(delivery => ({
        recipient: delivery.recipient,
        state: delivery.state
      }))
    });

    return teamMessage;
  }

  async readMessages(specId: string, role: AgentRole, since?: string): Promise<TeamMessage[]> {
    const specDir = await this.getSpecDir(specId);
    const messages = await readJsonLines<TeamMessage>(path.join(specDir, "team-chat.jsonl"));

    return messages.filter(message => {
      const visible = message.to === "all" || message.to === role || message.from === role;
      const fresh = !since || message.timestamp > since;
      return visible && fresh;
    });
  }

  async readDeliveryStates(specId: string): Promise<TeamDeliveryState[]> {
    const specDir = await this.getSpecDir(specId);
    return readDeliveryStateFile(specDir);
  }

  async readMailbox(specId: string, role: AgentRole): Promise<TeamMailboxEntry[]> {
    const specDir = await this.getSpecDir(specId);
    return readJsonLines<TeamMailboxEntry>(mailboxPath(specDir, role));
  }

  async markSeen(specId: string, messageId: string, recipient: AgentRole): Promise<void> {
    const specDir = await this.getSpecDir(specId);
    await updateDeliveryState(specDir, messageId, recipient, "seen");
    await appendJsonLine(path.join(specDir, "audit-log.jsonl"), {
      id: createId("audit"),
      timestamp: nowIso(),
      type: "team_message_seen",
      messageId,
      recipient
    });
  }

  async markHandled(specId: string, messageId: string, recipient: AgentRole, responseMessageId?: string): Promise<void> {
    const specDir = await this.getSpecDir(specId);
    await updateDeliveryState(specDir, messageId, recipient, "handled", responseMessageId);
    await appendJsonLine(path.join(specDir, "audit-log.jsonl"), {
      id: createId("audit"),
      timestamp: nowIso(),
      type: "team_message_handled",
      messageId,
      recipient,
      responseMessageId
    });
  }

  async requestPhaseChange(input: {
    specId: string;
    from: AgentRole;
    targetPhase: string;
    reason: string;
  }): Promise<TeamMessage> {
    return this.sendMessage({
      specId: input.specId,
      from: input.from,
      to: "TeamLead",
      type: "phase_request",
      subject: `Request phase change: ${input.targetPhase}`,
      body: input.reason,
      artifacts: [],
      requiresResponse: true
    });
  }

  private async getSpecDir(specId: string): Promise<string> {
    const specDir = await this.resolveSpecDir(specId);
    if (!specDir) {
      throw new Error(`Spec directory not found: ${specId}`);
    }

    return specDir;
  }

  private async deliverToMailboxes(specDir: string, message: TeamMessage): Promise<TeamDeliveryState[]> {
    const recipients = expandRecipients(message);
    const timestamp = nowIso();
    const deliveries = await readDeliveryStateFile(specDir);
    const newDeliveries: TeamDeliveryState[] = [];

    for (const recipient of recipients) {
      const state: TeamDeliveryState = {
        messageId: message.id,
        recipient,
        state: "pending",
        requiresResponse: message.requiresResponse,
        updatedAt: timestamp
      };
      const entry: TeamMailboxEntry = {
        id: createId("mailbox"),
        messageId: message.id,
        recipient,
        state: state.state,
        requiresResponse: message.requiresResponse,
        timestamp,
        message
      };

      await appendJsonLine(mailboxPath(specDir, recipient), entry);
      deliveries.push(state);
      newDeliveries.push(state);

      await this.runtimeStore?.updateRoleBySpecDir(specDir, recipient, {
        activity: "queued"
      });
    }

    await writeDeliveryStateFile(specDir, deliveries);
    return newDeliveries;
  }
}

function expandRecipients(message: TeamMessage): AgentRole[] {
  if (message.to !== "all") {
    return [message.to];
  }

  return runtimeAgentRoles.filter(role => role !== message.from);
}

function mailboxPath(specDir: string, role: AgentRole): string {
  return path.join(specDir, "team-mailboxes", `${role}.jsonl`);
}

async function readDeliveryStateFile(specDir: string): Promise<TeamDeliveryState[]> {
  try {
    const raw = await fs.readFile(path.join(specDir, "delivery-state.json"), "utf8");
    return JSON.parse(raw) as TeamDeliveryState[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeDeliveryStateFile(specDir: string, deliveries: TeamDeliveryState[]): Promise<void> {
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(path.join(specDir, "delivery-state.json"), `${JSON.stringify(deliveries, null, 2)}\n`, "utf8");
}

async function updateDeliveryState(
  specDir: string,
  messageId: string,
  recipient: AgentRole,
  state: TeamDeliveryState["state"],
  responseMessageId?: string
): Promise<void> {
  const deliveries = await readDeliveryStateFile(specDir);
  let changed = false;

  for (const delivery of deliveries) {
    if (delivery.messageId !== messageId || delivery.recipient !== recipient) {
      continue;
    }
    delivery.state = state;
    delivery.responseMessageId = responseMessageId ?? delivery.responseMessageId;
    delivery.updatedAt = nowIso();
    changed = true;
  }

  if (changed) {
    await writeDeliveryStateFile(specDir, deliveries);
  }
}
