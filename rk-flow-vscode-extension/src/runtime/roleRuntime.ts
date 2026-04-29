import type { AgentRole } from "../agentAdapters/types";
import type { SpecBinding } from "../specs/types";
import { RuntimeStore } from "./runtimeStore";
import type { SpecRuntimeDocument } from "./types";

export class RoleRuntimeManager {
  private readonly running = new Set<string>();

  constructor(private readonly store: RuntimeStore) {}

  async beginRun(spec: SpecBinding, role: AgentRole, turnId: string): Promise<SpecRuntimeDocument> {
    const key = runtimeKey(spec, role);
    if (this.running.has(key)) {
      throw new Error(`${role} is already running.`);
    }

    const existing = await this.store.readRuntime(spec);
    const runtime = await this.store.ensureRuntime(spec, existing?.activeRole ?? role);
    if (runtime.roles[role].lifecycle === "archived") {
      throw new Error(`${role} is archived and cannot run new tasks.`);
    }

    this.running.add(key);
    return this.store.updateRole(spec, role, {
      activity: "running",
      backend: "running",
      currentTaskId: turnId,
      lastError: undefined
    });
  }

  async completeRun(spec: SpecBinding, role: AgentRole, sessionId?: string): Promise<SpecRuntimeDocument> {
    this.running.delete(runtimeKey(spec, role));
    return this.store.updateRole(spec, role, {
      activity: "idle",
      backend: sessionId ? "resumable" : "none",
      sessionId,
      currentTaskId: undefined,
      lastError: undefined
    });
  }

  async failRun(spec: SpecBinding, role: AgentRole, error: string, sessionId?: string): Promise<SpecRuntimeDocument> {
    this.running.delete(runtimeKey(spec, role));
    return this.store.updateRole(spec, role, {
      activity: "failed",
      backend: sessionId ? "error" : "none",
      sessionId,
      currentTaskId: undefined,
      lastError: error
    });
  }

  async updateSession(spec: SpecBinding, role: AgentRole, sessionId: string): Promise<SpecRuntimeDocument> {
    return this.store.updateRole(spec, role, {
      sessionId
    });
  }

  async markQueued(spec: SpecBinding, role: AgentRole): Promise<SpecRuntimeDocument> {
    const existing = await this.store.readRuntime(spec);
    const runtime = await this.store.ensureRuntime(spec, existing?.activeRole ?? role);
    const current = runtime.roles[role];
    if (current.activity === "running" || current.lifecycle === "archived") {
      return runtime;
    }
    return this.store.updateRole(spec, role, {
      activity: "queued"
    });
  }

  async resetSession(spec: SpecBinding, role: AgentRole): Promise<SpecRuntimeDocument> {
    const key = runtimeKey(spec, role);
    if (this.running.has(key)) {
      throw new Error(`Cannot reset ${role} while it is running.`);
    }

    return this.store.resetRoleSession(spec, role);
  }
}

function runtimeKey(spec: SpecBinding, role: AgentRole): string {
  return `${spec.specDir}:${role}`;
}
