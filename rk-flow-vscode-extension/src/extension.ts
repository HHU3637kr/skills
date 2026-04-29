import * as vscode from "vscode";
import { ClaudeCodeAdapter } from "./agentAdapters/cliAdapters";
import type { AgentAdapter } from "./agentAdapters/types";
import { openAgentTeamCanvas, checkoutSpecBranch } from "./commands/agentTeamCanvasCommand";
import { createdSpecToBinding, promptAndCreateSpec } from "./commands/createSpecCommand";
import { agentRoles, isAgentRole } from "./common/roles";
import { AgentChatViewProvider } from "./controllers/agentChatController";
import { updateAdapterStatusBar, showAdapterStatus } from "./controllers/adapterStatus";
import { TeamChatroomViewProvider } from "./controllers/teamChatroomController";
import { GitBindingManager } from "./git/gitBinding";
import { CurrentSpecFilesProvider } from "./providers/currentSpecFilesProvider";
import { SpecExplorerProvider } from "./providers/specExplorerProvider";
import { RoleRuntimeManager } from "./runtime/roleRuntime";
import { RuntimeStore } from "./runtime/runtimeStore";
import { SpecRepository } from "./specs/specRepository";
import type { CreatedSpec } from "./specs/specCreator";
import type { SpecBinding } from "./specs/types";
import { FileTeamBus } from "./teamBus/fileTeamBus";

export { readableEventText } from "./agentAdapters/eventText";
export { canvasPanelKey } from "./commands/agentTeamCanvasCommand";
export { shouldRouteTeamMessage } from "./controllers/agentChatController";
export { buildRolePrompt, roleDefinitionFor } from "./prompts/rolePrompts";
export { renderCanvasHtml } from "./webviews/canvasWebview";
export { renderTeamChatroomHtml } from "./webviews/teamChatroomWebview";

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
    vscode.commands.registerCommand("rkFlow.selectAgentRole", async (role?: unknown) => {
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
