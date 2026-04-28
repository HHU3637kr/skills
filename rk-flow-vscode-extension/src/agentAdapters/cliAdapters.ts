import { execFileSync, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import * as path from "path";
import * as readline from "readline";
import { createId, nowIso } from "../common/id";
import type { AgentAdapter, AgentEvent, AgentSession } from "./types";

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly engine = "claude-code" as const;

  detect(): Promise<boolean> {
    return commandAvailable("claude", ["--help"]);
  }

  start(session: AgentSession, prompt: string): AsyncIterable<AgentEvent> {
    return runCliAsEvents("claude", buildClaudeCodeStartArgs(session, prompt), session);
  }

  resume(session: AgentSession, prompt: string): AsyncIterable<AgentEvent> {
    return runCliAsEvents("claude", buildClaudeCodeResumeArgs(session, prompt), session);
  }

  async stop(_session: AgentSession): Promise<void> {
    return;
  }
}

export class CodexAdapter implements AgentAdapter {
  readonly engine = "codex-cli" as const;

  detect(): Promise<boolean> {
    return commandAvailable("codex", ["--help"]);
  }

  start(session: AgentSession, prompt: string): AsyncIterable<AgentEvent> {
    return runCliAsEvents("codex", buildCodexStartArgs(session, prompt), session);
  }

  resume(session: AgentSession, prompt: string): AsyncIterable<AgentEvent> {
    return runCliAsEvents("codex", buildCodexResumeArgs(session, prompt), session);
  }

  async stop(_session: AgentSession): Promise<void> {
    return;
  }
}

export function buildClaudeCodeStartArgs(session: AgentSession, prompt: string): string[] {
  return [
    "--print",
    "--output-format",
    "stream-json",
    "--verbose",
    "--session-id",
    session.id,
    prompt
  ];
}

export function buildClaudeCodeResumeArgs(session: AgentSession, prompt: string): string[] {
  return [
    "--print",
    "--output-format",
    "stream-json",
    "--verbose",
    "--resume",
    session.id,
    prompt
  ];
}

export function buildCodexStartArgs(session: AgentSession, prompt: string): string[] {
  return [
    "exec",
    "--json",
    ...codexModelArgs(session),
    "-C",
    session.workspaceUri,
    prompt
  ];
}

export function buildCodexResumeArgs(session: AgentSession, prompt: string): string[] {
  return [
    "exec",
    "resume",
    "--json",
    ...codexModelArgs(session),
    session.id,
    prompt
  ];
}

function codexModelArgs(session: AgentSession): string[] {
  return session.model && session.model !== "default" ? ["--model", session.model] : [];
}

async function commandAvailable(command: string, args: string[]): Promise<boolean> {
  return new Promise(resolve => {
    const invocation = resolveCliInvocation(command, args);
    const child = spawn(invocation.command, invocation.args, { shell: false, windowsHide: true });
    child.once("error", () => resolve(false));
    child.once("exit", code => resolve(code === 0));
  });
}

async function* runCliAsEvents(
  command: string,
  args: string[],
  session: AgentSession
): AsyncIterable<AgentEvent> {
  const invocation = resolveCliInvocation(command, args);
  const child = spawn(invocation.command, invocation.args, {
    cwd: session.workspaceUri,
    shell: false,
    windowsHide: true
  });
  const stderr: string[] = [];
  const lines = readline.createInterface({ input: child.stdout });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => stderr.push(String(chunk)));

  for await (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    yield toAgentEvent(session, line);
  }

  const code = await new Promise<number | null>(resolve => child.once("exit", resolve));
  if (code && code !== 0) {
    yield {
      id: createId("event"),
      sessionId: session.id,
      role: session.role,
      type: "error",
      timestamp: nowIso(),
      payload: stderr.join("").trim() || `${command} exited with code ${code}`
    };
    return;
  }

  yield {
    id: createId("event"),
    sessionId: session.id,
    role: session.role,
    type: "done",
    timestamp: nowIso(),
    payload: { command, code }
  };
}

function resolveCliInvocation(command: string, args: string[]): { command: string; args: string[] } {
  if (process.platform !== "win32") {
    return { command, args };
  }

  const shimPath = findWindowsShim(command);
  if (command === "claude") {
    const shim = readFileSync(shimPath, "utf8");
    const match = /"([^"]*claude\.exe)"/i.exec(shim);
    if (match) {
      return { command: path.resolve(path.dirname(shimPath), match[1].replace("%dp0%\\", "")), args };
    }
  }

  if (command === "codex") {
    const shimDir = path.dirname(shimPath);
    const localNode = path.join(shimDir, "node.exe");
    const nodeCommand = existsSync(localNode) ? localNode : findWindowsExecutable("node.exe");
    const codexScript = path.join(shimDir, "node_modules", "@openai", "codex", "bin", "codex.js");
    return { command: nodeCommand, args: [codexScript, ...args] };
  }

  return { command: shimPath, args };
}

function findWindowsShim(command: string): string {
  return findWindowsExecutable(`${command}.cmd`);
}

function findWindowsExecutable(command: string): string {
  const output = execFileSync("where.exe", [command], { windowsHide: true }).toString();
  const [first] = output.split(/\r?\n/).filter(Boolean);
  if (!first) {
    throw new Error(`Cannot find ${command} on PATH.`);
  }

  return first;
}

function toAgentEvent(session: AgentSession, line: string): AgentEvent {
  try {
    const raw = JSON.parse(line);
    return {
      id: createId("event"),
      sessionId: session.id,
      role: session.role,
      type: inferEventType(raw),
      timestamp: nowIso(),
      payload: raw,
      raw
    };
  } catch {
    return {
      id: createId("event"),
      sessionId: session.id,
      role: session.role,
      type: "message",
      timestamp: nowIso(),
      payload: line
    };
  }
}

function inferEventType(raw: unknown): AgentEvent["type"] {
  if (typeof raw !== "object" || raw === null) {
    return "message";
  }

  const candidate = raw as { type?: string; event?: string };
  const value = candidate.type ?? candidate.event ?? "";

  if (value.includes("tool")) {
    return value.includes("result") ? "tool_result" : "tool_call";
  }
  if (value.includes("error")) {
    return "error";
  }
  if (value.includes("permission")) {
    return "permission_request";
  }
  if (value.includes("done") || value.includes("completed")) {
    return "done";
  }

  return "message";
}
