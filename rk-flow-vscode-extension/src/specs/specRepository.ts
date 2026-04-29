import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { parseFrontmatter } from "./frontmatter";
import type { SpecBinding, SpecHealth, SpecLifecycle } from "./types";

export class SpecRepository {
  constructor(private readonly workspaceRoot: vscode.Uri) {}

  async listSpecs(): Promise<SpecBinding[]> {
    const specDirs = await this.findSpecDirectories();
    const specs = await Promise.all(specDirs.map(specDir => this.readSpecDirectory(specDir)));

    return specs
      .filter((spec): spec is SpecBinding => Boolean(spec))
      .sort((left, right) => {
        if (left.lifecycle !== right.lifecycle) {
          return left.lifecycle === "active" ? -1 : 1;
        }
        return right.id.localeCompare(left.id);
      });
  }

  async findById(specId: string): Promise<SpecBinding | undefined> {
    const specs = await this.listSpecs();
    return specs.find(spec => spec.id === specId || spec.specDir === specId);
  }

  private async findSpecDirectories(): Promise<string[]> {
    const specRoot = path.join(this.workspaceRoot.fsPath, "spec");
    const categories = await safeReadDir(specRoot);
    const directories: string[] = [];

    for (const category of categories) {
      if (!category.isDirectory() || category.name.startsWith(".")) {
        continue;
      }

      const categoryPath = path.join(specRoot, category.name);
      const entries = await safeReadDir(categoryPath);
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".") || !isSpecDirectoryName(entry.name)) {
          continue;
        }
        directories.push(path.join(categoryPath, entry.name));
      }
    }

    return directories;
  }

  private async readSpecDirectory(specDirFsPath: string): Promise<SpecBinding | undefined> {
    try {
      const specDir = path.relative(this.workspaceRoot.fsPath, specDirFsPath).replace(/\\/g, "/");
      const frontmatter = await readBestFrontmatter(specDirFsPath);
      const id = inferSpecId(specDirFsPath);
      const status = frontmatter.status || "未知";
      const category = frontmatter.category || path.basename(path.dirname(specDirFsPath));
      const lifecycle = inferLifecycle(category, specDir);
      const missingFiles = await missingCoreFiles(specDirFsPath);
      const health: SpecHealth = missingFiles.length === 0 ? "complete" : "incomplete";
      const planPathFsPath = path.join(specDirFsPath, "plan.md");

      return {
        id,
        title: frontmatter.title || inferTitleFromDirectory(specDirFsPath),
        category,
        lifecycle,
        health,
        missingFiles,
        status,
        phase: inferPhase(status),
        specDir,
        specDirFsPath,
        planPathFsPath: await exists(planPathFsPath) ? planPathFsPath : undefined,
        gitBranch: frontmatter.git_branch || "",
        baseBranch: frontmatter.base_branch || "",
        prUrl: frontmatter.pr_url || undefined
      };
    } catch {
      return undefined;
    }
  }
}

async function safeReadDir(dirPath: string): Promise<import("fs").Dirent[]> {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function readBestFrontmatter(specDirFsPath: string): Promise<Record<string, string>> {
  for (const fileName of ["plan.md", "README.md", "team-context.md"]) {
    const filePath = path.join(specDirFsPath, fileName);
    try {
      const markdown = await fs.readFile(filePath, "utf8");
      const frontmatter = parseFrontmatter(markdown);
      if (Object.keys(frontmatter).length > 0) {
        return frontmatter;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  return {};
}

async function missingCoreFiles(specDirFsPath: string): Promise<string[]> {
  const coreFiles = ["plan.md", "test-plan.md", "summary.md"];
  const missing: string[] = [];
  for (const fileName of coreFiles) {
    if (!await exists(path.join(specDirFsPath, fileName))) {
      missing.push(fileName);
    }
  }
  return missing;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function isSpecDirectoryName(name: string): boolean {
  return /^\d{8}(?:-\d{4})?-.+/.test(name);
}

function inferSpecId(specDirFsPath: string): string {
  const name = path.basename(specDirFsPath);
  const match = /^(\d{8}(?:-\d{4})?)/.exec(name);
  return match?.[1] ?? name;
}

function inferTitleFromDirectory(specDirFsPath: string): string {
  return path.basename(specDirFsPath).replace(/^\d{8}(?:-\d{4})?-/, "");
}

function inferLifecycle(category: string, specDir: string): SpecLifecycle {
  return category === "06-已归档" || specDir.includes("/06-已归档/") ? "archived" : "active";
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
