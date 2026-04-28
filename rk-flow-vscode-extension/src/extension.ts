import * as vscode from "vscode";
import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { ClaudeCodeAdapter } from "./agentAdapters/cliAdapters";
import type { AgentAdapter, AgentEngine, AgentEvent, AgentRole, AgentSession } from "./agentAdapters/types";
import { appendJsonLine } from "./audit/jsonlStore";
import { createId, nowIso } from "./common/id";
import { GitBindingManager } from "./git/gitBinding";
import { mapAgentEventToTimelineItems } from "./roleChat/timelineMapper";
import { renderRoleChatHtml } from "./roleChat/renderRoleChatHtml";
import { appendTimelineItems, readTimelineForRole } from "./roleChat/timelineStore";
import type { PrivateRoleChatMessage, RoleTimelineItem } from "./roleChat/timelineTypes";
import { SpecRepository } from "./specs/specRepository";
import type { SpecBinding } from "./specs/types";
import { FileTeamBus } from "./teamBus/fileTeamBus";
import { extractTeamMessageRequests, stripTeamMessageBlocks } from "./teamBus/protocol";
import type { TeamBus, TeamMessage, TeamMessageType } from "./teamBus/types";

class SpecItem extends vscode.TreeItem {
  constructor(readonly spec: SpecBinding) {
    super(`${spec.id} ${spec.title}`, vscode.TreeItemCollapsibleState.None);
    this.description = `${spec.phase} · ${spec.gitBranch || "no branch"}`;
    this.tooltip = `${spec.title}\n${spec.specDir}\n${spec.gitBranch}`;
    this.contextValue = "rkFlowSpec";
    this.iconPath = new vscode.ThemeIcon("git-pull-request");
    this.command = {
      command: "rkFlow.openAgentTeamCanvas",
      title: "Open AgentTeam Canvas",
      arguments: [spec]
    };
  }
}

class SpecExplorerProvider implements vscode.TreeDataProvider<SpecItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<SpecItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly repository: SpecRepository) {}

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: SpecItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<SpecItem[]> {
    const specs = await this.repository.listSpecs();
    return specs.map(spec => new SpecItem(spec));
  }
}

class AgentAdaptersProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly adapters: AgentAdapter[]) {}

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const items = await Promise.all(this.adapters.map(async adapter => {
      const available = await adapter.detect();
      const item = new vscode.TreeItem(adapter.engine, vscode.TreeItemCollapsibleState.None);
      item.description = available ? "available" : "missing";
      item.iconPath = new vscode.ThemeIcon(available ? "check" : "warning");
      return item;
    }));

    const terminal = new vscode.TreeItem("vscode-terminal", vscode.TreeItemCollapsibleState.None);
    terminal.description = "native bridge";
    terminal.iconPath = new vscode.ThemeIcon("terminal");

    return [...items, terminal];
  }
}

interface AgentRunOptions {
  routeDepth?: number;
  sourceTeamMessage?: TeamMessage;
  turnId?: string;
}

interface AgentRunResult {
  body: string;
  teamMessages: TeamMessage[];
}

class AgentChatViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "rkFlow.agentChat";
  private webviewView?: vscode.WebviewView;
  private activeRole: AgentRole = "TeamLead";
  private onTeamMessagesChanged?: () => void | Promise<void>;

  constructor(
    private readonly teamBus: TeamBus,
    private readonly getActiveSpec: () => Promise<SpecBinding | undefined>,
    private readonly adapters: AgentAdapter[],
    private readonly workspaceRoot: vscode.Uri
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.webviewView = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = renderRoleChatHtml(undefined, this.activeRole, [], {});
    webviewView.webview.onDidReceiveMessage(message => this.handleMessage(message));
    void this.refresh();
  }

  setTeamMessagesChangedHandler(handler: () => void | Promise<void>): void {
    this.onTeamMessagesChanged = handler;
  }

  async refresh(): Promise<void> {
    if (!this.webviewView) {
      return;
    }

    const spec = await this.getActiveSpec();
    const items = spec ? await readTimelineForRole(spec, this.activeRole) : [];
    const sessions = spec ? await readRoleSessions(spec) : {};
    this.webviewView.webview.html = renderRoleChatHtml(spec, this.activeRole, items, sessions);
  }

  async selectRole(role: AgentRole): Promise<void> {
    this.activeRole = role;
    await this.reveal();
    await this.refresh();
    this.webviewView?.show?.(true);
    this.webviewView?.webview.postMessage({ type: "roleSelected", role });
  }

  private async handleMessage(message: { command?: string; body?: string; role?: AgentRole; model?: string; path?: string; line?: number }): Promise<void> {
    if (message.command === "selectRole" && isAgentRole(message.role)) {
      this.activeRole = message.role;
      await this.refresh();
      return;
    }

    if (message.command === "openFile" && typeof message.path === "string") {
      await this.openWorkspaceFile(message.path, message.line);
      return;
    }

    if (message.command !== "send" || !message.body?.trim()) {
      return;
    }

    const spec = await this.getActiveSpec();
    if (!spec) {
      await vscode.window.showWarningMessage("No active Spec found.");
      return;
    }

    const role = isAgentRole(message.role) ? message.role : this.activeRole;
    this.activeRole = role;
    const prompt = message.body.trim();
    await this.sendRoleMessage(spec, role, prompt, message.model ?? "default", payload => {
      this.webviewView?.webview.postMessage(payload);
    });
  }

  private async openWorkspaceFile(filePath: string, line?: number): Promise<void> {
    const workspacePath = path.resolve(this.workspaceRoot.fsPath);
    const targetPath = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(workspacePath, filePath);
    const relative = path.relative(workspacePath, targetPath);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      await vscode.window.showWarningMessage("R&K Flow refused to open a file outside the workspace.");
      return;
    }

    const uri = vscode.Uri.file(targetPath);
    const options: vscode.TextDocumentShowOptions = {};
    if (typeof line === "number" && Number.isFinite(line) && line > 0) {
      const position = new vscode.Position(line - 1, 0);
      options.selection = new vscode.Range(position, position);
    }
    await vscode.window.showTextDocument(uri, options);
  }

  async sendRoleMessage(
    spec: SpecBinding,
    role: AgentRole,
    prompt: string,
    model: string,
    postMessage: (payload: unknown) => void | Thenable<void>
  ): Promise<void> {
    this.activeRole = role;
    const turnId = createId("turn");
    const privateMessage = await appendPrivateRoleChat(spec, {
      from: "user",
      to: role,
      direction: "user_to_agent",
      body: prompt,
      model,
      artifacts: []
    });
    const userTimelineItems: RoleTimelineItem[] = [
      {
        id: createId("timeline"),
        specId: spec.id,
        role,
        turnId,
        type: "turn_start",
        timestamp: privateMessage.timestamp,
        source: "system",
        title: "User message"
      },
      {
        id: createId("timeline"),
        specId: spec.id,
        role,
        turnId,
        type: "user_message",
        timestamp: privateMessage.timestamp,
        source: "user",
        body: prompt
      }
    ];
    await appendTimelineItems(spec, userTimelineItems);
    await appendJsonLine(`${spec.specDirFsPath}/audit-log.jsonl`, {
      id: createId("audit"),
      timestamp: nowIso(),
      type: "role_chat_message",
      specId: spec.id,
      from: "user",
      to: role,
      messageId: privateMessage.id
    });

    await postMessage({ type: "timelineItems", items: userTimelineItems, role });
    await postMessage({ type: "sent", message: privateMessage, model });
    await this.runAgentMessage(spec, role, prompt, model, postMessage, { turnId });
  }

  async routeTeamMessages(
    spec: SpecBinding,
    messages: TeamMessage[],
    postMessage: (payload: unknown) => void | Thenable<void>
  ): Promise<void> {
    await this.routeRequestedResponses(spec, messages, "default", postMessage, 0);
  }

  private async runAgentMessage(
    spec: SpecBinding,
    role: AgentRole,
    prompt: string,
    model: string,
    postMessage: (payload: unknown) => void | Thenable<void>,
    options: AgentRunOptions = {}
  ): Promise<AgentRunResult> {
    const engine = defaultEngineForRole(role);
    const turnId = options.turnId ?? createId("turn");
    const postTimelineItems = async (items: RoleTimelineItem[]): Promise<void> => {
      if (!items.length) {
        return;
      }
      await appendTimelineItems(spec, items);
      await postMessage({ type: "timelineItems", items, role });
    };

    if (!options.turnId) {
      await postTimelineItems([{
        id: createId("timeline"),
        specId: spec.id,
        role,
        turnId,
        type: "turn_start",
        timestamp: nowIso(),
        source: "team_bus",
        title: "TeamBus routed message"
      }]);
    }

    const adapter = this.adapters.find(candidate => candidate.engine === engine);
    if (!adapter) {
      const error = `No adapter registered for ${engine}.`;
      await appendPrivateRoleChat(spec, {
        from: role,
        to: "user",
        direction: "agent_to_user",
        body: error,
        model,
        artifacts: [],
        isError: true
      });
      await postTimelineItems([
        {
          id: createId("timeline"),
          specId: spec.id,
          role,
          turnId,
          type: "error",
          timestamp: nowIso(),
          source: "system",
          severity: "error",
          message: error
        },
        {
          id: createId("timeline"),
          specId: spec.id,
          role,
          turnId,
          type: "turn_end",
          timestamp: nowIso(),
          source: "system",
          status: "failed"
        }
      ]);
      await postMessage({ type: "agentError", error });
      return { body: error, teamMessages: [] };
    }

    const available = await adapter.detect();
    if (!available) {
      const error = `${engine} is not available on this machine.`;
      await appendPrivateRoleChat(spec, {
        from: role,
        to: "user",
        direction: "agent_to_user",
        body: error,
        artifacts: [],
        model,
        isError: true
      });
      await postTimelineItems([
        {
          id: createId("timeline"),
          specId: spec.id,
          role,
          turnId,
          type: "error",
          timestamp: nowIso(),
          source: "system",
          severity: "error",
          message: error
        },
        {
          id: createId("timeline"),
          specId: spec.id,
          role,
          turnId,
          type: "turn_end",
          timestamp: nowIso(),
          source: "system",
          status: "failed"
        }
      ]);
      await postMessage({ type: "agentError", error });
      return { body: error, teamMessages: [] };
    }

    const normalizedModel = normalizeModelForEngine(engine, model);
    const loadedSession = await loadAgentSession(spec, role);
    const session = loadedSession ?? createAgentSession(spec, role, engine, normalizedModel, this.workspaceRoot);
    session.engine = engine;
    session.model = normalizedModel;
    session.updatedAt = nowIso();
    await saveAgentSession(spec, session);
    const eventLogPath = `${spec.specDirFsPath}/logs/agent-events.jsonl`;
    const readableText: string[] = [];
    const resumed = Boolean(loadedSession);
    let assistantTimelineSeen = false;
    await postMessage({ type: "agentStarted", role, engine, sessionId: session.id, resumed });
    await postTimelineItems([{
      id: createId("timeline"),
      specId: spec.id,
      role,
      turnId,
      sessionId: session.id,
      type: "system_status",
      timestamp: nowIso(),
      source: "system",
      status: resumed ? "resumed" : "started",
      message: `${resumed ? "Resumed" : "Started"} ${role} via ${engine}.`
    }]);

    try {
      const eventStream = resumed
        ? adapter.resume(session, buildRolePrompt(spec, role, prompt))
        : adapter.start(session, buildRolePrompt(spec, role, prompt));

      for await (const event of eventStream) {
        await appendJsonLine(eventLogPath, event);
        const externalSessionId = extractExternalSessionId(event, engine);
        if (externalSessionId && externalSessionId !== session.id) {
          session.id = externalSessionId;
          session.updatedAt = nowIso();
          await saveAgentSession(spec, session);
          await postMessage({ type: "sessionUpdated", role, sessionId: session.id });
        }
        const text = readableEventText(event);
        if (text) {
          readableText.push(text);
        }
        const timelineItems = mapAgentEventToTimelineItems({
          spec,
          role,
          turnId,
          sessionId: session.id,
          event
        });
        assistantTimelineSeen = assistantTimelineSeen || timelineItems.some(item => item.type === "assistant_message");
        await postTimelineItems(timelineItems);
      }

      const rawBody = readableText.join("\n").trim() || `${role} finished without text output.`;
      let teamMessages = await this.emitTeamMessagesFromAgentResponse(spec, role, rawBody, eventLogPath, postMessage);
      const body = stripTeamMessageBlocks(rawBody) || (teamMessages.length ? `${role} sent ${teamMessages.length} TeamBus message(s).` : rawBody);

      if (options.sourceTeamMessage && teamMessages.length === 0) {
        const implicitReply = await this.teamBus.sendMessage({
          specId: spec.id,
          from: role,
          to: options.sourceTeamMessage.from,
          type: "status",
          subject: `Response: ${options.sourceTeamMessage.subject}`,
          body,
          artifacts: [eventLogPath],
          requiresResponse: false
        });
        teamMessages = [implicitReply];
        await postMessage({ type: "teamMessage", message: implicitReply });
        await this.onTeamMessagesChanged?.();
      }

      const responseMessage = await appendPrivateRoleChat(spec, {
        from: role,
        to: "user",
        direction: "agent_to_user",
        body,
        model,
        artifacts: [eventLogPath]
      });
      const completionItems: RoleTimelineItem[] = [];
      if (!assistantTimelineSeen) {
        completionItems.push({
          id: createId("timeline"),
          specId: spec.id,
          role,
          turnId,
          sessionId: session.id,
          type: "assistant_message",
          timestamp: responseMessage.timestamp,
          source: "agent",
          body,
          format: "markdown",
          final: true
        });
      }
      completionItems.push({
        id: createId("timeline"),
        specId: spec.id,
        role,
        turnId,
        sessionId: session.id,
        type: "turn_end",
        timestamp: responseMessage.timestamp,
        source: "system",
        status: "completed"
      });
      await postTimelineItems(completionItems);
      await appendJsonLine(`${spec.specDirFsPath}/audit-log.jsonl`, {
        id: createId("audit"),
        timestamp: nowIso(),
        type: "role_chat_response",
        specId: spec.id,
        from: role,
        to: "user",
        messageId: responseMessage.id,
        artifacts: [eventLogPath]
      });
      await postMessage({ type: "agentDone", message: responseMessage });
      await this.routeRequestedResponses(spec, teamMessages, model, postMessage, options.routeDepth ?? 0);
      return { body, teamMessages };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await appendJsonLine(eventLogPath, {
        id: createId("event"),
        sessionId: session.id,
        role,
        type: "error",
        timestamp: nowIso(),
        payload: errorMessage
      });
      await appendPrivateRoleChat(spec, {
        from: role,
        to: "user",
        direction: "agent_to_user",
        body: errorMessage,
        model,
        artifacts: [eventLogPath],
        isError: true
      });
      await postTimelineItems([
        {
          id: createId("timeline"),
          specId: spec.id,
          role,
          turnId,
          sessionId: session.id,
          type: "error",
          timestamp: nowIso(),
          source: "system",
          severity: "error",
          message: errorMessage
        },
        {
          id: createId("timeline"),
          specId: spec.id,
          role,
          turnId,
          sessionId: session.id,
          type: "turn_end",
          timestamp: nowIso(),
          source: "system",
          status: "failed"
        }
      ]);
      await postMessage({ type: "agentError", error: errorMessage });
      return { body: errorMessage, teamMessages: [] };
    }
  }

  private async emitTeamMessagesFromAgentResponse(
    spec: SpecBinding,
    role: AgentRole,
    responseBody: string,
    eventLogPath: string,
    postMessage: (payload: unknown) => void | Thenable<void>
  ): Promise<TeamMessage[]> {
    const requests = extractTeamMessageRequests(responseBody).slice(0, 5);
    const messages: TeamMessage[] = [];

    for (const request of requests) {
      const artifacts = Array.from(new Set([...request.artifacts, eventLogPath]));
      const message = await this.teamBus.sendMessage({
        specId: spec.id,
        from: role,
        to: request.to,
        type: request.type,
        subject: request.subject,
        body: request.body,
        artifacts,
        requiresResponse: request.requiresResponse
      });
      messages.push(message);
      await postMessage({ type: "teamMessage", message });
    }

    if (messages.length) {
      await this.onTeamMessagesChanged?.();
    }

    return messages;
  }

  private async routeRequestedResponses(
    spec: SpecBinding,
    teamMessages: TeamMessage[],
    model: string,
    postMessage: (payload: unknown) => void | Thenable<void>,
    routeDepth: number
  ): Promise<void> {
    if (routeDepth >= 1) {
      return;
    }

    for (const message of teamMessages) {
      if (!message.requiresResponse || !isAgentRole(message.to) || message.to === message.from) {
        continue;
      }

      await this.runAgentMessage(
        spec,
        message.to,
        buildTeamBusPrompt(spec, message.to, message),
        model,
        postMessage,
        { routeDepth: routeDepth + 1, sourceTeamMessage: message }
      );
    }
  }

  private async reveal(): Promise<void> {
    try {
      await vscode.commands.executeCommand(`${AgentChatViewProvider.viewType}.focus`);
    } catch {
      try {
        await vscode.commands.executeCommand("workbench.view.extension.rk-flow-agent");
      } catch {
        // These commands are contributed by VS Code when the view/container exists.
      }
    }
  }
}

class TeamChatroomViewProvider implements vscode.WebviewViewProvider {
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
    this.webviewView.webview.html = renderTeamChatroomHtml(spec, messages);
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
      artifacts: [spec.planPathFsPath],
      requiresResponse: message.requiresResponse === true
    });

    this.webviewView?.webview.postMessage({ type: "teamMessage", message: teamMessage });
    await this.chatProvider.routeTeamMessages(spec, [teamMessage], payload => {
      this.webviewView?.webview.postMessage(payload);
    });
    await this.refresh();
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceRoot) {
    vscode.window.showWarningMessage("R&K Flow requires an opened workspace.");
    return;
  }

  const repository = new SpecRepository(workspaceRoot);
  const gitBinding = new GitBindingManager(workspaceRoot.fsPath);
  const adapters: AgentAdapter[] = [new ClaudeCodeAdapter()];
  let activeSpec: SpecBinding | undefined;

  const getActiveSpec = async (): Promise<SpecBinding | undefined> => {
    if (activeSpec) {
      return activeSpec;
    }

    const [first] = await repository.listSpecs();
    activeSpec = first;
    return activeSpec;
  };

  const teamBus = new FileTeamBus(async specId => {
    const spec = activeSpec?.id === specId ? activeSpec : await repository.findById(specId);
    return spec?.specDirFsPath;
  });
  const specExplorer = new SpecExplorerProvider(repository);
  const adaptersProvider = new AgentAdaptersProvider(adapters);
  const chatProvider = new AgentChatViewProvider(teamBus, getActiveSpec, adapters, workspaceRoot);
  const teamChatProvider = new TeamChatroomViewProvider(teamBus, getActiveSpec, chatProvider);
  chatProvider.setTeamMessagesChangedHandler(() => teamChatProvider.refresh());

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("rkFlow.specExplorer", specExplorer),
    vscode.window.registerTreeDataProvider("rkFlow.agentAdapters", adaptersProvider),
    vscode.window.registerWebviewViewProvider(AgentChatViewProvider.viewType, chatProvider),
    vscode.window.registerWebviewViewProvider(TeamChatroomViewProvider.viewType, teamChatProvider),
    vscode.commands.registerCommand("rkFlow.openAgentTeamCanvas", async (spec?: SpecBinding) => {
      activeSpec = spec ?? await getActiveSpec();
      if (!activeSpec) {
        await vscode.window.showWarningMessage("No Spec with plan.md found under spec/.");
        return;
      }

      await chatProvider.refresh();
      await teamChatProvider.refresh();
      await openAgentTeamCanvas(context, activeSpec, gitBinding, teamBus, chatProvider, teamChatProvider);
    }),
    vscode.commands.registerCommand("rkFlow.selectAgentRole", async (role?: AgentRole) => {
      const selected = isAgentRole(role)
        ? role
        : await vscode.window.showQuickPick(agentRoles, { title: "Select R&K Flow Agent" });
      if (!isAgentRole(selected)) {
        return;
      }

      await chatProvider.selectRole(selected);
    }),
    vscode.commands.registerCommand("rkFlow.checkoutSpecBranch", async (spec?: SpecBinding) => {
      const targetSpec = spec ?? await getActiveSpec();
      if (!targetSpec) {
        await vscode.window.showWarningMessage("No active Spec found.");
        return;
      }

      await checkoutSpecBranch(gitBinding, targetSpec);
    }),
    vscode.commands.registerCommand("rkFlow.sendTeamMessage", async () => {
      const spec = await getActiveSpec();
      if (!spec) {
        await vscode.window.showWarningMessage("No active Spec found.");
        return;
      }

      const body = await vscode.window.showInputBox({ prompt: "Message to Agent Team" });
      if (!body?.trim()) {
        return;
      }

      await teamBus.sendMessage({
        specId: spec.id,
        from: "TeamLead",
        to: "all",
        type: "status",
        subject: "Manual TeamLead message",
        body: body.trim(),
        artifacts: [],
        requiresResponse: false
      });
      await teamChatProvider.refresh();
      await teamChatProvider.reveal();
      await vscode.window.showInformationMessage("R&K Flow team message saved.");
    }),
    vscode.commands.registerCommand("rkFlow.refresh", () => {
      specExplorer.refresh();
      adaptersProvider.refresh();
      void chatProvider.refresh();
      void teamChatProvider.refresh();
    })
  );
}

export function deactivate(): void {
  return;
}

async function openAgentTeamCanvas(
  _context: vscode.ExtensionContext,
  spec: SpecBinding,
  gitBinding: GitBindingManager,
  teamBus: TeamBus,
  chatProvider: AgentChatViewProvider,
  teamChatProvider: TeamChatroomViewProvider
): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    "rkFlow.agentTeamCanvas",
    "AgentTeam.canvas",
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const currentBranch = await safeCurrentBranch(gitBinding);
  panel.webview.html = renderCanvasHtml(spec, currentBranch);
  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === "selectAgent" && isAgentRole(message.role)) {
      await chatProvider.selectRole(message.role);
      panel.webview.postMessage({ type: "agentSelected", role: message.role });
    }

    if (message.command === "checkoutBranch") {
      await checkoutSpecBranch(gitBinding, spec);
      panel.webview.postMessage({
        type: "branch",
        branch: await safeCurrentBranch(gitBinding)
      });
    }

    if (message.command === "phaseRequest" && typeof message.phase === "string") {
      const teamMessage = await teamBus.requestPhaseChange({
        specId: spec.id,
        from: "TeamLead",
        targetPhase: message.phase,
        reason: "Requested from AgentTeam Canvas"
      });
      await teamChatProvider.refresh();
      await teamChatProvider.postMessage({ type: "teamMessage", message: teamMessage });
      await teamChatProvider.reveal();
    }
  });
}

async function checkoutSpecBranch(gitBinding: GitBindingManager, spec: SpecBinding): Promise<void> {
  try {
    await gitBinding.checkoutBranch(spec.gitBranch);
    await vscode.window.showInformationMessage(`Checked out ${spec.gitBranch}.`);
  } catch (error) {
    await vscode.window.showErrorMessage(`Failed to checkout ${spec.gitBranch}: ${String(error)}`);
  }
}

async function safeCurrentBranch(gitBinding: GitBindingManager): Promise<string> {
  try {
    return await gitBinding.currentBranch();
  } catch {
    return "unknown";
  }
}

function renderCanvasHtml(spec: SpecBinding, currentBranch: string): string {
  const agents: Array<{ role: AgentRole; engine: string; x: number; y: number }> = [
    { role: "TeamLead", engine: "Claude Code", x: 92, y: 78 },
    { role: "spec-explorer", engine: "Claude Code", x: 326, y: 68 },
    { role: "spec-writer", engine: "Claude Code", x: 558, y: 92 },
    { role: "spec-executor", engine: "Claude Code", x: 330, y: 246 },
    { role: "spec-tester", engine: "Claude Code", x: 582, y: 286 },
    { role: "spec-debugger", engine: "Claude Code", x: 114, y: 282 },
    { role: "spec-ender", engine: "Claude Code", x: 374, y: 424 }
  ];

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: dark; --bg:#1e1e1e; --panel:#252526; --line:#3c3c3c; --text:#d4d4d4; --muted:#8f8f8f; --accent:#4cc2ff; --green:#53c285; --gold:#d7b46a; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 13px/1.45 "Segoe UI", sans-serif; overflow: hidden; }
    header { height: 42px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--line); background: #181818; }
    h1 { margin: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button { color: var(--text); background: #2d2d2d; border: 1px solid var(--line); border-radius: 4px; padding: 5px 8px; font: inherit; cursor: pointer; }
    .canvasWrap { position: relative; height: calc(100vh - 42px); overflow: hidden; background-image: linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 28px 28px; }
    .canvas { position: relative; width: 920px; height: 660px; transform-origin: 0 0; }
    .agent { position: absolute; width: 174px; min-height: 82px; padding: 10px; border: 1px solid var(--line); border-radius: 7px; background: #252526; box-shadow: 0 8px 18px rgba(0,0,0,.18); cursor: pointer; user-select: none; }
    .agent:hover, .agent.selected { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(76,194,255,.28), 0 8px 18px rgba(0,0,0,.18); }
    .agent strong { display: block; font-size: 13px; }
    .agent span { color: var(--muted); font-size: 12px; }
    .agent small { display: inline-block; margin-top: 8px; color: var(--accent); }
    .info { position: absolute; right: 16px; top: 16px; width: min(360px, calc(100vw - 36px)); padding: 10px 12px; border: 1px solid var(--line); border-radius: 6px; background: rgba(24,24,24,.92); backdrop-filter: blur(8px); }
    .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0; }
    .mono { font-family: Consolas, monospace; overflow-wrap: anywhere; }
    .ok { color: var(--green); }
    .warn { color: var(--gold); }
    svg { position: absolute; inset: 0; pointer-events: none; }
    path { stroke: #5f7f95; stroke-width: 1.4; fill: none; stroke-dasharray: 4 4; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(spec.title)}</h1>
    <div>
      <button id="checkout">Checkout Spec Branch</button>
      <button id="phase">Request Implementation Phase</button>
    </div>
  </header>
  <main class="canvasWrap" id="canvasWrap">
    <div class="info">
      <div class="label">Spec</div>
      <div class="mono">${escapeHtml(spec.specDir)}</div>
      <div style="height:8px"></div>
      <div class="label">Git Binding</div>
      <div class="mono">target: ${escapeHtml(spec.gitBranch || "not set")}</div>
      <div class="mono ${currentBranch === spec.gitBranch ? "ok" : "warn"}">current: <span id="currentBranch">${escapeHtml(currentBranch)}</span></div>
    </div>
    <div class="canvas" id="canvas">
      <svg viewBox="0 0 920 660">
        <path d="M266 118 C300 96 306 102 326 110"></path>
        <path d="M500 116 C528 112 540 118 558 132"></path>
        <path d="M412 150 C404 186 394 210 382 246"></path>
        <path d="M498 302 C526 306 544 312 582 326"></path>
        <path d="M306 300 C260 302 220 310 288 322"></path>
        <path d="M418 328 C420 374 418 398 438 424"></path>
      </svg>
      ${agents.map(agent => `<article class="agent" data-role="${agent.role}" tabindex="0" style="left:${agent.x}px;top:${agent.y}px">
        <strong>${escapeHtml(agent.role)}</strong>
        <span>${escapeHtml(agent.engine)}</span>
        <small>${agent.role === "TeamLead" ? "phase gate" : "agent role"}</small>
      </article>`).join("")}
    </div>
  </main>
  <script>
    const vscode = acquireVsCodeApi();
    const canvas = document.querySelector("#canvas");
    const wrap = document.querySelector("#canvasWrap");
    let selectedRole = "TeamLead";
    let offset = { x: 28, y: 28 };
    let scale = 1;
    let dragging = false;
    let start = { x: 0, y: 0 };

    function applyTransform() {
      canvas.style.transform = 'translate(' + offset.x + 'px,' + offset.y + 'px) scale(' + scale + ')';
    }

    function selectAgent(role, notify = true) {
      if (!role) return;
      selectedRole = role;
      document.querySelectorAll('.agent').forEach(node => node.classList.toggle('selected', node.dataset.role === role));
      if (notify) {
        vscode.postMessage({ command: "selectAgent", role });
      }
    }

    wrap.addEventListener('pointerdown', event => {
      if (event.target.closest('.agent') || event.target.closest('.info')) return;
      dragging = true;
      start = { x: event.clientX - offset.x, y: event.clientY - offset.y };
      wrap.setPointerCapture(event.pointerId);
    });
    wrap.addEventListener('pointermove', event => {
      if (!dragging) return;
      offset = { x: event.clientX - start.x, y: event.clientY - start.y };
      applyTransform();
    });
    wrap.addEventListener('pointerup', () => { dragging = false; });
    wrap.addEventListener('wheel', event => {
      event.preventDefault();
      scale = Math.max(.72, Math.min(1.45, scale + (event.deltaY > 0 ? -.05 : .05)));
      applyTransform();
    }, { passive: false });

    document.querySelector("#checkout").addEventListener("click", () => vscode.postMessage({ command: "checkoutBranch" }));
    document.querySelector("#phase").addEventListener("click", () => vscode.postMessage({ command: "phaseRequest", phase: "implementation" }));
    document.querySelectorAll('.agent').forEach(node => {
      node.addEventListener('pointerdown', event => event.stopPropagation());
      node.addEventListener('click', event => {
        event.stopPropagation();
        selectAgent(node.dataset.role);
      });
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectAgent(node.dataset.role);
        }
      });
    });
    window.addEventListener("message", event => {
      if (event.data.type === "branch") {
        document.querySelector("#currentBranch").textContent = event.data.branch;
      }
      if (event.data.type === "agentSelected") {
        selectAgent(event.data.role, false);
      }
    });
    applyTransform();
    selectAgent(selectedRole, false);
  </script>
</body>
</html>`;
}

function renderLegacyCanvasHtml(
  spec: SpecBinding,
  currentBranch: string,
  messages: TeamMessage[],
  roleChatMessages: PrivateRoleChatMessage[],
  roleSessions: Record<AgentRole, AgentSession | undefined>
): string {
  const agents: Array<{ role: AgentRole; engine: string; x: number; y: number }> = [
    { role: "TeamLead", engine: "Claude Code", x: 92, y: 78 },
    { role: "spec-explorer", engine: "Claude Code", x: 326, y: 68 },
    { role: "spec-writer", engine: "Claude Code", x: 558, y: 92 },
    { role: "spec-executor", engine: "Claude Code", x: 330, y: 246 },
    { role: "spec-tester", engine: "Claude Code", x: 582, y: 286 },
    { role: "spec-debugger", engine: "Claude Code", x: 114, y: 282 },
    { role: "spec-ender", engine: "Claude Code", x: 374, y: 424 }
  ];
  const messagesJson = JSON.stringify(messages).replace(/</g, "\\u003c");
  const roleMessagesJson = JSON.stringify(roleChatMessages).replace(/</g, "\\u003c");
  const roleEnginesJson = JSON.stringify(Object.fromEntries(agents.map(agent => [agent.role, agent.engine]))).replace(/</g, "\\u003c");
  const roleSessionsJson = JSON.stringify(roleSessions).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: dark; --bg:#1e1e1e; --panel:#252526; --line:#3c3c3c; --text:#d4d4d4; --muted:#8f8f8f; --accent:#4cc2ff; --green:#53c285; --gold:#d7b46a; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 13px/1.45 "Segoe UI", sans-serif; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-bottom: 1px solid var(--line); background: #181818; }
    h1 { margin: 0; font-size: 13px; font-weight: 600; }
    button, select, input, textarea { color: var(--text); background: #2d2d2d; border: 1px solid var(--line); border-radius: 4px; padding: 5px 8px; font: inherit; }
    textarea { min-height: 86px; resize: vertical; }
    button { cursor: pointer; }
    .shell { display: grid; grid-template-columns: minmax(520px, 1fr) 340px; grid-template-rows: minmax(420px, 1fr) 190px; height: calc(100vh - 42px); min-height: 620px; }
    .canvasWrap { position: relative; overflow: hidden; background-image: linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 28px 28px; }
    .canvas { position: relative; width: 880px; height: 620px; transform-origin: 0 0; }
    .agent { position: absolute; width: 174px; min-height: 82px; padding: 10px; border: 1px solid var(--line); border-radius: 7px; background: #252526; box-shadow: 0 8px 18px rgba(0,0,0,.18); cursor: pointer; }
    .agent:hover, .agent.selected { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(76,194,255,.28), 0 8px 18px rgba(0,0,0,.18); }
    .agent strong { display: block; font-size: 13px; }
    .agent span { color: var(--muted); font-size: 12px; }
    .agent small { display: inline-block; margin-top: 8px; color: var(--accent); }
    svg { position: absolute; inset: 0; pointer-events: none; }
    path { stroke: #5f7f95; stroke-width: 1.4; fill: none; stroke-dasharray: 4 4; }
    .rolePanel { border-left: 1px solid var(--line); background: #181818; display: flex; flex-direction: column; min-width: 0; }
    .teamPanel { grid-column: 1 / 3; border-top: 1px solid var(--line); background: #181818; display: grid; grid-template-columns: minmax(260px, 1fr) 360px; min-height: 0; }
    .section { padding: 12px; border-bottom: 1px solid var(--line); }
    .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0; }
    .mono { font-family: Consolas, monospace; overflow-wrap: anywhere; }
    .ok { color: var(--green); }
    .warn { color: var(--gold); }
    .messages { flex: 1; overflow: auto; padding: 12px; }
    .message { border: 1px solid #333; background: #202020; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
    .message b { color: var(--accent); }
    .roleTranscript { flex: 1; overflow: auto; padding: 12px; min-height: 0; }
    .roleBubble { border: 1px solid #333; background: #202020; border-radius: 6px; padding: 8px; margin-bottom: 8px; white-space: pre-wrap; }
    .roleBubble.assistant { border-color: rgba(76,194,255,.5); }
    .roleBubble.error { border-color: #a65; color: #f0c8c0; }
    .roleForm { padding: 12px; border-top: 1px solid var(--line); display: grid; gap: 8px; }
    .teamHeader { padding: 10px 12px; border-right: 1px solid var(--line); }
    .teamMessages { overflow: auto; padding: 10px 12px; border-right: 1px solid var(--line); }
    .teamComposer { display: grid; gap: 8px; padding: 12px; align-content: start; }
    .composer { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .composer .full { grid-column: 1 / 3; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(spec.title)}</h1>
    <div>
      <button id="checkout">Checkout Spec Branch</button>
      <button id="phase">Request Implementation Phase</button>
    </div>
  </header>
  <main class="shell">
    <section class="canvasWrap" id="canvasWrap">
      <div class="canvas" id="canvas">
        <svg viewBox="0 0 880 620">
          <path d="M266 118 C300 96 306 102 326 110"></path>
          <path d="M500 116 C528 112 540 118 558 132"></path>
          <path d="M412 150 C404 186 394 210 382 246"></path>
          <path d="M498 302 C526 306 544 312 582 326"></path>
          <path d="M306 300 C260 302 220 310 288 322"></path>
          <path d="M418 328 C420 374 418 398 438 424"></path>
        </svg>
        ${agents.map(agent => `<article class="agent" data-role="${agent.role}" tabindex="0" style="left:${agent.x}px;top:${agent.y}px">
          <strong>${escapeHtml(agent.role)}</strong>
          <span>${escapeHtml(agent.engine)}</span>
          <small>${agent.role === "TeamLead" ? "phase gate" : "agent role"}</small>
        </article>`).join("")}
      </div>
    </section>
    <aside class="rolePanel">
      <div class="section">
        <div class="label">Role Chat</div>
        <h2 id="currentRoleTitle" style="margin:4px 0 2px;font-size:15px;">TeamLead</h2>
        <div class="mono" id="currentRoleEngine">Claude Code</div>
      </div>
      <div class="section">
        <div class="label">Git Binding</div>
        <div class="mono">target: ${escapeHtml(spec.gitBranch || "not set")}</div>
        <div class="mono ${currentBranch === spec.gitBranch ? "ok" : "warn"}">current: <span id="currentBranch">${escapeHtml(currentBranch)}</span></div>
      </div>
      <div class="roleTranscript" id="roleTranscript"></div>
      <form class="roleForm" id="roleComposer">
        <select id="roleModel">
          <option value="default">Default for selected role</option>
          <option value="claude-default">Claude Code default</option>
        </select>
        <textarea id="roleMessageBody" placeholder="Chat with selected role..."></textarea>
        <button id="roleSend">Send to Role</button>
      </form>
    </aside>
    <section class="teamPanel">
      <div>
        <div class="teamHeader">
          <div class="label">Team Chatroom</div>
          <div class="mono">${escapeHtml(spec.specDir)}</div>
        </div>
        <div class="teamMessages" id="messages"></div>
      </div>
      <form class="teamComposer" id="composer">
        <div class="label">TeamBus Message</div>
        <div class="composer">
          <select id="teamFrom">${renderRoleOptions("TeamLead")}</select>
          <select id="teamTo">${renderTeamRecipientOptions()}</select>
          <select id="teamType">
            <option value="status">status</option>
            <option value="handoff">handoff</option>
            <option value="question">question</option>
            <option value="blocker">blocker</option>
            <option value="review_request">review_request</option>
            <option value="phase_request">phase_request</option>
          </select>
          <select id="teamRequiresResponse">
            <option value="false">no response</option>
            <option value="true">requires response</option>
          </select>
          <input class="full" id="messageSubject" placeholder="Subject" />
          <input class="full" id="messageBody" placeholder="Message body..." />
          <button class="full">Send TeamBus Message</button>
        </div>
      </form>
    </section>
  </main>
  <script>
    const vscode = acquireVsCodeApi();
    const messages = ${messagesJson};
    const persistedRoleMessages = ${roleMessagesJson};
    const roleEngines = ${roleEnginesJson};
    const roleSessions = ${roleSessionsJson};
    const roleMessages = persistedRoleMessages.map(message => ({
      role: message.direction === "user_to_agent" ? message.to : message.from,
      speaker: message.from === "user" ? "You" : message.from,
      body: message.body,
      kind: message.isError ? "error" : (message.from === "user" ? "" : "assistant")
    }));
    const messagesEl = document.querySelector("#messages");
    const roleTranscript = document.querySelector("#roleTranscript");
    const roleSend = document.querySelector("#roleSend");
    const canvas = document.querySelector("#canvas");
    const wrap = document.querySelector("#canvasWrap");
    let selectedRole = "TeamLead";
    let offset = { x: 20, y: 24 };
    let scale = 1;
    let dragging = false;
    let start = { x: 0, y: 0 };

    function renderMessages() {
      messagesEl.innerHTML = messages
        .filter(isTeamRoomMessage)
        .map(message => '<div class="message"><b>' + escapeText(message.from) + ' -> ' + escapeText(message.to) + '</b><br>' + escapeText(message.subject) + '<br><span>' + escapeText(message.body) + '</span></div>')
        .join('');
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function applyTransform() {
      canvas.style.transform = 'translate(' + offset.x + 'px,' + offset.y + 'px) scale(' + scale + ')';
    }

    function escapeText(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
    }

    function isTeamRoomMessage(message) {
      if (!message || message.to === "user" || message.from === "user") return false;
      const subject = String(message.subject || "");
      return !subject.startsWith("User chat to ") && !subject.startsWith("Agent response from ");
    }

    function renderRoleHeader() {
      document.querySelector("#currentRoleTitle").textContent = selectedRole;
      const session = roleSessions[selectedRole];
      document.querySelector("#currentRoleEngine").textContent = (roleEngines[selectedRole] || "") + (session ? " · resumed" : " · new session");
    }

    function renderRoleTranscript() {
      roleTranscript.innerHTML = roleMessages
        .filter(message => message.role === selectedRole)
        .map(message => '<div class="roleBubble ' + escapeText(message.kind || '') + '"><b>' + escapeText(message.speaker) + '</b><br>' + escapeText(message.body) + '</div>')
        .join('');
      roleTranscript.scrollTop = roleTranscript.scrollHeight;
    }

    function appendRoleBubble(role, speaker, body, kind) {
      roleMessages.push({ role, speaker, body, kind });
      renderRoleTranscript();
    }

    function selectAgent(role, notify = true) {
      if (!role) return;
      selectedRole = role;
      document.querySelectorAll('.agent').forEach(node => node.classList.toggle('selected', node.dataset.role === role));
      renderRoleHeader();
      renderRoleTranscript();
      if (notify) {
        vscode.postMessage({ command: "selectAgent", role });
      }
    }

    wrap.addEventListener('pointerdown', event => {
      if (event.target.closest('.agent')) return;
      dragging = true;
      start = { x: event.clientX - offset.x, y: event.clientY - offset.y };
      wrap.setPointerCapture(event.pointerId);
    });
    wrap.addEventListener('pointermove', event => {
      if (!dragging) return;
      offset = { x: event.clientX - start.x, y: event.clientY - start.y };
      applyTransform();
    });
    wrap.addEventListener('pointerup', () => { dragging = false; });
    wrap.addEventListener('wheel', event => {
      event.preventDefault();
      scale = Math.max(.72, Math.min(1.35, scale + (event.deltaY > 0 ? -.05 : .05)));
      applyTransform();
    }, { passive: false });

    document.querySelector("#checkout").addEventListener("click", () => vscode.postMessage({ command: "checkoutBranch" }));
    document.querySelector("#phase").addEventListener("click", () => vscode.postMessage({ command: "phaseRequest", phase: "implementation" }));
    document.querySelectorAll('.agent').forEach(node => {
      node.addEventListener('pointerdown', event => {
        event.stopPropagation();
      });
      node.addEventListener('click', event => {
        event.stopPropagation();
        selectAgent(node.dataset.role);
      });
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectAgent(node.dataset.role);
        }
      });
    });
    document.querySelector("#roleComposer").addEventListener("submit", event => {
      event.preventDefault();
      const input = document.querySelector("#roleMessageBody");
      if (!input.value.trim()) return;
      appendRoleBubble(selectedRole, "You", input.value.trim(), "");
      roleSend.disabled = true;
      vscode.postMessage({
        command: "roleMessage",
        role: selectedRole,
        model: document.querySelector("#roleModel").value,
        body: input.value.trim()
      });
      input.value = "";
    });
    document.querySelector("#composer").addEventListener("submit", event => {
      event.preventDefault();
      const input = document.querySelector("#messageBody");
      if (!input.value.trim()) return;
      vscode.postMessage({
        command: "teamMessage",
        from: document.querySelector("#teamFrom").value,
        to: document.querySelector("#teamTo").value,
        messageType: document.querySelector("#teamType").value,
        subject: document.querySelector("#messageSubject").value,
        body: input.value.trim(),
        requiresResponse: document.querySelector("#teamRequiresResponse").value === "true"
      });
      document.querySelector("#messageSubject").value = "";
      input.value = "";
    });
    window.addEventListener("message", event => {
      if (event.data.type === "teamMessage") {
        messages.push(event.data.message);
        renderMessages();
      }
      if (event.data.type === "branch") {
        document.querySelector("#currentBranch").textContent = event.data.branch;
      }
      if (event.data.type === "agentSelected") {
        selectedRole = event.data.role;
        selectAgent(selectedRole, false);
      }
      if (event.data.type === "agentStarted") {
        appendRoleBubble(event.data.role || selectedRole, "System", (event.data.resumed ? "Resumed " : "Started ") + event.data.role + " via " + event.data.engine, "");
      }
      if (event.data.type === "sessionUpdated") {
        roleSessions[event.data.role] = { id: event.data.sessionId };
        renderRoleHeader();
      }
      if (event.data.type === "agentEvent" && event.data.text) {
        const eventRole = event.data.event && event.data.event.role ? event.data.event.role : selectedRole;
        appendRoleBubble(eventRole, eventRole, event.data.text, "assistant");
      }
      if (event.data.type === "agentDone") {
        roleSend.disabled = false;
      }
      if (event.data.type === "agentError") {
        roleSend.disabled = false;
        appendRoleBubble(selectedRole, "Error", event.data.error, "error");
      }
    });
    applyTransform();
    selectAgent(selectedRole, false);
    renderMessages();
  </script>
</body>
</html>`;
}

export function renderTeamChatroomHtml(spec: SpecBinding | undefined, messages: TeamMessage[]): string {
  const messagesJson = JSON.stringify(messages).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: dark; --line:#333; --text:#d4d4d4; --muted:#8f8f8f; --panel:#202020; --accent:#4cc2ff; }
    * { box-sizing: border-box; }
    body { margin: 0; height: 100vh; display: flex; flex-direction: column; background: #181818; color: var(--text); font: 13px/1.45 "Segoe UI", sans-serif; }
    .room { min-width: 0; min-height: 0; display: flex; flex-direction: column; flex: 1; }
    header { padding: 10px 12px; border-bottom: 1px solid var(--line); }
    .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0; }
    .mono { font-family: Consolas, monospace; overflow-wrap: anywhere; }
    .messages { flex: 1; min-height: 0; overflow: auto; padding: 10px 12px; }
    .message { border: 1px solid #333; background: var(--panel); border-radius: 6px; padding: 8px; margin-bottom: 8px; white-space: pre-wrap; }
    .message b { color: var(--accent); }
    .empty { color: var(--muted); padding: 10px 0; }
    #status { color: var(--muted); margin-top: 4px; }
  </style>
</head>
<body>
  <section class="room">
    <header>
      <div class="label">Team Chatroom</div>
      <div class="mono">${spec ? escapeHtml(spec.specDir) : "No active Spec"}</div>
      <div id="status"></div>
    </header>
    <div class="messages" id="messages"></div>
  </section>
  <script>
    const messages = ${messagesJson};
    const messagesEl = document.querySelector("#messages");
    const status = document.querySelector("#status");

    function escapeText(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
    }

    function renderMessages() {
      messagesEl.innerHTML = messages.length
        ? messages
        .map(message => '<div class="message"><b>' + escapeText(message.from) + ' -> ' + escapeText(message.to) + '</b><br>' + escapeText(message.subject) + '<br><span>' + escapeText(message.body) + '</span></div>')
        .join('')
        : '<div class="empty">No TeamBus messages yet.</div>';
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function appendMessage(message) {
      if (!message || messages.some(candidate => candidate.id === message.id)) return;
      messages.push(message);
      renderMessages();
    }

    window.addEventListener("message", event => {
      if (event.data.type === "teamMessage") {
        appendMessage(event.data.message);
        status.textContent = "TeamBus message: " + event.data.message.id;
      }
      if (event.data.type === "agentStarted") {
        status.textContent = "Routing " + event.data.role + " via " + event.data.engine + "...";
      }
      if (event.data.type === "agentDone") {
        status.textContent = "Routed response saved.";
      }
      if (event.data.type === "agentError") {
        status.textContent = "Routing failed: " + event.data.error;
      }
    });

    renderMessages();
  </script>
</body>
</html>`;
}

const agentRoles: AgentRole[] = [
  "TeamLead",
  "spec-explorer",
  "spec-writer",
  "spec-executor",
  "spec-tester",
  "spec-debugger",
  "spec-ender"
];

function renderRoleOptions(activeRole: AgentRole): string {
  return agentRoles
    .map(role => `<option value="${role}"${role === activeRole ? " selected" : ""}>${role}</option>`)
    .join("");
}

function renderTeamRecipientOptions(): string {
  return [
    '<option value="all">all</option>',
    ...agentRoles.map(role => `<option value="${role}">${role}</option>`)
  ].join("");
}

function isAgentRole(value: unknown): value is AgentRole {
  return typeof value === "string" && agentRoles.includes(value as AgentRole);
}

function isTeamMessageType(value: unknown): value is TeamMessageType {
  return typeof value === "string" && ["handoff", "question", "blocker", "review_request", "phase_request", "status"].includes(value);
}

function defaultEngineForRole(_role: AgentRole): AgentEngine {
  return "claude-code";
}

function normalizeModelForEngine(_engine: AgentEngine, _model: string): string {
  return "default";
}

async function appendPrivateRoleChat(
  spec: SpecBinding,
  input: {
    from: AgentRole | "user";
    to: AgentRole | "user";
    direction: "user_to_agent" | "agent_to_user";
    body: string;
    model: string;
    artifacts: string[];
    isError?: boolean;
  }
): Promise<{
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
}> {
  const message = {
    id: createId("role-chat"),
    specId: spec.id,
    from: input.from,
    to: input.to,
    direction: input.direction,
    body: input.body,
    model: input.model,
    artifacts: input.artifacts,
    isError: Boolean(input.isError),
    timestamp: nowIso()
  };

  await appendJsonLine(`${spec.specDirFsPath}/agent-chat.jsonl`, message);
  return message;
}

async function readPrivateRoleChat(spec: SpecBinding): Promise<PrivateRoleChatMessage[]> {
  try {
    const raw = await fs.readFile(path.join(spec.specDirFsPath, "agent-chat.jsonl"), "utf8");
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => JSON.parse(line) as PrivateRoleChatMessage);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
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

async function readRoleSessions(spec: SpecBinding): Promise<Record<AgentRole, AgentSession | undefined>> {
  const sessions = {} as Record<AgentRole, AgentSession | undefined>;
  await Promise.all(agentRoles.map(async role => {
    sessions[role] = await loadAgentSession(spec, role);
  }));
  return sessions;
}

async function loadAgentSession(spec: SpecBinding, role: AgentRole): Promise<AgentSession | undefined> {
  try {
    const raw = await fs.readFile(agentSessionPath(spec, role), "utf8");
    return JSON.parse(raw) as AgentSession;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function saveAgentSession(spec: SpecBinding, session: AgentSession): Promise<void> {
  await fs.mkdir(path.join(spec.specDirFsPath, "agent-sessions"), { recursive: true });
  await fs.writeFile(agentSessionPath(spec, session.role), `${JSON.stringify(session, null, 2)}\n`, "utf8");
}

function agentSessionPath(spec: SpecBinding, role: AgentRole): string {
  return path.join(spec.specDirFsPath, "agent-sessions", `${role}.json`);
}

function createAgentSession(
  spec: SpecBinding,
  role: AgentRole,
  engine: AgentEngine,
  model: string,
  workspaceRoot: vscode.Uri
): AgentSession {
  const timestamp = nowIso();

  return {
    id: randomUUID(),
    role,
    engine,
    model,
    workspaceUri: workspaceRoot.fsPath,
    specDir: spec.specDir,
    gitBranch: spec.gitBranch,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function extractExternalSessionId(event: AgentEvent, engine: AgentEngine): string | undefined {
  if (!event.raw || typeof event.raw !== "object") {
    return undefined;
  }

  const raw = event.raw as Record<string, unknown>;
  if (engine === "claude-code" && typeof raw.session_id === "string") {
    return raw.session_id;
  }

  return undefined;
}

function buildRolePrompt(spec: SpecBinding, role: AgentRole, userPrompt: string): string {
  return [
    `You are ${role} in the R&K Flow Spec-driven Agent Team workflow.`,
    `Current Spec: ${spec.title}`,
    `Spec directory: ${spec.specDir}`,
    `Git branch: ${spec.gitBranch}`,
    "",
    "TeamBus protocol:",
    "When you need to communicate with another AgentRole, emit exactly one JSON fenced block with rkFlowTeamMessage.",
    "The extension will persist that block to team-chat.jsonl and audit-log.jsonl. Your current role is always used as from.",
    "Allowed to values: TeamLead, spec-explorer, spec-writer, spec-executor, spec-tester, spec-debugger, spec-ender, all.",
    "Allowed type values: handoff, question, blocker, review_request, phase_request, status.",
    "Use requiresResponse=true only when the target role must be invoked. Avoid protocol blocks for normal user-facing replies.",
    "Example:",
    "```json",
    "{\"rkFlowTeamMessage\":{\"to\":\"spec-debugger\",\"type\":\"blocker\",\"subject\":\"Need debugging\",\"body\":\"Describe the blocker and evidence.\",\"artifacts\":[],\"requiresResponse\":true}}",
    "```",
    "",
    "Answer the user's message as this role. Keep the response concise and do not make file changes unless explicitly requested.",
    "",
    userPrompt
  ].join("\n");
}

function buildTeamBusPrompt(spec: SpecBinding, role: AgentRole, message: TeamMessage): string {
  return buildRolePrompt(spec, role, [
    `You received a TeamBus message from ${message.from}.`,
    `Message type: ${message.type}`,
    `Subject: ${message.subject}`,
    `Body: ${message.body}`,
    `Artifacts: ${message.artifacts.length ? message.artifacts.join(", ") : "none"}`,
    "",
    `Respond as ${role}. If the answer should go back to ${message.from} or another role, emit rkFlowTeamMessage. If you do not emit one, the orchestrator will record your response as a status reply to ${message.from}.`
  ].join("\n"));
}

export function readableEventText(event: AgentEvent): string {
  if (event.type === "done") {
    return "";
  }

  if (isClaudeCodeResultPayload(event.payload)) {
    return "";
  }

  const text = extractText(event.payload);
  if (text) {
    return text;
  }

  if (event.type === "error") {
    return typeof event.payload === "string" ? event.payload : JSON.stringify(event.payload);
  }

  return "";
}

function isClaudeCodeResultPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (value as { type?: unknown }).type === "result";
}

function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  for (const key of ["text", "output_text", "result", "message", "content"]) {
    const candidate = record[key];
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  const message = record.message;
  if (message && typeof message === "object") {
    const nested = extractText(message);
    if (nested) {
      return nested;
    }
  }

  const content = record.content;
  if (Array.isArray(content)) {
    return content.map(item => extractText(item)).filter(Boolean).join("\n");
  }

  return "";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char] ?? char));
}
