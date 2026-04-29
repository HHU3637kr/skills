import type { AgentRole } from "../agentAdapters/types";
import type { SpecBinding } from "../specs/types";
import { escapeHtml } from "../common/html";
import { roleDefinitionFor, roleSystemPrompt } from "../prompts/rolePrompts";

export function renderCanvasHtml(spec: SpecBinding, currentBranch: string): string {
  const agents: Array<{ role: AgentRole; engine: string; x: number; y: number }> = [
    { role: "TeamLead", engine: "Claude Code", x: 92, y: 78 },
    { role: "spec-explorer", engine: "Claude Code", x: 326, y: 68 },
    { role: "spec-writer", engine: "Claude Code", x: 558, y: 92 },
    { role: "spec-executor", engine: "Claude Code", x: 330, y: 246 },
    { role: "spec-tester", engine: "Claude Code", x: 582, y: 286 },
    { role: "spec-debugger", engine: "Claude Code", x: 114, y: 282 },
    { role: "spec-ender", engine: "Claude Code", x: 374, y: 424 }
  ];
  const isArchived = spec.lifecycle === "archived";
  const roleConfigs = Object.fromEntries(agents.map(agent => [agent.role, {
    backend: agent.engine,
    model: "Default model",
    skillName: roleDefinitionFor(agent.role).skillName,
    prompt: roleSystemPrompt(agent.role)
  }]));
  const roleConfigsJson = JSON.stringify(roleConfigs).replace(/</g, "\\u003c");
  const healthLabel = spec.health === "complete"
    ? "complete"
    : `incomplete · missing ${spec.missingFiles.join(", ") || "core files"}`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: dark; --bg:#1e1e1e; --panel:#252526; --line:#3c3c3c; --text:#d4d4d4; --muted:#8f8f8f; --accent:#4cc2ff; --green:#53c285; --gold:#d7b46a; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 13px/1.45 "Segoe UI", sans-serif; overflow: hidden; }
    header { height: 42px; display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--line); background: #181818; }
    h1 { margin: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button { color: var(--text); background: #2d2d2d; border: 1px solid var(--line); border-radius: 4px; padding: 5px 8px; font: inherit; cursor: pointer; }
    button:disabled, select:disabled, textarea:disabled { opacity: .56; cursor: default; }
    select, textarea { width: 100%; color: var(--text); background: #2d2d2d; border: 1px solid var(--line); border-radius: 4px; padding: 6px 7px; font: inherit; }
    textarea { min-height: 96px; resize: vertical; }
    /* 修复: debug-001.md - Role config belongs to a fixed inspector, not a canvas overlay. */
    /* 修复: debug-002.md - Inspector opens only after selecting a role. */
    .workspace { height: calc(100vh - 42px); min-height: 0; display: grid; grid-template-columns: minmax(420px, 1fr); }
    .workspace.inspectorOpen { grid-template-columns: minmax(420px, 1fr) minmax(300px, 360px); }
    .canvasWrap { position: relative; min-width: 0; min-height: 0; overflow: hidden; background-image: linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 28px 28px; }
    .canvas { position: relative; width: 920px; height: 660px; transform-origin: 0 0; }
    .agent { position: absolute; width: 174px; min-height: 82px; padding: 10px; border: 1px solid var(--line); border-radius: 7px; background: #252526; box-shadow: 0 8px 18px rgba(0,0,0,.18); cursor: pointer; user-select: none; }
    .agent:hover, .agent.selected { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(76,194,255,.28), 0 8px 18px rgba(0,0,0,.18); }
    .agent strong { display: block; font-size: 13px; }
    .agent span { color: var(--muted); font-size: 12px; }
    .agent small { display: inline-block; margin-top: 8px; color: var(--accent); }
    .inspector { min-width: 0; min-height: 0; overflow: auto; border-left: 1px solid var(--line); background: #181818; display: none; }
    .workspace.inspectorOpen .inspector { display: block; }
    .inspectorHeader { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .closeInspector { width: 28px; height: 28px; padding: 0; color: var(--muted); flex: none; }
    .info, .roleConfig { padding: 12px; border-bottom: 1px solid var(--line); background: #1d1d1d; }
    .configGrid { display: grid; gap: 8px; margin-top: 8px; }
    .readonlyField { min-height: 30px; display: flex; align-items: center; padding: 6px 7px; border: 1px solid var(--line); border-radius: 4px; background: #232323; color: var(--text); }
    .badge { display: inline-flex; width: max-content; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 999px; border: 1px solid var(--line); color: var(--muted); background: #171717; font-size: 11px; }
    .badge.editable { color: var(--green); }
    .badge.readonly { color: var(--gold); }
    .nodeMode { float: right; color: var(--muted); font-size: 11px; }
    .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0; }
    .mono { font-family: Consolas, monospace; overflow-wrap: anywhere; }
    .ok { color: var(--green); }
    .warn { color: var(--gold); }
    svg { position: absolute; inset: 0; pointer-events: none; }
    path { stroke: #5f7f95; stroke-width: 1.4; fill: none; stroke-dasharray: 4 4; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(spec.title)}</h1>
  </header>
  <main class="workspace" id="workspace">
    <section class="canvasWrap" id="canvasWrap">
      <div class="canvas" id="canvas">
        <svg viewBox="0 0 920 660">
          <path d="M266 118 C300 96 306 102 326 110"></path>
          <path d="M500 116 C528 112 540 118 558 132"></path>
          <path d="M412 150 C404 186 394 210 382 246"></path>
          <path d="M498 302 C526 306 544 312 582 326"></path>
          <path d="M306 300 C260 302 220 310 288 322"></path>
          <path d="M418 328 C420 374 418 398 438 424"></path>
        </svg>
        ${agents.map(agent => `<article class="agent" data-role="${agent.role}" tabindex="0" style="left:${agent.x}px;top:${agent.y}px">
          <span class="nodeMode">${isArchived ? "RO" : "LIVE"}</span>
          <strong>${escapeHtml(agent.role)}</strong>
          <span>${escapeHtml(agent.engine)}</span>
          <small>${agent.role === "TeamLead" ? "phase gate" : "agent role"}</small>
        </article>`).join("")}
      </div>
    </section>
    <aside class="inspector">
      <section class="info">
        <div class="label">Spec</div>
        <div class="mono">${escapeHtml(spec.specDir)}</div>
        <div class="badge ${isArchived ? "readonly" : "editable"}">${escapeHtml(spec.lifecycle)} · ${escapeHtml(healthLabel)}</div>
        <div style="height:8px"></div>
        <div class="label">Git Binding</div>
        <div class="mono">target: ${escapeHtml(spec.gitBranch || "not set")}</div>
        <div class="mono ${currentBranch === spec.gitBranch ? "ok" : "warn"}">current: <span id="currentBranch">${escapeHtml(currentBranch)}</span></div>
      </section>
      <section class="roleConfig">
        <div class="inspectorHeader">
          <div>
            <div class="label">${isArchived ? "Snapshot Role Config" : "Selected Role Config"}</div>
            <h2 id="configRole" style="margin:4px 0 2px;font-size:15px;">TeamLead</h2>
          </div>
          <button id="closeInspector" class="closeInspector" title="Close" aria-label="Close inspector">×</button>
        </div>
        <span class="badge ${isArchived ? "readonly" : "editable"}" id="configMode">${isArchived ? "read-only" : "editable"}</span>
        <div class="configGrid">
          <div>
            <div class="label">Workflow Skill</div>
            <div class="readonlyField" id="roleSkill"></div>
          </div>
          <label>
            <div class="label">Backend</div>
            <select id="roleBackend"${isArchived ? " disabled" : ""}>
              <option>Claude Code</option>
            </select>
          </label>
          <label>
            <div class="label">Model</div>
            <select id="roleModel"${isArchived ? " disabled" : ""}>
              <option>Default model</option>
              <option>Claude Code default</option>
            </select>
          </label>
          <label>
            <div class="label">System Prompt</div>
            <textarea id="rolePrompt"${isArchived ? " disabled" : ""}></textarea>
          </label>
          <button id="saveRoleConfig"${isArchived ? " disabled" : ""}>${isArchived ? "Snapshot Config" : "Save Role Config"}</button>
          <div class="mono" id="configStatus"></div>
        </div>
      </section>
    </aside>
  </main>
  <script>
    const vscode = acquireVsCodeApi();
    const workspace = document.querySelector("#workspace");
    const canvas = document.querySelector("#canvas");
    const wrap = document.querySelector("#canvasWrap");
    const readOnly = ${JSON.stringify(isArchived)};
    const roleConfigs = ${roleConfigsJson};
    let selectedRole = "TeamLead";
    let offset = { x: 28, y: 28 };
    let scale = 1;
    let dragging = false;
    let start = { x: 0, y: 0 };

    function applyTransform() {
      canvas.style.transform = 'translate(' + offset.x + 'px,' + offset.y + 'px) scale(' + scale + ')';
    }

    function selectAgent(role, notify = true) {
      if (!role) return;
      selectedRole = role;
      workspace.classList.add("inspectorOpen");
      document.querySelectorAll('.agent').forEach(node => node.classList.toggle('selected', node.dataset.role === role));
      renderRoleConfig();
      if (notify) {
        vscode.postMessage({ command: "selectAgent", role });
      }
    }

    function closeInspector() {
      workspace.classList.remove("inspectorOpen");
      document.querySelectorAll('.agent').forEach(node => node.classList.remove('selected'));
    }

    function renderRoleConfig() {
      const config = roleConfigs[selectedRole] || roleConfigs.TeamLead;
      document.querySelector("#configRole").textContent = selectedRole;
      document.querySelector("#roleSkill").textContent = "$" + config.skillName;
      document.querySelector("#roleBackend").value = config.backend;
      document.querySelector("#roleModel").value = config.model;
      document.querySelector("#rolePrompt").value = config.prompt;
      document.querySelector("#configStatus").textContent = readOnly ? "Archived Spec snapshot." : "";
    }

    wrap.addEventListener('pointerdown', event => {
      if (event.target.closest('.agent')) return;
      dragging = true;
      start = { x: event.clientX - offset.x, y: event.clientY - offset.y };
      wrap.setPointerCapture(event.pointerId);
    });
    wrap.addEventListener('pointermove', event => {
      if (!dragging) return;
      offset = { x: event.clientX - start.x, y: event.clientY - start.y };
      applyTransform();
    });
    wrap.addEventListener('pointerup', () => { dragging = false; });
    wrap.addEventListener('wheel', event => {
      event.preventDefault();
      scale = Math.max(.72, Math.min(1.45, scale + (event.deltaY > 0 ? -.05 : .05)));
      applyTransform();
    }, { passive: false });

    document.querySelector("#closeInspector").addEventListener("click", closeInspector);
    document.querySelector("#saveRoleConfig").addEventListener("click", () => {
      if (readOnly) return;
      const config = roleConfigs[selectedRole] || {};
      config.backend = document.querySelector("#roleBackend").value;
      config.model = document.querySelector("#roleModel").value;
      config.prompt = document.querySelector("#rolePrompt").value;
      roleConfigs[selectedRole] = config;
      document.querySelector("#configStatus").textContent = "Role config saved for this canvas session.";
    });
    document.querySelectorAll('.agent').forEach(node => {
      node.addEventListener('pointerdown', event => event.stopPropagation());
      node.addEventListener('click', event => {
        event.stopPropagation();
        selectAgent(node.dataset.role);
      });
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectAgent(node.dataset.role);
        }
      });
    });
    window.addEventListener("message", event => {
      if (event.data.type === "branch") {
        document.querySelector("#currentBranch").textContent = event.data.branch;
      }
      if (event.data.type === "agentSelected") {
        selectAgent(event.data.role, false);
      }
    });
    applyTransform();
  </script>
</body>
</html>`;
}

