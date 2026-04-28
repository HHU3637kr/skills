import * as assert from "assert";
import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import {
  buildClaudeCodeResumeArgs,
  ClaudeCodeAdapter
} from "../../agentAdapters/cliAdapters";
import type { AgentSession } from "../../agentAdapters/types";
import { GitBindingManager } from "../../git/gitBinding";
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
    assert.ok(commands.includes("rkFlow.openAgentTeamCanvas"));
    assert.ok(commands.includes("rkFlow.checkoutSpecBranch"));
    assert.ok(commands.includes("rkFlow.sendTeamMessage"));
    assert.ok(commands.includes("rkFlow.selectAgentRole"));
    assert.ok(commands.includes("rkFlow.refresh"));
  });

  test("contributes Role Chat as a side view and Team Chatroom as a panel view", async () => {
    const manifestPath = path.join(workspaceRoot().fsPath, "rk-flow-vscode-extension", "package.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
      contributes: {
        viewsContainers: Record<string, Array<{ id: string }>>;
        views: Record<string, Array<{ id: string; type?: string }>>;
      };
    };

    assert.ok(manifest.contributes.viewsContainers.activitybar.some(container => container.id === "rk-flow-agent"));
    assert.ok(manifest.contributes.viewsContainers.panel.some(container => container.id === "rk-flow-team"));
    assert.ok(manifest.contributes.views["rk-flow-agent"].some(view => view.id === "rkFlow.agentChat"));
    assert.ok(manifest.contributes.views["rk-flow-team"].some(view => view.id === "rkFlow.teamChatroom"));
    assert.strictEqual(
      manifest.contributes.views["rk-flow-agent"].find(view => view.id === "rkFlow.agentChat")?.type,
      "webview"
    );
    assert.strictEqual(
      manifest.contributes.views["rk-flow-team"].find(view => view.id === "rkFlow.teamChatroom")?.type,
      "webview"
    );
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
