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
