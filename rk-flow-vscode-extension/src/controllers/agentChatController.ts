import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import type { AgentAdapter, AgentBackend, AgentEngine, AgentEvent, AgentRole, AgentSession } from "../agentAdapters/types";
import { readableEventText } from "../agentAdapters/eventText";
import { appendJsonLine } from "../audit/jsonlStore";
import { createId, nowIso } from "../common/id";
import { agentRoles, isAgentRole } from "../common/roles";
import { buildRolePrompt, buildTeamBusPrompt } from "../prompts/rolePrompts";
import { renderRoleChatHtml } from "../roleChat/renderRoleChatHtml";
import { mapAgentEventToTimelineItems } from "../roleChat/timelineMapper";
import { appendTimelineItems, readTimelineForRole } from "../roleChat/timelineStore";
import type { RoleTimelineItem } from "../roleChat/timelineTypes";
import { RoleRuntimeManager } from "../runtime/roleRuntime";
import { RuntimeStore } from "../runtime/runtimeStore";
import type { SpecBinding } from "../specs/types";
import { extractTeamMessageRequests, stripTeamMessageBlocks } from "../teamBus/protocol";
import type { TeamBus, TeamMessage } from "../teamBus/types";

interface AgentRunOptions {
  routeDepth?: number;
  sourceTeamMessage?: TeamMessage;
  turnId?: string;
}

interface AgentRunResult {
  body: string;
  teamMessages: TeamMessage[];
}

export class AgentChatViewProvider implements vscode.WebviewViewProvider {
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

function isAgentBackend(adapter: AgentAdapter): adapter is AgentBackend {
  return typeof (adapter as Partial<AgentBackend>).invoke === "function";
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

