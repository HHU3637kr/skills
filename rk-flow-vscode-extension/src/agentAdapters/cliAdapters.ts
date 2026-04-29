import { execFileSync, spawn } from "child_process";
import type { ChildProcessWithoutNullStreams } from "child_process";
import { readFileSync } from "fs";
import * as path from "path";
import * as readline from "readline";
import { createId, nowIso } from "../common/id";
import type { AgentBackend, AgentEvent, AgentSession, BackendSession, BackendStatus } from "./types";

export class ClaudeCodeAdapter implements AgentBackend {
  readonly engine = "claude-code" as const;
  private readonly activeProcesses = new Map<string, ChildProcessWithoutNullStreams>();

  detect(): Promise<boolean> {
    return commandAvailable("claude", ["--help"]);
  }

  async detectStatus(): Promise<BackendStatus> {
    const available = await this.detect();
    return {
      engine: this.engine,
      available,
      detail: available ? "claude CLI available" : "claude CLI not found or failed"
    };
  }

  async loadSession(session: AgentSession): Promise<BackendSession> {
    return {
      engine: this.engine,
      sessionId: session.id,
      model: session.model,
      status: session.id ? "resumable" : "none"
    };
  }

  start(session: AgentSession, prompt: string, turnId?: string): AsyncIterable<AgentEvent> {
    return runCliAsEvents("claude", buildClaudeCodeStartArgs(session, prompt), session, this.activeProcesses, turnId);
  }

  resume(session: AgentSession, prompt: string, turnId?: string): AsyncIterable<AgentEvent> {
    return runCliAsEvents("claude", buildClaudeCodeResumeArgs(session, prompt), session, this.activeProcesses, turnId);
  }

  invoke(request: { session: AgentSession; prompt: string; resumed: boolean; turnId: string }): AsyncIterable<AgentEvent> {
    return request.resumed
      ? this.resume(request.session, request.prompt, request.turnId)
      : this.start(request.session, request.prompt, request.turnId);
  }

  async cancel(turnId: string): Promise<void> {
    const child = this.activeProcesses.get(turnId);
    if (child && !child.killed) {
      child.kill();
    }
    this.activeProcesses.delete(turnId);
  }

  async stop(session: AgentSession): Promise<void> {
    for (const [turnId, child] of this.activeProcesses.entries()) {
      if (!child.killed && child.spawnargs.includes(session.id)) {
        child.kill();
      }
      this.activeProcesses.delete(turnId);
    }
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

async function commandAvailable(command: string, args: string[]): Promise<boolean> {
  return new Promise(resolve => {
    try {
      const invocation = resolveCliInvocation(command, args);
      const child = spawn(invocation.command, invocation.args, { shell: false, windowsHide: true });
      child.once("error", () => resolve(false));
      child.once("exit", code => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
}

async function* runCliAsEvents(
  command: string,
  args: string[],
  session: AgentSession,
  activeProcesses?: Map<string, ChildProcessWithoutNullStreams>,
  turnId?: string
): AsyncIterable<AgentEvent> {
  const invocation = resolveCliInvocation(command, args);
  const child = spawn(invocation.command, invocation.args, {
    cwd: session.workspaceUri,
    shell: false,
    windowsHide: true
  });
  const processKey = turnId ?? session.id;
  activeProcesses?.set(processKey, child);
  const stderr: string[] = [];
  const lines = readline.createInterface({ input: child.stdout });
  const exitCode = new Promise<number | null>(resolve => child.once("exit", resolve));

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => stderr.push(String(chunk)));

  try {
    for await (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      yield toAgentEvent(session, line);
    }

    const code = await exitCode;
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
  } finally {
    activeProcesses?.delete(processKey);
  }
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
