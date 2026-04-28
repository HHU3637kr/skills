import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export class GitBindingManager {
  constructor(private readonly workspacePath: string) {}

  async currentBranch(): Promise<string> {
    const output = await this.git(["branch", "--show-current"]);
    return output.trim();
  }

  async checkoutBranch(branch: string): Promise<void> {
    if (!branch) {
      throw new Error("Spec does not define git_branch.");
    }

    await this.git(["switch", branch]);
  }

  async createAndCheckoutBranch(branch: string, baseBranch?: string): Promise<void> {
    if (!branch) {
      throw new Error("Branch name is required.");
    }

    if (await this.branchExists(branch)) {
      await this.checkoutBranch(branch);
      return;
    }

    const args = ["switch", "-c", branch];
    if (baseBranch) {
      args.push(baseBranch);
    }
    await this.git(args);
  }

  async branchExists(branch: string): Promise<boolean> {
    if (!branch) {
      return false;
    }

    try {
      await this.git(["rev-parse", "--verify", branch]);
      return true;
    } catch {
      return false;
    }
  }

  async defaultBaseBranch(): Promise<string> {
    for (const branch of ["main", "master"]) {
      if (await this.branchExists(branch)) {
        return branch;
      }
    }

    return this.currentBranch();
  }

  async statusShort(): Promise<string> {
    return this.git(["status", "--short", "--branch"]);
  }

  private async git(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync("git", ["-C", this.workspacePath, ...args], {
      windowsHide: true
    });

    return stdout.toString();
  }
}
