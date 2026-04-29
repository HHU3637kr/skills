import * as vscode from "vscode";
import { SpecRepository } from "../specs/specRepository";
import type { SpecBinding, SpecLifecycle } from "../specs/types";

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

export class SpecExplorerProvider implements vscode.TreeDataProvider<SpecTreeItem> {
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

