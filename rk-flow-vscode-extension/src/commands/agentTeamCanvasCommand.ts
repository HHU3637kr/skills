import * as vscode from "vscode";
import { isAgentRole } from "../common/roles";
import { GitBindingManager } from "../git/gitBinding";
import type { SpecBinding } from "../specs/types";
import type { TeamBus } from "../teamBus/types";
import { AgentChatViewProvider } from "../controllers/agentChatController";
import { TeamChatroomViewProvider } from "../controllers/teamChatroomController";
import { renderCanvasHtml } from "../webviews/canvasWebview";

const agentTeamCanvasPanels = new Map<string, vscode.WebviewPanel>();

export async function openAgentTeamCanvas(
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

export async function checkoutSpecBranch(gitBinding: GitBindingManager, spec: SpecBinding): Promise<void> {
  try {
    await gitBinding.checkoutBranch(spec.gitBranch);
    await vscode.window.showInformationMessage(`Checked out ${spec.gitBranch}.`);
  } catch (error) {
    await vscode.window.showErrorMessage(`Failed to checkout ${spec.gitBranch}: ${String(error)}`);
  }
}

export async function safeCurrentBranch(gitBinding: GitBindingManager): Promise<string> {
  try {
    return await gitBinding.currentBranch();
  } catch {
    return "unknown";
  }
}

export async function safeDefaultBaseBranch(gitBinding: GitBindingManager): Promise<string> {
  try {
    return await gitBinding.defaultBaseBranch();
  } catch {
    return "";
  }
}

