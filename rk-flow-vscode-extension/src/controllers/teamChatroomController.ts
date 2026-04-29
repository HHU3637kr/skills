import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import type { AgentRole } from "../agentAdapters/types";
import { isAgentRole, isTeamMessageType } from "../common/roles";
import type { SpecBinding } from "../specs/types";
import type { TeamBus, TeamMessage, TeamMessageType } from "../teamBus/types";
import { renderTeamChatroomHtml } from "../webviews/teamChatroomWebview";
import { AgentChatViewProvider } from "./agentChatController";

export class TeamChatroomViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "rkFlow.teamChatroom";
  private webviewView?: vscode.WebviewView;

  constructor(
    private readonly teamBus: TeamBus,
    private readonly getActiveSpec: () => Promise<SpecBinding | undefined>,
    private readonly chatProvider: AgentChatViewProvider
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.webviewView = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = renderTeamChatroomHtml(undefined, []);
    webviewView.webview.onDidReceiveMessage(message => this.handleMessage(message));
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.webviewView) {
      return;
    }

    const spec = await this.getActiveSpec();
    const messages = spec ? await readAllTeamMessages(spec) : [];
    const deliveries = spec ? await this.teamBus.readDeliveryStates(spec.id) : [];
    this.webviewView.webview.html = renderTeamChatroomHtml(spec, messages, deliveries);
  }

  async reveal(): Promise<void> {
    try {
      await vscode.commands.executeCommand(`${TeamChatroomViewProvider.viewType}.focus`);
    } catch {
      try {
        await vscode.commands.executeCommand("workbench.view.extension.rk-flow-team");
      } catch {
        // These commands are contributed by VS Code when the panel view exists.
      }
    }
  }

  postMessage(payload: unknown): Thenable<boolean> | undefined {
    return this.webviewView?.webview.postMessage(payload);
  }

  private async handleMessage(message: {
    command?: string;
    from?: AgentRole;
    to?: AgentRole | "all";
    messageType?: TeamMessageType;
    subject?: string;
    body?: string;
    requiresResponse?: boolean;
  }): Promise<void> {
    if (message.command !== "teamMessage" || !message.body?.trim()) {
      return;
    }

    const spec = await this.getActiveSpec();
    if (!spec) {
      await vscode.window.showWarningMessage("No active Spec found.");
      return;
    }
    if (spec.lifecycle === "archived") {
      await vscode.window.showWarningMessage("Archived Spec is read-only.");
      return;
    }

    const from = isAgentRole(message.from) ? message.from : "TeamLead";
    const to = message.to === "all" || isAgentRole(message.to) ? message.to : "all";
    const type = isTeamMessageType(message.messageType) ? message.messageType : "status";
    const subject = typeof message.subject === "string" && message.subject.trim() ? message.subject.trim() : "TeamBus note";
    const teamMessage = await this.teamBus.sendMessage({
      specId: spec.id,
      from,
      to,
      type,
      subject,
      body: message.body.trim(),
      artifacts: spec.planPathFsPath ? [spec.planPathFsPath] : [],
      requiresResponse: message.requiresResponse === true
    });

    this.webviewView?.webview.postMessage({ type: "teamMessage", message: teamMessage });
    await this.chatProvider.routeTeamMessages(spec, [teamMessage], payload => {
      this.webviewView?.webview.postMessage(payload);
    });
    await this.refresh();
  }
}

async function readAllTeamMessages(spec: SpecBinding): Promise<TeamMessage[]> {
  try {
    const raw = await fs.readFile(path.join(spec.specDirFsPath, "team-chat.jsonl"), "utf8");
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => JSON.parse(line) as TeamMessage);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

