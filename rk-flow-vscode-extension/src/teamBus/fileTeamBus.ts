import * as path from "path";
import { appendJsonLine, readJsonLines } from "../audit/jsonlStore";
import { createId, nowIso } from "../common/id";
import type { AgentRole } from "../agentAdapters/types";
import type { TeamBus, TeamMessage } from "./types";

export class FileTeamBus implements TeamBus {
  constructor(private readonly resolveSpecDir: (specId: string) => Promise<string | undefined>) {}

  async sendMessage(message: Omit<TeamMessage, "id" | "timestamp">): Promise<TeamMessage> {
    const specDir = await this.getSpecDir(message.specId);
    const teamMessage: TeamMessage = {
      ...message,
      id: createId("team"),
      timestamp: nowIso()
    };

    await appendJsonLine(path.join(specDir, "team-chat.jsonl"), teamMessage);
    await appendJsonLine(path.join(specDir, "audit-log.jsonl"), {
      id: createId("audit"),
      timestamp: nowIso(),
      type: "team_message",
      messageId: teamMessage.id,
      from: teamMessage.from,
      to: teamMessage.to,
      messageType: teamMessage.type,
      subject: teamMessage.subject,
      artifacts: teamMessage.artifacts
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
}
