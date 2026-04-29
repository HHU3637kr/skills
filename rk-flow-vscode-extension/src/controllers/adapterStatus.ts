import * as vscode from "vscode";
import type { AgentAdapter, AgentEngine } from "../agentAdapters/types";

export async function updateAdapterStatusBar(statusBar: vscode.StatusBarItem, adapters: AgentAdapter[]): Promise<void> {
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

export async function showAdapterStatus(adapters: AgentAdapter[]): Promise<void> {
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

