import * as fs from "fs/promises";
import * as path from "path";
import type { AgentRole, AgentSession } from "../agentAdapters/types";
import { appendJsonLine } from "../audit/jsonlStore";
import { nowIso } from "../common/id";
import type { SpecBinding } from "../specs/types";
import {
  runtimeAgentRoles,
  runtimeVersion,
  type RoleRuntimePatch,
  type RoleRuntimeState,
  type SpecRuntimeDocument,
  type SpecRuntimeLifecycle
} from "./types";

export class RuntimeStore {
  async ensureRuntime(spec: SpecBinding, activeRole: AgentRole = "TeamLead"): Promise<SpecRuntimeDocument> {
    const existing = await this.readRuntime(spec);
    const runtime = existing
      ? await this.normalizeRuntime(spec, existing, activeRole)
      : await this.createRuntime(spec, activeRole);

    await this.ensureRuntimeFiles(spec);
    await this.writeRuntime(spec, runtime);
    if (!existing) {
      await this.appendRuntimeEvent(spec.specDirFsPath, "runtime_initialized", {
        specId: spec.id,
        state: runtime.state,
        activeRole
      });
    }
    return runtime;
  }

  async readRuntime(spec: SpecBinding): Promise<SpecRuntimeDocument | undefined> {
    try {
      const raw = await fs.readFile(runtimePath(spec.specDirFsPath), "utf8");
      return JSON.parse(raw) as SpecRuntimeDocument;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return undefined;
      }
      throw error;
    }
  }

  async updateRole(spec: SpecBinding, role: AgentRole, patch: RoleRuntimePatch): Promise<SpecRuntimeDocument> {
    const existing = await this.readRuntime(spec);
    const runtime = await this.ensureRuntime(spec, existing?.activeRole ?? role);
    runtime.roles[role] = {
      ...runtime.roles[role],
      ...patch,
      mailboxBacklog: await mailboxBacklog(spec.specDirFsPath, role, patch.mailboxCursor ?? runtime.roles[role].mailboxCursor),
      updatedAt: nowIso()
    };
    runtime.updatedAt = nowIso();
    await this.writeRuntime(spec, runtime);
    await this.appendRuntimeEvent(spec.specDirFsPath, "role_state_changed", {
      specId: spec.id,
      role,
      patch
    });
    return runtime;
  }

  async updateRoleBySpecDir(specDirFsPath: string, role: AgentRole, patch: RoleRuntimePatch): Promise<void> {
    try {
      const raw = await fs.readFile(runtimePath(specDirFsPath), "utf8");
      const runtime = JSON.parse(raw) as SpecRuntimeDocument;
      if (!runtime.roles[role]) {
        return;
      }
      runtime.roles[role] = {
        ...runtime.roles[role],
        ...patch,
        mailboxBacklog: await mailboxBacklog(specDirFsPath, role, patch.mailboxCursor ?? runtime.roles[role].mailboxCursor),
        updatedAt: nowIso()
      };
      runtime.updatedAt = nowIso();
      await fs.writeFile(runtimePath(specDirFsPath), `${JSON.stringify(runtime, null, 2)}\n`, "utf8");
      await this.appendRuntimeEvent(specDirFsPath, "role_state_changed", {
        role,
        patch
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async writeRuntime(spec: SpecBinding, runtime: SpecRuntimeDocument): Promise<void> {
    await fs.writeFile(runtimePath(spec.specDirFsPath), `${JSON.stringify(runtime, null, 2)}\n`, "utf8");
  }

  async resetRoleSession(spec: SpecBinding, role: AgentRole): Promise<SpecRuntimeDocument> {
    try {
      await fs.unlink(path.join(spec.specDirFsPath, "agent-sessions", `${role}.json`));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const runtime = await this.updateRole(spec, role, {
      activity: "idle",
      backend: "none",
      sessionId: undefined,
      currentTaskId: undefined,
      lastError: undefined
    });
    await this.appendRuntimeEvent(spec.specDirFsPath, "backend_session_reset", {
      specId: spec.id,
      role
    });
    return runtime;
  }

  private async createRuntime(spec: SpecBinding, activeRole: AgentRole): Promise<SpecRuntimeDocument> {
    const timestamp = nowIso();
    const state = specRuntimeState(spec);
    const roles = {} as Record<AgentRole, RoleRuntimeState>;
    await Promise.all(runtimeAgentRoles.map(async role => {
      roles[role] = await this.createRoleRuntime(spec, role, timestamp);
      if (state === "archived") {
        roles[role].lifecycle = "archived";
      }
    }));

    return {
      version: runtimeVersion,
      specId: spec.id,
      specDir: spec.specDir,
      state,
      activeRole,
      roles,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  private async normalizeRuntime(
    spec: SpecBinding,
    runtime: SpecRuntimeDocument,
    activeRole: AgentRole
  ): Promise<SpecRuntimeDocument> {
    const timestamp = nowIso();
    const roles = { ...runtime.roles } as Record<AgentRole, RoleRuntimeState>;
    await Promise.all(runtimeAgentRoles.map(async role => {
      if (!roles[role]) {
        roles[role] = await this.createRoleRuntime(spec, role, timestamp);
      }
      roles[role] = {
        ...roles[role],
        mailboxBacklog: await mailboxBacklog(spec.specDirFsPath, role, roles[role].mailboxCursor ?? 0)
      };
      if (specRuntimeState(spec) === "archived") {
        roles[role] = {
          ...roles[role],
          lifecycle: "archived",
          activity: roles[role].activity === "running" ? "idle" : roles[role].activity,
          updatedAt: timestamp
        };
      }
    }));

    return {
      ...runtime,
      version: runtimeVersion,
      specId: spec.id,
      specDir: spec.specDir,
      state: specRuntimeState(spec),
      activeRole,
      roles,
      updatedAt: timestamp
    };
  }

  private async createRoleRuntime(spec: SpecBinding, role: AgentRole, timestamp: string): Promise<RoleRuntimeState> {
    const session = await readAgentSession(spec.specDirFsPath, role);
    return {
      role,
      lifecycle: specRuntimeState(spec) === "archived" ? "archived" : "active",
      activity: "idle",
      backend: session ? "resumable" : "none",
      backendEngine: session?.engine ?? "claude-code",
      sessionId: session?.id,
      mailboxCursor: 0,
      mailboxBacklog: await mailboxBacklog(spec.specDirFsPath, role, 0),
      updatedAt: timestamp
    };
  }

  private async ensureRuntimeFiles(spec: SpecBinding): Promise<void> {
    await fs.mkdir(path.join(spec.specDirFsPath, "team-mailboxes"), { recursive: true });
    await fs.mkdir(path.join(spec.specDirFsPath, "logs"), { recursive: true });
    await Promise.all(runtimeAgentRoles.map(async role => {
      const mailboxPath = path.join(spec.specDirFsPath, "team-mailboxes", `${role}.jsonl`);
      try {
        await fs.access(mailboxPath);
      } catch {
        await fs.writeFile(mailboxPath, "", "utf8");
      }
    }));
    try {
      await fs.access(path.join(spec.specDirFsPath, "delivery-state.json"));
    } catch {
      await fs.writeFile(path.join(spec.specDirFsPath, "delivery-state.json"), "[]\n", "utf8");
    }
  }

  private async appendRuntimeEvent(specDirFsPath: string, type: string, payload: Record<string, unknown>): Promise<void> {
    await appendJsonLine(path.join(specDirFsPath, "logs", "runtime-events.jsonl"), {
      type,
      timestamp: nowIso(),
      ...payload
    });
    await appendJsonLine(path.join(specDirFsPath, "audit-log.jsonl"), {
      type,
      timestamp: nowIso(),
      ...payload
    });
  }
}

function runtimePath(specDirFsPath: string): string {
  return path.join(specDirFsPath, "runtime.json");
}

function specRuntimeState(spec: SpecBinding): SpecRuntimeLifecycle {
  return spec.category === "06-已归档" || spec.specDir.includes("/06-已归档/") ? "archived" : "active";
}

async function readAgentSession(specDirFsPath: string, role: AgentRole): Promise<AgentSession | undefined> {
  try {
    const raw = await fs.readFile(path.join(specDirFsPath, "agent-sessions", `${role}.json`), "utf8");
    return JSON.parse(raw) as AgentSession;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function mailboxBacklog(specDirFsPath: string, role: AgentRole, cursor: number): Promise<number> {
  const total = await countJsonLines(path.join(specDirFsPath, "team-mailboxes", `${role}.jsonl`));
  return Math.max(total - cursor, 0);
}

async function countJsonLines(filePath: string): Promise<number> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw.split(/\r?\n/).filter(Boolean).length;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return 0;
    }
    throw error;
  }
}
