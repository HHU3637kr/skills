import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import type { SpecBinding } from "../specs/types";

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

export class CurrentSpecFilesProvider implements vscode.TreeDataProvider<SpecFileItem> {
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

