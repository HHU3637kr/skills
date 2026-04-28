import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { parseFrontmatter } from "./frontmatter";
import type { SpecBinding } from "./types";

export class SpecRepository {
  constructor(private readonly workspaceRoot: vscode.Uri) {}

  async listSpecs(): Promise<SpecBinding[]> {
    const pattern = new vscode.RelativePattern(this.workspaceRoot, "spec/**/plan.md");
    const planFiles = await vscode.workspace.findFiles(pattern, "**/{node_modules,dist}/**");
    const specs = await Promise.all(planFiles.map(plan => this.readSpec(plan)));

    return specs
      .filter((spec): spec is SpecBinding => Boolean(spec))
      .sort((left, right) => right.id.localeCompare(left.id));
  }

  async findById(specId: string): Promise<SpecBinding | undefined> {
    const specs = await this.listSpecs();
    return specs.find(spec => spec.id === specId || spec.specDir === specId);
  }

  private async readSpec(planUri: vscode.Uri): Promise<SpecBinding | undefined> {
    try {
      const markdown = await fs.readFile(planUri.fsPath, "utf8");
      const frontmatter = parseFrontmatter(markdown);
      const specDirFsPath = path.dirname(planUri.fsPath);
      const specDir = path.relative(this.workspaceRoot.fsPath, specDirFsPath).replace(/\\/g, "/");
      const id = inferSpecId(specDirFsPath);
      const status = frontmatter.status || "未知";

      return {
        id,
        title: frontmatter.title || path.basename(specDirFsPath),
        category: frontmatter.category || path.basename(path.dirname(specDirFsPath)),
        status,
        phase: inferPhase(status),
        specDir,
        specDirFsPath,
        planPathFsPath: planUri.fsPath,
        gitBranch: frontmatter.git_branch || "",
        baseBranch: frontmatter.base_branch || "",
        prUrl: frontmatter.pr_url || undefined
      };
    } catch {
      return undefined;
    }
  }
}

function inferSpecId(specDirFsPath: string): string {
  const name = path.basename(specDirFsPath);
  const match = /^(\d{8}-\d{4})/.exec(name);
  return match?.[1] ?? name;
}

function inferPhase(status: string): string {
  if (status.includes("完成")) {
    return "已完成";
  }
  if (status.includes("执行") || status.includes("实现")) {
    return "实现中";
  }
  if (status.includes("确认")) {
    return "已确认";
  }
  if (status.includes("草稿")) {
    return "草稿";
  }
  return status || "未知";
}
