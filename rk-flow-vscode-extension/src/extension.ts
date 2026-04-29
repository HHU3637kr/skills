import * as vscode from "vscode";
import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { ClaudeCodeAdapter } from "./agentAdapters/cliAdapters";
import type { AgentAdapter, AgentBackend, AgentEngine, AgentEvent, AgentRole, AgentSession } from "./agentAdapters/types";
import { appendJsonLine } from "./audit/jsonlStore";
import { createId, nowIso } from "./common/id";
import { GitBindingManager } from "./git/gitBinding";
import { mapAgentEventToTimelineItems } from "./roleChat/timelineMapper";
import { renderRoleChatHtml } from "./roleChat/renderRoleChatHtml";
import { appendTimelineItems, readTimelineForRole } from "./roleChat/timelineStore";
import type { PrivateRoleChatMessage, RoleTimelineItem } from "./roleChat/timelineTypes";
import { RoleRuntimeManager } from "./runtime/roleRuntime";
import { RuntimeStore } from "./runtime/runtimeStore";
import { createSpec, createSpecBranchName, createSpecId, specCategories, validateSpecTitle } from "./specs/specCreator";
import type { CreatedSpec } from "./specs/specCreator";
import { SpecRepository } from "./specs/specRepository";
import type { SpecBinding, SpecLifecycle } from "./specs/types";
import { FileTeamBus } from "./teamBus/fileTeamBus";
import { extractTeamMessageRequests, stripTeamMessageBlocks } from "./teamBus/protocol";
import type { TeamBus, TeamDeliveryState, TeamMessage, TeamMessageType } from "./teamBus/types";

const agentTeamCanvasPanels = new Map<string, vscode.WebviewPanel>();

class SpecItem extends vscode.TreeItem {
  constructor(readonly spec: SpecBinding) {
    super(`${spec.id} ${spec.title}`, vscode.TreeItemCollapsibleState.None);
    this.description = specDescription(spec);
    this.tooltip = [
      spec.title,
      spec.specDir,
      spec.gitBranch || "no branch",
      spec.health === "incomplete" ? `missing: ${spec.missingFiles.join(", ")}` : "complete"
    ].join("\n");
    this.contextValue = "rkFlowSpec";
    this.iconPath = new vscode.ThemeIcon(spec.health === "incomplete" ? "warning" : spec.lifecycle === "archived" ? "archive" : "git-pull-request");
    this.command = {
      command: "rkFlow.openAgentTeamCanvas",
      title: "Open AgentTeam Canvas",
      arguments: [spec]
    };
  }
}

class SpecGroupItem extends vscode.TreeItem {
  constructor(readonly lifecycle: SpecLifecycle, readonly count: number) {
    super(lifecycle === "active" ? "Active" : "Archived", vscode.TreeItemCollapsibleState.Expanded);
    this.description = `${count}`;
    this.contextValue = "rkFlowSpecGroup";
    this.iconPath = new vscode.ThemeIcon(lifecycle === "active" ? "folder-active" : "archive");
  }
}

type SpecTreeItem = SpecGroupItem | SpecItem;

class SpecExplorerProvider implements vscode.TreeDataProvider<SpecTreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<SpecTreeItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly repository: SpecRepository) {}

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: SpecTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SpecTreeItem): Promise<SpecTreeItem[]> {
    const specs = await this.repository.listSpecs();
    if (element instanceof SpecGroupItem) {
      return specs
        .filter(spec => spec.lifecycle === element.lifecycle)
        .map(spec => new SpecItem(spec));
    }

    const activeCount = specs.filter(spec => spec.lifecycle === "active").length;
    const archivedCount = specs.filter(spec => spec.lifecycle === "archived").length;
    return [
      new SpecGroupItem("active", activeCount),
      new SpecGroupItem("archived", archivedCount)
    ];
  }
}

function specDescription(spec: SpecBinding): string {
  if (spec.lifecycle === "archived") {
    return spec.health === "complete"
      ? `archived · ${spec.gitBranch || "no branch"}`
      : `archived · incomplete${spec.missingFiles[0] ? ` · missing ${spec.missingFiles[0]}` : ""}`;
  }

  if (spec.health === "incomplete") {
    return `incomplete${spec.missingFiles[0] ? ` · missing ${spec.missingFiles[0]}` : ""}`;
  }

  return `${spec.phase} · ${spec.gitBranch || "no branch"}`;
}

class SpecFileItem extends vscode.TreeItem {
  constructor(
    readonly uri: vscode.Uri,
    readonly workspaceRoot: vscode.Uri,
    readonly isDirectory: boolean
  ) {
    super(path.basename(uri.fsPath), isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    this.resourceUri = uri;
    this.contextValue = isDirectory ? "rkFlowSpecFolder" : "rkFlowSpecFile";
    this.tooltip = path.relative(workspaceRoot.fsPath, uri.fsPath).replace(/\\/g, "/");
    this.iconPath = new vscode.ThemeIcon(isDirectory ? "folder" : "file");

    if (!isDirectory) {
      this.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [uri]
      };
    }
  }
}

class CurrentSpecFilesProvider implements vscode.TreeDataProvider<SpecFileItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<SpecFileItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(
    private readonly workspaceRoot: vscode.Uri,
    private readonly getActiveSpec: () => Promise<SpecBinding | undefined>
  ) {}

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: SpecFileItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SpecFileItem): Promise<SpecFileItem[]> {
    const spec = await this.getActiveSpec();
    if (!spec) {
      return [];
    }

    const parent = element?.uri.fsPath ?? spec.specDirFsPath;
    const entries = await fs.readdir(parent, { withFileTypes: true });
    return entries
      .filter(entry => !entry.name.startsWith("."))
      .sort((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) {
          return left.isDirectory() ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      })
      .map(entry => {
        const uri = vscode.Uri.file(path.join(parent, entry.name));
        return new SpecFileItem(uri, this.workspaceRoot, entry.isDirectory());
      });
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
    private readonly runtimeStore: RuntimeStore,
    private readonly roleRuntime: RoleRuntimeManager,
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
    const runtime = spec
      ? spec.lifecycle === "archived"
        ? await this.runtimeStore.readRuntime(spec)
        : await this.runtimeStore.ensureRuntime(spec, this.activeRole)
      : undefined;
    this.webviewView.webview.html = renderRoleChatHtml(spec, this.activeRole, items, sessions, runtime);
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

    if (message.command === "resetSession") {
      const spec = await this.getActiveSpec();
      if (!spec) {
        await vscode.window.showWarningMessage("No active Spec found.");
        return;
      }
      if (spec.lifecycle === "archived") {
        await vscode.window.showWarningMessage("Archived Spec is read-only.");
        return;
      }
      const role = isAgentRole(message.role) ? message.role : this.activeRole;
      try {
        const runtime = await this.roleRuntime.resetSession(spec, role);
        this.webviewView?.webview.postMessage({ type: "runtimeState", role, runtime });
        this.webviewView?.webview.postMessage({ type: "sessionReset", role });
      } catch (error) {
        this.webviewView?.webview.postMessage({ type: "agentError", error: error instanceof Error ? error.message : String(error) });
      }
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
    if (spec.lifecycle === "archived") {
      await vscode.window.showWarningMessage("Archived Spec is read-only.");
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
    const postRuntimeState = async (): Promise<void> => {
      await this.postRuntimeState(spec, role, postMessage);
    };
    let runtimeLocked = false;

    try {
      await this.roleRuntime.beginRun(spec, role, turnId);
      runtimeLocked = true;
      await postRuntimeState();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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
          message: errorMessage
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
      await postMessage({ type: "agentError", error: errorMessage });
      return { body: errorMessage, teamMessages: [] };
    }
    const markRoleFailed = async (error: string, sessionId?: string): Promise<void> => {
      if (!runtimeLocked) {
        return;
      }
      await this.roleRuntime.failRun(spec, role, error, sessionId);
      await postRuntimeState();
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
      await markRoleFailed(error);
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
      await markRoleFailed(error);
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
    if (isAgentBackend(adapter)) {
      await adapter.loadSession(session);
    }
    await this.roleRuntime.updateSession(spec, role, session.id);
    await postRuntimeState();
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
      const rolePrompt = buildRolePrompt(spec, role, prompt);
      const eventStream = isAgentBackend(adapter)
        ? adapter.invoke({ session, prompt: rolePrompt, resumed, turnId })
        : resumed
          ? adapter.resume(session, rolePrompt)
          : adapter.start(session, rolePrompt);

      for await (const event of eventStream) {
        await appendJsonLine(eventLogPath, event);
        const externalSessionId = extractExternalSessionId(event, engine);
        if (externalSessionId && externalSessionId !== session.id) {
          session.id = externalSessionId;
          session.updatedAt = nowIso();
          await saveAgentSession(spec, session);
          await this.roleRuntime.updateSession(spec, role, session.id);
          await postRuntimeState();
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

      if (options.sourceTeamMessage?.requiresResponse && teamMessages.length === 0) {
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
      if (options.sourceTeamMessage) {
        await this.teamBus.markHandled(
          spec.id,
          options.sourceTeamMessage.id,
          role,
          options.sourceTeamMessage.requiresResponse ? teamMessages[0]?.id : undefined
        );
        await this.onTeamMessagesChanged?.();
      }
      await this.roleRuntime.completeRun(spec, role, session.id);
      await postRuntimeState();
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
      await markRoleFailed(errorMessage, session.id);
      await postMessage({ type: "agentError", error: errorMessage });
      return { body: errorMessage, teamMessages: [] };
    }
  }

  private async postRuntimeState(
    spec: SpecBinding,
    role: AgentRole,
    postMessage: (payload: unknown) => void | Thenable<void>
  ): Promise<void> {
    const existing = await this.runtimeStore.readRuntime(spec);
    const runtime = await this.runtimeStore.ensureRuntime(spec, existing?.activeRole ?? role);
    await postMessage({ type: "runtimeState", role, runtime });
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
      if (!shouldRouteTeamMessage(message)) {
        continue;
      }

      await this.teamBus.markSeen(spec.id, message.id, message.to);
      await this.runtimeStore.updateRole(spec, message.to, {
        mailboxCursor: (await this.teamBus.readMailbox(spec.id, message.to)).length
      });
      await this.onTeamMessagesChanged?.();
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

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceRoot) {
    vscode.window.showWarningMessage("R&K Flow requires an opened workspace.");
    return;
  }

  const repository = new SpecRepository(workspaceRoot);
  const gitBinding = new GitBindingManager(workspaceRoot.fsPath);
  const adapters: AgentAdapter[] = [new ClaudeCodeAdapter()];
  const runtimeStore = new RuntimeStore();
  const roleRuntime = new RoleRuntimeManager(runtimeStore);
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
  }, runtimeStore);
  const specExplorer = new SpecExplorerProvider(repository);
  const specFilesProvider = new CurrentSpecFilesProvider(workspaceRoot, getActiveSpec);
  const chatProvider = new AgentChatViewProvider(teamBus, getActiveSpec, adapters, runtimeStore, roleRuntime, workspaceRoot);
  const teamChatProvider = new TeamChatroomViewProvider(teamBus, getActiveSpec, chatProvider);
  const adapterStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  chatProvider.setTeamMessagesChangedHandler(() => teamChatProvider.refresh());
  const refreshAdapterStatus = async (): Promise<void> => {
    await updateAdapterStatusBar(adapterStatusBar, adapters);
  };
  void refreshAdapterStatus();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("rkFlow.specExplorer", specExplorer),
    vscode.window.registerTreeDataProvider("rkFlow.currentSpecFiles", specFilesProvider),
    vscode.window.registerWebviewViewProvider(AgentChatViewProvider.viewType, chatProvider),
    vscode.window.registerWebviewViewProvider(TeamChatroomViewProvider.viewType, teamChatProvider),
    adapterStatusBar,
    vscode.commands.registerCommand("rkFlow.createSpec", async () => {
      let created: CreatedSpec | undefined;
      try {
        created = await promptAndCreateSpec(workspaceRoot, gitBinding);
      } catch (error) {
        await vscode.window.showErrorMessage(`Failed to create Spec: ${String(error)}`);
        return;
      }
      if (!created) {
        return;
      }

      specExplorer.refresh();
      activeSpec = await repository.findById(created.specDir) ?? createdSpecToBinding(created);
      await runtimeStore.ensureRuntime(activeSpec);
      specFilesProvider.refresh();
      await chatProvider.refresh();
      await teamChatProvider.refresh();
      await vscode.window.showInformationMessage(`Created Spec: ${created.title}`);
      await openAgentTeamCanvas(context, activeSpec, gitBinding, teamBus, chatProvider, teamChatProvider);
    }),
    vscode.commands.registerCommand("rkFlow.openAgentTeamCanvas", async (spec?: SpecBinding) => {
      activeSpec = spec ?? await getActiveSpec();
      if (!activeSpec) {
        await vscode.window.showWarningMessage("No Spec found under spec/.");
        return;
      }

      if (activeSpec.lifecycle !== "archived") {
        await runtimeStore.ensureRuntime(activeSpec);
      }
      specFilesProvider.refresh();
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

      await runtimeStore.ensureRuntime(spec);
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
    vscode.commands.registerCommand("rkFlow.showAdapterStatus", async () => {
      await showAdapterStatus(adapters);
      await refreshAdapterStatus();
    }),
    vscode.commands.registerCommand("rkFlow.refresh", () => {
      specExplorer.refresh();
      specFilesProvider.refresh();
      void chatProvider.refresh();
      void teamChatProvider.refresh();
      void refreshAdapterStatus();
    })
  );
}

export function deactivate(): void {
  return;
}

async function promptAndCreateSpec(
  workspaceRoot: vscode.Uri,
  gitBinding: GitBindingManager
): Promise<CreatedSpec | undefined> {
  const title = await vscode.window.showInputBox({
    title: "Create Spec",
    prompt: "Spec title",
    placeHolder: "用户权限管理优化",
    validateInput: validateSpecTitle
  });
  if (!title?.trim()) {
    return undefined;
  }

  const categoryPick = await vscode.window.showQuickPick(
    specCategories.map(category => ({ label: category })),
    { title: "Create Spec", placeHolder: "Select Spec directory", canPickMany: false }
  );
  if (!categoryPick) {
    return undefined;
  }

  const now = new Date();
  const id = createSpecId(now);
  const currentBranch = await safeCurrentBranch(gitBinding);
  const baseBranch = await safeDefaultBaseBranch(gitBinding);
  const suggestedBranch = createSpecBranchName(id, title);
  const gitAction = await vscode.window.showQuickPick([
    {
      label: `Create and checkout ${suggestedBranch}`,
      description: "recommended",
      action: "create" as const
    },
    {
      label: `Bind current branch ${currentBranch || "unknown"}`,
      description: "no branch switch",
      action: "bind-current" as const
    },
    {
      label: "Do not bind a Git branch",
      description: "Spec metadata keeps git_branch empty",
      action: "none" as const
    }
  ], { title: "Create Spec", placeHolder: "Select Git binding strategy", canPickMany: false });
  if (!gitAction) {
    return undefined;
  }

  let gitBranch = "";
  let specBaseBranch = "";
  if (gitAction.action === "create") {
    await gitBinding.createAndCheckoutBranch(suggestedBranch, baseBranch);
    gitBranch = suggestedBranch;
    specBaseBranch = baseBranch;
  } else if (gitAction.action === "bind-current") {
    gitBranch = currentBranch;
    specBaseBranch = baseBranch;
  }

  return createSpec({
    workspaceRootFsPath: workspaceRoot.fsPath,
    title,
    category: categoryPick.label,
    gitBranch,
    baseBranch: specBaseBranch,
    now
  });
}

function createdSpecToBinding(created: CreatedSpec): SpecBinding {
  return {
    id: created.id,
    title: created.title,
    category: created.category,
    lifecycle: "active",
    health: "incomplete",
    missingFiles: ["summary.md"],
    status: "草稿",
    phase: "草稿",
    specDir: created.specDir,
    specDirFsPath: created.specDirFsPath,
    planPathFsPath: created.planPathFsPath,
    gitBranch: created.gitBranch,
    baseBranch: created.baseBranch
  };
}

async function openAgentTeamCanvas(
  _context: vscode.ExtensionContext,
  spec: SpecBinding,
  gitBinding: GitBindingManager,
  teamBus: TeamBus,
  chatProvider: AgentChatViewProvider,
  teamChatProvider: TeamChatroomViewProvider
): Promise<void> {
  const panelKey = canvasPanelKey(spec);
  const existingPanel = agentTeamCanvasPanels.get(panelKey);
  if (existingPanel) {
    existingPanel.reveal(vscode.ViewColumn.One);
    existingPanel.webview.postMessage({
      type: "branch",
      branch: await safeCurrentBranch(gitBinding)
    });
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "rkFlow.agentTeamCanvas",
    "AgentTeam.canvas",
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  agentTeamCanvasPanels.set(panelKey, panel);
  panel.onDidDispose(() => {
    agentTeamCanvasPanels.delete(panelKey);
  });

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
      if (spec.lifecycle === "archived") {
        await vscode.window.showWarningMessage("Archived Spec is read-only.");
        panel.webview.postMessage({ type: "readonly", reason: "archived" });
        return;
      }
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

export function canvasPanelKey(spec: Pick<SpecBinding, "specDir">): string {
  return spec.specDir;
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

async function safeDefaultBaseBranch(gitBinding: GitBindingManager): Promise<string> {
  try {
    return await gitBinding.defaultBaseBranch();
  } catch {
    return "";
  }
}

async function updateAdapterStatusBar(statusBar: vscode.StatusBarItem, adapters: AgentAdapter[]): Promise<void> {
  const statuses = await detectAdapterStatuses(adapters);
  const claudeCode = statuses.find(status => status.engine === "claude-code");
  const available = claudeCode?.available === true;
  statusBar.text = `${available ? "$(check)" : "$(warning)"} Claude Code`;
  statusBar.command = "rkFlow.showAdapterStatus";
  statusBar.tooltip = [
    "R&K Flow Adapter Status",
    "",
    ...statuses.map(status => `${status.available ? "OK" : "MISSING"} ${status.engine}: ${status.available ? "available" : "missing"}`),
    "OK vscode-terminal: native bridge"
  ].join("\n");
  statusBar.show();
}

async function showAdapterStatus(adapters: AgentAdapter[]): Promise<void> {
  const statuses = await detectAdapterStatuses(adapters);
  await vscode.window.showQuickPick([
    ...statuses.map(status => ({
      label: `${status.available ? "$(check)" : "$(warning)"} ${status.engine}`,
      description: status.available ? "available" : "missing"
    })),
    {
      label: "$(terminal) vscode-terminal",
      description: "native bridge"
    }
  ], { title: "R&K Flow Adapter Status", canPickMany: false });
}

async function detectAdapterStatuses(adapters: AgentAdapter[]): Promise<Array<{ engine: AgentEngine; available: boolean }>> {
  return Promise.all(adapters.map(async adapter => ({
    engine: adapter.engine,
    available: await adapter.detect()
  })));
}

interface RoleDefinition {
  role: AgentRole;
  responsibility: string;
  skillName: string;
  skillUsage: string;
}

const roleDefinitions: Record<AgentRole, RoleDefinition> = {
  TeamLead: {
    role: "TeamLead",
    responsibility: "Coordinate the current Spec, keep phase boundaries clear, and route specialist work to the correct AgentRole.",
    skillName: "spec-start",
    skillUsage: "Use only when starting a new Spec or AgentTeam workflow. For an existing Spec, coordinate and route work via TeamBus instead of doing specialist work directly."
  },
  "spec-explorer": {
    role: "spec-explorer",
    responsibility: "Explore repository context, historical Spec records, constraints, and unknowns before design or implementation.",
    skillName: "spec-explore",
    skillUsage: "Use when collecting background, reading code, searching historical experience, or preparing exploration reports."
  },
  "spec-writer": {
    role: "spec-writer",
    responsibility: "Write the technical plan, data contracts, implementation steps, acceptance criteria, and related design documents.",
    skillName: "spec-write",
    skillUsage: "Use when creating or revising plan.md and design-level implementation guidance."
  },
  "spec-executor": {
    role: "spec-executor",
    responsibility: "Implement the approved plan strictly within scope and produce implementation summary artifacts.",
    skillName: "spec-execute",
    skillUsage: "Use when executing an approved plan.md and making scoped code changes."
  },
  "spec-tester": {
    role: "spec-tester",
    responsibility: "Design and execute tests, preserve audit logs, verify behavior, and report defects with reproducible evidence.",
    skillName: "spec-test",
    skillUsage: "Use when writing test plans, running automated or end-side tests, and producing test reports."
  },
  "spec-debugger": {
    role: "spec-debugger",
    responsibility: "Diagnose verified defects, identify root cause, create debug documents, and apply focused fixes.",
    skillName: "spec-debug",
    skillUsage: "Use when debugging implementation or runtime issues discovered during Spec execution or testing."
  },
  "spec-ender": {
    role: "spec-ender",
    responsibility: "Close the Spec, reflect reusable experience, update summary context, archive, and prepare Git submission.",
    skillName: "spec-end",
    skillUsage: "Use when the Spec is ready for closure, reflection, archive, and final Git workflow."
  }
};

export function roleDefinitionFor(role: AgentRole): RoleDefinition {
  return roleDefinitions[role];
}

function roleSkillRoutingTable(): string[] {
  return agentRoles.map(role => {
    const definition = roleDefinitionFor(role);
    return `- ${role} -> $${definition.skillName}: ${definition.skillUsage}`;
  });
}

export function renderCanvasHtml(spec: SpecBinding, currentBranch: string): string {
  const agents: Array<{ role: AgentRole; engine: string; x: number; y: number }> = [
    { role: "TeamLead", engine: "Claude Code", x: 92, y: 78 },
    { role: "spec-explorer", engine: "Claude Code", x: 326, y: 68 },
    { role: "spec-writer", engine: "Claude Code", x: 558, y: 92 },
    { role: "spec-executor", engine: "Claude Code", x: 330, y: 246 },
    { role: "spec-tester", engine: "Claude Code", x: 582, y: 286 },
    { role: "spec-debugger", engine: "Claude Code", x: 114, y: 282 },
    { role: "spec-ender", engine: "Claude Code", x: 374, y: 424 }
  ];
  const isArchived = spec.lifecycle === "archived";
  const roleConfigs = Object.fromEntries(agents.map(agent => [agent.role, {
    backend: agent.engine,
    model: "Default model",
    skillName: roleDefinitionFor(agent.role).skillName,
    prompt: roleSystemPrompt(agent.role)
  }]));
  const roleConfigsJson = JSON.stringify(roleConfigs).replace(/</g, "\\u003c");
  const healthLabel = spec.health === "complete"
    ? "complete"
    : `incomplete · missing ${spec.missingFiles.join(", ") || "core files"}`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: dark; --bg:#1e1e1e; --panel:#252526; --line:#3c3c3c; --text:#d4d4d4; --muted:#8f8f8f; --accent:#4cc2ff; --green:#53c285; --gold:#d7b46a; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 13px/1.45 "Segoe UI", sans-serif; overflow: hidden; }
    header { height: 42px; display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--line); background: #181818; }
    h1 { margin: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button { color: var(--text); background: #2d2d2d; border: 1px solid var(--line); border-radius: 4px; padding: 5px 8px; font: inherit; cursor: pointer; }
    button:disabled, select:disabled, textarea:disabled { opacity: .56; cursor: default; }
    select, textarea { width: 100%; color: var(--text); background: #2d2d2d; border: 1px solid var(--line); border-radius: 4px; padding: 6px 7px; font: inherit; }
    textarea { min-height: 96px; resize: vertical; }
    /* 修复: debug-001.md - Role config belongs to a fixed inspector, not a canvas overlay. */
    /* 修复: debug-002.md - Inspector opens only after selecting a role. */
    .workspace { height: calc(100vh - 42px); min-height: 0; display: grid; grid-template-columns: minmax(420px, 1fr); }
    .workspace.inspectorOpen { grid-template-columns: minmax(420px, 1fr) minmax(300px, 360px); }
    .canvasWrap { position: relative; min-width: 0; min-height: 0; overflow: hidden; background-image: linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 28px 28px; }
    .canvas { position: relative; width: 920px; height: 660px; transform-origin: 0 0; }
    .agent { position: absolute; width: 174px; min-height: 82px; padding: 10px; border: 1px solid var(--line); border-radius: 7px; background: #252526; box-shadow: 0 8px 18px rgba(0,0,0,.18); cursor: pointer; user-select: none; }
    .agent:hover, .agent.selected { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(76,194,255,.28), 0 8px 18px rgba(0,0,0,.18); }
    .agent strong { display: block; font-size: 13px; }
    .agent span { color: var(--muted); font-size: 12px; }
    .agent small { display: inline-block; margin-top: 8px; color: var(--accent); }
    .inspector { min-width: 0; min-height: 0; overflow: auto; border-left: 1px solid var(--line); background: #181818; display: none; }
    .workspace.inspectorOpen .inspector { display: block; }
    .inspectorHeader { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .closeInspector { width: 28px; height: 28px; padding: 0; color: var(--muted); flex: none; }
    .info, .roleConfig { padding: 12px; border-bottom: 1px solid var(--line); background: #1d1d1d; }
    .configGrid { display: grid; gap: 8px; margin-top: 8px; }
    .readonlyField { min-height: 30px; display: flex; align-items: center; padding: 6px 7px; border: 1px solid var(--line); border-radius: 4px; background: #232323; color: var(--text); }
    .badge { display: inline-flex; width: max-content; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 999px; border: 1px solid var(--line); color: var(--muted); background: #171717; font-size: 11px; }
    .badge.editable { color: var(--green); }
    .badge.readonly { color: var(--gold); }
    .nodeMode { float: right; color: var(--muted); font-size: 11px; }
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
  </header>
  <main class="workspace" id="workspace">
    <section class="canvasWrap" id="canvasWrap">
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
          <span class="nodeMode">${isArchived ? "RO" : "LIVE"}</span>
          <strong>${escapeHtml(agent.role)}</strong>
          <span>${escapeHtml(agent.engine)}</span>
          <small>${agent.role === "TeamLead" ? "phase gate" : "agent role"}</small>
        </article>`).join("")}
      </div>
    </section>
    <aside class="inspector">
      <section class="info">
        <div class="label">Spec</div>
        <div class="mono">${escapeHtml(spec.specDir)}</div>
        <div class="badge ${isArchived ? "readonly" : "editable"}">${escapeHtml(spec.lifecycle)} · ${escapeHtml(healthLabel)}</div>
        <div style="height:8px"></div>
        <div class="label">Git Binding</div>
        <div class="mono">target: ${escapeHtml(spec.gitBranch || "not set")}</div>
        <div class="mono ${currentBranch === spec.gitBranch ? "ok" : "warn"}">current: <span id="currentBranch">${escapeHtml(currentBranch)}</span></div>
      </section>
      <section class="roleConfig">
        <div class="inspectorHeader">
          <div>
            <div class="label">${isArchived ? "Snapshot Role Config" : "Selected Role Config"}</div>
            <h2 id="configRole" style="margin:4px 0 2px;font-size:15px;">TeamLead</h2>
          </div>
          <button id="closeInspector" class="closeInspector" title="Close" aria-label="Close inspector">×</button>
        </div>
        <span class="badge ${isArchived ? "readonly" : "editable"}" id="configMode">${isArchived ? "read-only" : "editable"}</span>
        <div class="configGrid">
          <div>
            <div class="label">Workflow Skill</div>
            <div class="readonlyField" id="roleSkill"></div>
          </div>
          <label>
            <div class="label">Backend</div>
            <select id="roleBackend"${isArchived ? " disabled" : ""}>
              <option>Claude Code</option>
            </select>
          </label>
          <label>
            <div class="label">Model</div>
            <select id="roleModel"${isArchived ? " disabled" : ""}>
              <option>Default model</option>
              <option>Claude Code default</option>
            </select>
          </label>
          <label>
            <div class="label">System Prompt</div>
            <textarea id="rolePrompt"${isArchived ? " disabled" : ""}></textarea>
          </label>
          <button id="saveRoleConfig"${isArchived ? " disabled" : ""}>${isArchived ? "Snapshot Config" : "Save Role Config"}</button>
          <div class="mono" id="configStatus"></div>
        </div>
      </section>
    </aside>
  </main>
  <script>
    const vscode = acquireVsCodeApi();
    const workspace = document.querySelector("#workspace");
    const canvas = document.querySelector("#canvas");
    const wrap = document.querySelector("#canvasWrap");
    const readOnly = ${JSON.stringify(isArchived)};
    const roleConfigs = ${roleConfigsJson};
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
      workspace.classList.add("inspectorOpen");
      document.querySelectorAll('.agent').forEach(node => node.classList.toggle('selected', node.dataset.role === role));
      renderRoleConfig();
      if (notify) {
        vscode.postMessage({ command: "selectAgent", role });
      }
    }

    function closeInspector() {
      workspace.classList.remove("inspectorOpen");
      document.querySelectorAll('.agent').forEach(node => node.classList.remove('selected'));
    }

    function renderRoleConfig() {
      const config = roleConfigs[selectedRole] || roleConfigs.TeamLead;
      document.querySelector("#configRole").textContent = selectedRole;
      document.querySelector("#roleSkill").textContent = "$" + config.skillName;
      document.querySelector("#roleBackend").value = config.backend;
      document.querySelector("#roleModel").value = config.model;
      document.querySelector("#rolePrompt").value = config.prompt;
      document.querySelector("#configStatus").textContent = readOnly ? "Archived Spec snapshot." : "";
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
      scale = Math.max(.72, Math.min(1.45, scale + (event.deltaY > 0 ? -.05 : .05)));
      applyTransform();
    }, { passive: false });

    document.querySelector("#closeInspector").addEventListener("click", closeInspector);
    document.querySelector("#saveRoleConfig").addEventListener("click", () => {
      if (readOnly) return;
      const config = roleConfigs[selectedRole] || {};
      config.backend = document.querySelector("#roleBackend").value;
      config.model = document.querySelector("#roleModel").value;
      config.prompt = document.querySelector("#rolePrompt").value;
      roleConfigs[selectedRole] = config;
      document.querySelector("#configStatus").textContent = "Role config saved for this canvas session.";
    });
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
  </script>
</body>
</html>`;
}

export function roleSystemPrompt(role: AgentRole): string {
  const definition = roleDefinitionFor(role);
  return [
    `Role: ${definition.role}`,
    `Responsibility: ${definition.responsibility}`,
    `Required workflow skill: $${definition.skillName}`,
    `Usage rule: ${definition.skillUsage}`,
    "Use the installed skill by name. Do not hard-code or infer a local skill file path in the prompt.",
    "Before doing role-specific workflow work, activate and follow that Skill. Do not replace the Skill workflow with ad-hoc steps."
  ].join("\n");
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

export function renderTeamChatroomHtml(
  spec: SpecBinding | undefined,
  messages: TeamMessage[],
  deliveries: TeamDeliveryState[] = []
): string {
  const messagesJson = JSON.stringify(messages).replace(/</g, "\\u003c");
  const deliveriesJson = JSON.stringify(deliveries).replace(/</g, "\\u003c");

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
    .delivery { margin-top: 6px; color: var(--muted); font-size: 12px; }
    .delivery strong { color: var(--text); font-weight: 600; }
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
    let deliveries = ${deliveriesJson};
    const messagesEl = document.querySelector("#messages");
    const status = document.querySelector("#status");

    function escapeText(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
    }

    function renderMessages() {
      messagesEl.innerHTML = messages.length
        ? messages
        .map(message => '<div class="message"><b>' + escapeText(message.from) + ' -> ' + escapeText(message.to) + '</b><br>' + escapeText(message.subject) + '<br><span>' + escapeText(message.body) + '</span>' + deliveryHtml(message.id) + '</div>')
        .join('')
        : '<div class="empty">No TeamBus messages yet.</div>';
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function deliveryHtml(messageId) {
      const state = deliveries.filter(delivery => delivery.messageId === messageId);
      if (!state.length) {
        return '<div class="delivery">delivery: <strong>not recorded</strong></div>';
      }
      return '<div class="delivery">delivery: ' + state.map(delivery =>
        '<strong>' + escapeText(delivery.recipient) + '</strong> ' +
        escapeText(delivery.state) +
        (delivery.requiresResponse ? ' · response required' : ' · no response') +
        (delivery.responseMessageId ? ' · response ' + escapeText(delivery.responseMessageId) : '')
      ).join(' · ') + '</div>';
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
      if (event.data.type === "deliveryStates") {
        deliveries = event.data.deliveries || deliveries;
        renderMessages();
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

function isAgentBackend(adapter: AgentAdapter): adapter is AgentBackend {
  return typeof (adapter as Partial<AgentBackend>).invoke === "function";
}

function isTeamMessageType(value: unknown): value is TeamMessageType {
  return typeof value === "string" && ["handoff", "question", "blocker", "review_request", "phase_request", "status"].includes(value);
}

export function shouldRouteTeamMessage(message: TeamMessage): message is TeamMessage & { to: AgentRole } {
  return isAgentRole(message.to) && message.to !== message.from;
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

export function buildRolePrompt(spec: SpecBinding, role: AgentRole, userPrompt: string): string {
  const definition = roleDefinitionFor(role);
  return [
    `You are ${role} in the R&K Flow Spec-driven Agent Team workflow.`,
    `Current Spec: ${spec.title}`,
    `Spec directory: ${spec.specDir}`,
    `Git branch: ${spec.gitBranch}`,
    "",
    "Role workflow contract:",
    `- Responsibility: ${definition.responsibility}`,
    `- Required workflow skill: $${definition.skillName}`,
    `- Usage rule: ${definition.skillUsage}`,
    "- Use the installed skill by name. Do not hard-code or infer a local skill file path in the prompt.",
    "- Before doing role-specific workflow work, activate and follow that Skill if it is not already in context.",
    "- Do not replace the required Skill workflow with ad-hoc steps.",
    "- If the user's request belongs to another AgentRole, do not perform it directly; route it through TeamBus.",
    "",
    "Role-to-skill routing table:",
    ...roleSkillRoutingTable(),
    "",
    "TeamBus protocol:",
    "When you need to communicate with another AgentRole, emit exactly one JSON fenced block with rkFlowTeamMessage.",
    "The extension will persist that block to team-chat.jsonl and audit-log.jsonl. Your current role is always used as from.",
    "Allowed to values: TeamLead, spec-explorer, spec-writer, spec-executor, spec-tester, spec-debugger, spec-ender, all.",
    "Allowed type values: handoff, question, blocker, review_request, phase_request, status.",
    "Every direct TeamBus message to an AgentRole is delivered to and consumed by that role.",
    "Use requiresResponse=true only when the target role must send a TeamBus reply after handling the message.",
    "Use requiresResponse=false when the target role should consume the message without replying on TeamBus.",
    "Avoid protocol blocks for normal user-facing replies.",
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
    message.requiresResponse
      ? `Respond as ${role}. This message requires a TeamBus reply to ${message.from}; emit rkFlowTeamMessage unless there is a hard blocker.`
      : `Respond as ${role}. Consume this message and update your private role context. Do not emit a TeamBus reply unless you discover a new blocker or handoff.`
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
  const blockType = typeof record.type === "string" ? record.type : undefined;
  if (blockType === "tool_use" || blockType === "tool_result" || blockType === "thinking") {
    return "";
  }

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
