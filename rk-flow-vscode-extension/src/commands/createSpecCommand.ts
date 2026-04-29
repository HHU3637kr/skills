import * as vscode from "vscode";
import { GitBindingManager } from "../git/gitBinding";
import { createSpec, createSpecBranchName, createSpecId, specCategories, validateSpecTitle } from "../specs/specCreator";
import type { CreatedSpec } from "../specs/specCreator";
import type { SpecBinding } from "../specs/types";
import { safeCurrentBranch, safeDefaultBaseBranch } from "./agentTeamCanvasCommand";

export async function promptAndCreateSpec(
  workspaceRoot: vscode.Uri,
  gitBinding: GitBindingManager
): Promise<CreatedSpec | undefined> {
  const title = await vscode.window.showInputBox({
    title: "Create Spec",
    prompt: "Spec title",
    placeHolder: "用户权限管理优化",
    validateInput: validateSpecTitle
  });
  if (!title?.trim()) {
    return undefined;
  }

  const categoryPick = await vscode.window.showQuickPick(
    specCategories.map(category => ({ label: category })),
    { title: "Create Spec", placeHolder: "Select Spec directory", canPickMany: false }
  );
  if (!categoryPick) {
    return undefined;
  }

  const now = new Date();
  const id = createSpecId(now);
  const currentBranch = await safeCurrentBranch(gitBinding);
  const baseBranch = await safeDefaultBaseBranch(gitBinding);
  const suggestedBranch = createSpecBranchName(id, title);
  const gitAction = await vscode.window.showQuickPick([
    {
      label: `Create and checkout ${suggestedBranch}`,
      description: "recommended",
      action: "create" as const
    },
    {
      label: `Bind current branch ${currentBranch || "unknown"}`,
      description: "no branch switch",
      action: "bind-current" as const
    },
    {
      label: "Do not bind a Git branch",
      description: "Spec metadata keeps git_branch empty",
      action: "none" as const
    }
  ], { title: "Create Spec", placeHolder: "Select Git binding strategy", canPickMany: false });
  if (!gitAction) {
    return undefined;
  }

  let gitBranch = "";
  let specBaseBranch = "";
  if (gitAction.action === "create") {
    await gitBinding.createAndCheckoutBranch(suggestedBranch, baseBranch);
    gitBranch = suggestedBranch;
    specBaseBranch = baseBranch;
  } else if (gitAction.action === "bind-current") {
    gitBranch = currentBranch;
    specBaseBranch = baseBranch;
  }

  return createSpec({
    workspaceRootFsPath: workspaceRoot.fsPath,
    title,
    category: categoryPick.label,
    gitBranch,
    baseBranch: specBaseBranch,
    now
  });
}

export function createdSpecToBinding(created: CreatedSpec): SpecBinding {
  return {
    id: created.id,
    title: created.title,
    category: created.category,
    lifecycle: "active",
    health: "incomplete",
    missingFiles: ["summary.md"],
    status: "草稿",
    phase: "草稿",
    specDir: created.specDir,
    specDirFsPath: created.specDirFsPath,
    planPathFsPath: created.planPathFsPath,
    gitBranch: created.gitBranch,
    baseBranch: created.baseBranch
  };
}

