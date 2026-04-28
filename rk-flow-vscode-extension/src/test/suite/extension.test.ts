import * as assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { readableEventText, renderTeamChatroomHtml } from "../../extension";
import {
  buildClaudeCodeResumeArgs,
  ClaudeCodeAdapter
} from "../../agentAdapters/cliAdapters";
import type { AgentSession } from "../../agentAdapters/types";
import { GitBindingManager } from "../../git/gitBinding";
import { renderSafeMarkdown } from "../../roleChat/markdown";
import { renderRoleChatHtml } from "../../roleChat/renderRoleChatHtml";
import { renderTurnItems } from "../../roleChat/renderers";
import { redactSensitiveText, truncateOutput } from "../../roleChat/sanitize";
import { mapAgentEventToTimelineItems } from "../../roleChat/timelineMapper";
import { appendTimelineItems, readTimelineForRole } from "../../roleChat/timelineStore";
import type { RoleTimelineItem } from "../../roleChat/timelineTypes";
import { createSpec, createSpecBranchName } from "../../specs/specCreator";
import { SpecRepository } from "../../specs/specRepository";
import type { SpecBinding } from "../../specs/types";
import { FileTeamBus } from "../../teamBus/fileTeamBus";
import { extractTeamMessageRequests, stripTeamMessageBlocks } from "../../teamBus/protocol";

suite("R&K Flow extension host", () => {
  test("activates the extension and registers public commands", async () => {
    const extension = vscode.extensions.getExtension("rnking3637.rk-flow-vscode-extension");

    assert.ok(extension, "extension should be discoverable by publisher/name");
    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("rkFlow.createSpec"));
    assert.ok(commands.includes("rkFlow.openAgentTeamCanvas"));
    assert.ok(commands.includes("rkFlow.checkoutSpecBranch"));
    assert.ok(commands.includes("rkFlow.sendTeamMessage"));
    assert.ok(commands.includes("rkFlow.selectAgentRole"));
    assert.ok(commands.includes("rkFlow.showAdapterStatus"));
    assert.ok(commands.includes("rkFlow.refresh"));
  });

  test("contributes Spec Directory, Current Spec Files, Role Chat, and Team Chatroom views", async () => {
    const manifestPath = path.join(workspaceRoot().fsPath, "rk-flow-vscode-extension", "package.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
      contributes: {
        viewsContainers: Record<string, Array<{ id: string }>>;
        views: Record<string, Array<{ id: string; name?: string; type?: string }>>;
        menus: Record<string, Array<{ command: string; when?: string }>>;
      };
    };

    assert.ok(manifest.contributes.viewsContainers.activitybar.some(container => container.id === "rk-flow-agent"));
    assert.ok(manifest.contributes.viewsContainers.panel.some(container => container.id === "rk-flow-team"));
    assert.strictEqual(
      manifest.contributes.views["rk-flow"].find(view => view.id === "rkFlow.specExplorer")?.name,
      "Spec Directory"
    );
    assert.ok(manifest.contributes.views["rk-flow"].some(view => view.id === "rkFlow.currentSpecFiles"));
    assert.ok(!manifest.contributes.views["rk-flow"].some(view => view.id === "rkFlow.agentAdapters"));
    assert.ok(manifest.contributes.views["rk-flow-agent"].some(view => view.id === "rkFlow.agentChat"));
    assert.ok(manifest.contributes.views["rk-flow-team"].some(view => view.id === "rkFlow.teamChatroom"));
    assert.ok(manifest.contributes.menus["view/title"].some(item => item.command === "rkFlow.createSpec" && item.when === "view == rkFlow.specExplorer"));
    assert.strictEqual(
      manifest.contributes.views["rk-flow-agent"].find(view => view.id === "rkFlow.agentChat")?.type,
      "webview"
    );
    assert.strictEqual(
      manifest.contributes.views["rk-flow-team"].find(view => view.id === "rkFlow.teamChatroom")?.type,
      "webview"
    );
  });

  test("creates a full Spec scaffold for Create Spec", async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "rk-flow-create-spec-"));
    const created = await createSpec({
      workspaceRootFsPath: workspace,
      title: "CreateSpec入口",
      category: "02-技术设计",
      gitBranch: "feat/spec-20260428-1825-createspec",
      baseBranch: "master",
      now: new Date(2026, 3, 28, 18, 25)
    });

    assert.strictEqual(created.id, "20260428-1825");
    assert.ok(created.specDir.endsWith("spec/02-技术设计/20260428-1825-CreateSpec入口"));
    assert.strictEqual(createSpecBranchName(created.id, created.title), "feat/spec-20260428-1825-createspec");

    const expectedFiles = [
      "README.md",
      "plan.md",
      "test-plan.md",
      "team-context.md",
      "AgentTeam.canvas",
      "team-chat.jsonl",
      "agent-chat.jsonl",
      "agent-timeline.jsonl",
      "audit-log.jsonl"
    ];
    for (const fileName of expectedFiles) {
      await fs.stat(path.join(created.specDirFsPath, fileName));
    }

    const plan = await fs.readFile(created.planPathFsPath, "utf8");
    assert.ok(plan.includes("title: CreateSpec入口"));
    assert.ok(plan.includes("git_branch: feat/spec-20260428-1825-createspec"));
  });

  test("creates stable ASCII branch names for Chinese-only Spec titles", () => {
    const first = createSpecBranchName("20260428-1830", "用户权限管理优化");
    const second = createSpecBranchName("20260428-1830", "用户权限管理优化");

    assert.strictEqual(first, second);
    assert.match(first, /^feat\/spec-20260428-1830-spec-[a-z0-9]+$/);
  });

  test("discovers the active Spec and reads Git branch binding", async () => {
    const repository = new SpecRepository(workspaceRoot());
    const spec = await currentSpec(repository);

    assert.strictEqual(spec.id, "20260428-1335");
    assert.strictEqual(spec.gitBranch, "feat/spec-20260428-1335-rk-flow-vscode-extension");
    assert.ok(spec.planPathFsPath.endsWith("plan.md"));
  });

  test("opens the AgentTeam Canvas command without throwing", async () => {
    const repository = new SpecRepository(workspaceRoot());
    const spec = await currentSpec(repository);

    await vscode.commands.executeCommand("rkFlow.openAgentTeamCanvas", spec);
  });

  test("selects an Agent role from Canvas or command routing", async () => {
    await vscode.commands.executeCommand("rkFlow.selectAgentRole", "spec-executor");
  });

  test("reads current Git branch through the binding manager", async () => {
    const gitBinding = new GitBindingManager(workspaceRoot().fsPath);
    const branch = await gitBinding.currentBranch();

    assert.strictEqual(branch, "feat/spec-20260428-1335-rk-flow-vscode-extension");
  });

  test("persists Team Bus messages and audit logs inside the Spec directory", async () => {
    const repository = new SpecRepository(workspaceRoot());
    const spec = await currentSpec(repository);
    const bus = new FileTeamBus(async specId => specId === spec.id ? spec.specDirFsPath : undefined);

    const message = await bus.sendMessage({
      specId: spec.id,
      from: "spec-tester",
      to: "TeamLead",
      type: "status",
      subject: "Extension Host test ping",
      body: "Team Bus persistence verified by VS Code extension integration test.",
      artifacts: [spec.planPathFsPath],
      requiresResponse: false
    });

    const teamChat = await fs.readFile(path.join(spec.specDirFsPath, "team-chat.jsonl"), "utf8");
    const auditLog = await fs.readFile(path.join(spec.specDirFsPath, "audit-log.jsonl"), "utf8");

    assert.ok(teamChat.includes(message.id));
    assert.ok(auditLog.includes(message.id));
  });

  test("persists targeted AgentRole Team Bus messages", async () => {
    const repository = new SpecRepository(workspaceRoot());
    const spec = await currentSpec(repository);
    const bus = new FileTeamBus(async specId => specId === spec.id ? spec.specDirFsPath : undefined);

    const message = await bus.sendMessage({
      specId: spec.id,
      from: "spec-tester",
      to: "spec-debugger",
      type: "blocker",
      subject: "Targeted route test",
      body: "Verify target role can read the routed TeamBus message.",
      artifacts: [spec.planPathFsPath],
      requiresResponse: true
    });

    const targetMessages = await bus.readMessages(spec.id, "spec-debugger");
    const senderMessages = await bus.readMessages(spec.id, "spec-tester");

    assert.ok(targetMessages.some(candidate => candidate.id === message.id));
    assert.ok(senderMessages.some(candidate => candidate.id === message.id));
  });

  test("detects local Claude Code adapter availability", async () => {
    const claudeAvailable = await new ClaudeCodeAdapter().detect();

    assert.strictEqual(typeof claudeAvailable, "boolean");
    assert.ok(claudeAvailable, "claude CLI should be available on this machine");
  });

  test("builds resumable CLI arguments for private Role sessions", () => {
    const session = testSession();

    assert.deepStrictEqual(buildClaudeCodeResumeArgs(session, "继续"), [
      "--print",
      "--output-format",
      "stream-json",
      "--verbose",
      "--resume",
      session.id,
      "继续"
    ]);
  });

  test("suppresses Claude Code result aggregate text to avoid duplicate Role Chat bubbles", () => {
    const assistantText = "你好，我是 TeamLead。";

    assert.strictEqual(readableEventText({
      id: "event-assistant",
      sessionId: "session-1",
      role: "TeamLead",
      type: "message",
      timestamp: "2026-04-28T00:00:00.000Z",
      payload: {
        type: "assistant",
        message: {
          content: [{ type: "text", text: assistantText }]
        }
      }
    }), assistantText);

    assert.strictEqual(readableEventText({
      id: "event-result",
      sessionId: "session-1",
      role: "TeamLead",
      type: "message",
      timestamp: "2026-04-28T00:00:00.000Z",
      payload: {
        type: "result",
        result: assistantText
      }
    }), "");

    assert.strictEqual(readableEventText({
      id: "event-tool-result",
      sessionId: "session-1",
      role: "TeamLead",
      type: "message",
      timestamp: "2026-04-28T00:00:00.000Z",
      payload: {
        type: "user",
        message: {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "toolu-1", content: "stdout should not become assistant text" }]
        }
      }
    }), "");
  });

  test("parses and strips Agent TeamBus protocol blocks", () => {
    const response = [
      "I found a blocker.",
      "```json",
      JSON.stringify({
        rkFlowTeamMessage: {
          to: "spec-debugger",
          type: "blocker",
          subject: "Canvas click failure",
          body: "The webview click handler did not fire.",
          artifacts: ["logs/extension-host.log"],
          requiresResponse: true
        }
      }, null, 2),
      "```",
      "I will wait for debugging."
    ].join("\n");

    const [request] = extractTeamMessageRequests(response);

    assert.strictEqual(request.to, "spec-debugger");
    assert.strictEqual(request.type, "blocker");
    assert.strictEqual(request.requiresResponse, true);
    assert.deepStrictEqual(request.artifacts, ["logs/extension-host.log"]);
    assert.strictEqual(stripTeamMessageBlocks(response), "I found a blocker.\nI will wait for debugging.");
  });

  test("maps Claude Code stream events into Role Timeline items", () => {
    const spec = testSpec(path.join(os.tmpdir(), "rk-flow-timeline-map"));
    const turnId = "turn-1";
    const sessionId = "11111111-1111-4111-8111-111111111111";

    const initItems = mapAgentEventToTimelineItems({
      spec,
      role: "TeamLead",
      turnId,
      sessionId,
      event: {
        id: "event-init",
        sessionId,
        role: "TeamLead",
        type: "message",
        timestamp: "2026-04-28T00:00:00.000Z",
        payload: { type: "system", subtype: "init", session_id: sessionId, model: "claude" }
      }
    });
    assert.strictEqual(initItems[0].type, "system_status");

    const resultItems = mapAgentEventToTimelineItems({
      spec,
      role: "TeamLead",
      turnId,
      sessionId,
      event: {
        id: "event-result",
        sessionId,
        role: "TeamLead",
        type: "message",
        timestamp: "2026-04-28T00:00:00.000Z",
        payload: { type: "result", result: "duplicate aggregate text" }
      }
    });
    assert.deepStrictEqual(resultItems, []);

    const toolItems = mapAgentEventToTimelineItems({
      spec,
      role: "TeamLead",
      turnId,
      sessionId,
      event: {
        id: "event-tool",
        sessionId,
        role: "TeamLead",
        type: "message",
        timestamp: "2026-04-28T00:00:00.000Z",
        payload: {
          type: "assistant",
          message: {
            content: [
              { type: "tool_use", name: "Bash", input: { command: "npm test" } },
              { type: "tool_use", id: "toolu-extra", name: "Read", input: { file_path: "README.md" } },
              { type: "text", text: "Running tests." }
            ]
          }
        }
      }
    });
    assert.ok(toolItems.some(item => item.type === "tool_call"));
    assert.ok(toolItems.some(item => item.type === "assistant_message"));

    const toolResultItems = mapAgentEventToTimelineItems({
      spec,
      role: "TeamLead",
      turnId,
      sessionId,
      event: {
        id: "event-tool-result",
        sessionId,
        role: "TeamLead",
        type: "message",
        timestamp: "2026-04-28T00:00:00.000Z",
        payload: {
          type: "user",
          message: {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: "toolu-extra",
                content: "README.md contents",
                is_error: false
              }
            ]
          }
        }
      }
    });
    assert.strictEqual(toolResultItems.filter(item => item.type === "tool_result").length, 1);
    assert.strictEqual(toolResultItems.some(item => item.type === "assistant_message"), false);
    const toolResult = toolResultItems.find(item => item.type === "tool_result");
    assert.ok(toolResult && toolResult.toolUseId === "toolu-extra");
  });

  test("maps TeamBus protocol blocks without exposing raw JSON as assistant text", () => {
    const spec = testSpec(path.join(os.tmpdir(), "rk-flow-timeline-team"));
    const response = [
      "I will ask tester.",
      "```json",
      JSON.stringify({
        rkFlowTeamMessage: {
          to: "spec-tester",
          type: "handoff",
          subject: "Validate timeline",
          body: "Please test the Role Timeline UI.",
          artifacts: ["agent-timeline.jsonl"],
          requiresResponse: false
        }
      }),
      "```"
    ].join("\n");

    const items = mapAgentEventToTimelineItems({
      spec,
      role: "TeamLead",
      turnId: "turn-team",
      sessionId: "session-team",
      event: {
        id: "event-team",
        sessionId: "session-team",
        role: "TeamLead",
        type: "message",
        timestamp: "2026-04-28T00:00:00.000Z",
        payload: { type: "assistant", message: { content: [{ type: "text", text: response }] } }
      }
    });

    const assistant = items.find(item => item.type === "assistant_message");
    const team = items.find(item => item.type === "team_bus");
    assert.ok(assistant && !assistant.body.includes("rkFlowTeamMessage"));
    assert.ok(team && team.subject === "Validate timeline");
  });

  test("renders markdown safely and redacts long tool output", () => {
    const html = renderSafeMarkdown("Hello **world**\n\n<script>alert(1)</script>\n\n```ts\nconst x = 1;\n```");
    assert.ok(html.includes("<strong>world</strong>"));
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(!html.includes("<script>"));

    const redacted = redactSensitiveText("Authorization: Bearer abc.def\nOPENAI_API_KEY=sk-12345678901234567890");
    assert.ok(redacted.includes("Authorization: Bearer [REDACTED]"));
    assert.ok(!redacted.includes("sk-12345678901234567890"));

    const truncated = truncateOutput(Array.from({ length: 130 }, (_, index) => `line ${index}`).join("\n"), 12, 1024);
    assert.strictEqual(truncated.truncated, true);
    assert.ok(truncated.text.includes("[truncated:"));
  });

  test("persists Role Timeline JSONL and falls back to old private chat history", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rk-flow-timeline-store-"));
    const spec = testSpec(dir);
    const item: RoleTimelineItem = {
      id: "timeline-1",
      specId: spec.id,
      role: "TeamLead",
      turnId: "turn-1",
      type: "assistant_message",
      timestamp: "2026-04-28T00:00:00.000Z",
      source: "agent",
      body: "Hello",
      format: "markdown",
      final: true
    };

    await appendTimelineItems(spec, [item]);
    assert.deepStrictEqual(await readTimelineForRole(spec, "TeamLead"), [item]);
    assert.deepStrictEqual(await readTimelineForRole(spec, "spec-tester"), []);

    const legacyDir = await fs.mkdtemp(path.join(os.tmpdir(), "rk-flow-legacy-chat-"));
    const legacySpec = testSpec(legacyDir);
    await fs.writeFile(path.join(legacyDir, "agent-chat.jsonl"), [
      JSON.stringify({
        id: "role-chat-user",
        specId: legacySpec.id,
        from: "user",
        to: "spec-tester",
        direction: "user_to_agent",
        body: "请测试",
        model: "default",
        artifacts: [],
        isError: false,
        timestamp: "2026-04-28T00:00:00.000Z"
      }),
      JSON.stringify({
        id: "role-chat-agent",
        specId: legacySpec.id,
        from: "spec-tester",
        to: "user",
        direction: "agent_to_user",
        body: "测试完成",
        model: "default",
        artifacts: [],
        isError: false,
        timestamp: "2026-04-28T00:00:01.000Z"
      })
    ].join("\n"), "utf8");

    const fallback = await readTimelineForRole(legacySpec, "spec-tester");
    assert.strictEqual(fallback.length, 2);
    assert.strictEqual(fallback[0].type, "user_message");
    assert.strictEqual(fallback[1].type, "assistant_message");
  });

  test("renders Role Chat timeline controls and structured items", () => {
    const spec = testSpec(path.join(os.tmpdir(), "rk-flow-render"));
    const html = renderRoleChatHtml(spec, "TeamLead", [
      {
        id: "timeline-team",
        specId: spec.id,
        role: "TeamLead",
        turnId: "turn-render",
        type: "team_bus",
        timestamp: "2026-04-28T00:00:00.000Z",
        source: "team_bus",
        to: "spec-tester",
        messageType: "handoff",
        subject: "Run tests",
        body: "Please test.",
        artifacts: ["test-plan.md"],
        requiresResponse: false
      }
    ], {});

    assert.ok(html.includes("data-filter=\"tools\""));
    assert.ok(html.includes("TeamBus"));
    assert.ok(html.includes("Retry"));
    assert.ok(html.includes("Continue"));
    assert.ok(html.includes("composerBox"));
    assert.ok(html.includes("compactSelect"));
    assert.ok(!html.includes("<label for=\"role\">Agent Role</label>"));
    assert.ok(html.includes("command: \"openFile\""));
  });

  test("renders paired tool call and result as one tool card", () => {
    const items: RoleTimelineItem[] = [
      {
        id: "timeline-call",
        specId: "spec",
        role: "TeamLead",
        turnId: "turn",
        type: "tool_call",
        timestamp: "2026-04-28T00:00:00.000Z",
        source: "agent",
        toolUseId: "toolu-1",
        toolName: "Bash",
        title: "Tool call: Bash",
        inputSummary: "npm test",
        rawInput: { command: "npm test" },
        collapsed: true
      },
      {
        id: "timeline-result",
        specId: "spec",
        role: "TeamLead",
        turnId: "turn",
        type: "tool_result",
        timestamp: "2026-04-28T00:00:01.000Z",
        source: "agent",
        toolUseId: "toolu-1",
        toolName: "Bash",
        title: "Tool result: Bash",
        status: "success",
        outputSummary: "18 passing",
        outputPreview: "18 passing",
        collapsed: true
      },
      {
        id: "timeline-duplicate",
        specId: "spec",
        role: "TeamLead",
        turnId: "turn",
        type: "assistant_message",
        timestamp: "2026-04-28T00:00:02.000Z",
        source: "agent",
        body: "18 passing",
        format: "markdown",
        final: false
      }
    ];

    const html = renderTurnItems(items);
    assert.strictEqual((html.match(/<details/g) ?? []).length, 1);
    assert.ok(html.includes("Tool success"));
    assert.ok(html.includes("Input"));
    assert.ok(html.includes("Output"));
    assert.ok(html.includes("18 passing"));
    assert.strictEqual(html.includes("message assistant"), false);
  });

  test("renders Team Chatroom as a read-only TeamBus log", () => {
    const html = renderTeamChatroomHtml(testSpec(path.join(os.tmpdir(), "rk-flow-team-room")), []);

    assert.ok(html.includes("Team Chatroom"));
    assert.ok(html.includes("No TeamBus messages yet."));
    assert.ok(!html.includes("Send TeamBus Message"));
    assert.ok(!html.includes("id=\"composer\""));
  });
});

function workspaceRoot(): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, "test must run with a workspace folder");
  return folder.uri;
}

async function currentSpec(repository: SpecRepository): Promise<SpecBinding> {
  const specs = await repository.listSpecs();
  const spec = specs.find(candidate => candidate.id === "20260428-1335");
  assert.ok(spec, "current Spec should be discovered from spec/**/plan.md");
  return spec;
}

function testSession(): AgentSession {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    role: "TeamLead",
    engine: "claude-code",
    model: "default",
    workspaceUri: workspaceRoot().fsPath,
    specDir: "spec/02-技术设计/20260428-1335-VSCode扩展包AgentTeam编排设计",
    gitBranch: "feat/spec-20260428-1335-rk-flow-vscode-extension",
    createdAt: "2026-04-28T00:00:00.000Z",
    updatedAt: "2026-04-28T00:00:00.000Z"
  };
}

function testSpec(specDirFsPath: string): SpecBinding {
  return {
    id: "20260428-test",
    title: "Timeline Test Spec",
    category: "02-技术设计",
    status: "未确认",
    phase: "draft",
    specDir: "spec/02-技术设计/20260428-test-Timeline",
    specDirFsPath,
    planPathFsPath: path.join(specDirFsPath, "plan.md"),
    gitBranch: "feat/spec-20260428-1335-rk-flow-vscode-extension",
    baseBranch: "master"
  };
}
