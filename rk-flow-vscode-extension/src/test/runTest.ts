import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
  delete process.env.ELECTRON_RUN_AS_NODE;

  const extensionDevelopmentPath = path.resolve(__dirname, "../..");
  const extensionTestsPath = path.resolve(__dirname, "./suite/index");
  const workspacePath = process.env.RK_FLOW_TEST_WORKSPACE || path.resolve(extensionDevelopmentPath, "..");
  const vscodeExecutablePath = process.env.VSCODE_EXECUTABLE_PATH || findInstalledVSCode();

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [
      workspacePath,
      "--disable-workspace-trust",
      "--skip-welcome",
      "--skip-release-notes"
    ],
    ...(vscodeExecutablePath ? { vscodeExecutablePath } : {})
  });
}

function findInstalledVSCode(): string | undefined {
  if (process.platform !== "win32") {
    return undefined;
  }

  try {
    const output = execFileSync("where.exe", ["code.cmd"], { windowsHide: true }).toString();
    const codeCmd = output.split(/\r?\n/).find(Boolean);
    if (!codeCmd) {
      return undefined;
    }

    const candidate = path.join(path.dirname(path.dirname(codeCmd)), "Code.exe");
    return fs.existsSync(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
