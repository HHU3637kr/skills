import type { AgentRole, AgentSession } from "../agentAdapters/types";
import type { SpecBinding } from "../specs/types";
import { escapeHtml } from "./sanitize";
import { renderTimeline } from "./renderers";
import type { RoleTimelineItem } from "./timelineTypes";

const agentRoles: AgentRole[] = [
  "TeamLead",
  "spec-explorer",
  "spec-writer",
  "spec-executor",
  "spec-tester",
  "spec-debugger",
  "spec-ender"
];

export function renderRoleChatHtml(
  spec: SpecBinding | undefined,
  activeRole: AgentRole,
  items: RoleTimelineItem[],
  sessions: Partial<Record<AgentRole, AgentSession | undefined>>
): string {
  const timelineJson = JSON.stringify(items).replace(/</g, "\\u003c");
  const roleSessionsJson = JSON.stringify(Object.fromEntries(agentRoles.map(role => [role, Boolean(sessions[role])]))).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: dark; --line:#333; --text:#d4d4d4; --muted:#9a9a9a; --panel:#202020; --panel2:#252525; --accent:#4cc2ff; --good:#7bd88f; --warn:#d7ba7d; --error:#f0c8c0; --danger:#f48771; }
    * { box-sizing: border-box; }
    body { margin: 0; height: 100vh; display: flex; flex-direction: column; background: #181818; color: var(--text); font: 13px/1.45 "Segoe UI", sans-serif; }
    header { padding: 12px; border-bottom: 1px solid var(--line); background: #1d1d1d; }
    h2 { margin: 2px 0 4px; font-size: 17px; line-height: 1.2; }
    label { display: block; color: var(--muted); font-size: 11px; margin: 8px 0 4px; }
    select, textarea, button { width: 100%; color: var(--text); background: var(--panel2); border: 1px solid var(--line); border-radius: 5px; padding: 7px; font: inherit; }
    textarea { min-height: 48px; max-height: 120px; resize: vertical; }
    button { cursor: pointer; }
    button:disabled { opacity: .55; cursor: default; }
    .meta { color: var(--muted); overflow-wrap: anywhere; }
    .mono { font-family: Consolas, monospace; color: var(--accent); overflow-wrap: anywhere; }
    .toolbar { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--line); overflow-x: auto; }
    .chip { width: auto; min-width: max-content; padding: 4px 8px; color: var(--muted); }
    .chip.active { color: var(--text); border-color: var(--accent); }
    .timeline { flex: 1; min-height: 0; overflow: auto; padding: 12px; }
    .turn { border-left: 2px solid #2d2d2d; margin: 0 0 14px; padding-left: 10px; }
    .timelineItem { margin: 0 0 9px; padding: 9px; border: 1px solid var(--line); background: var(--panel); border-radius: 6px; overflow-wrap: anywhere; }
    .timelineItem summary { cursor: pointer; display: grid; gap: 2px; }
    .timelineItem summary span { color: var(--muted); font-size: 11px; text-transform: uppercase; }
    .timelineItem summary b, .itemTitle { color: var(--accent); font-weight: 700; }
    .timelineItem summary em { color: var(--muted); font-style: normal; overflow-wrap: anywhere; }
    .assistant { border-color: rgba(76,194,255,.5); }
    .user { background: #222; }
    .system { color: var(--muted); padding: 5px 8px; background: transparent; }
    .tool.success { border-color: rgba(123,216,143,.45); }
    .tool.failed, .error { border-color: #a65; color: var(--error); }
    .teamBus { border-color: rgba(215,186,125,.55); }
    .artifact { border-color: rgba(76,194,255,.35); }
    .markdown p { margin: 7px 0; }
    .markdown ul, .markdown ol { margin: 7px 0; padding-left: 18px; }
    .markdown blockquote { margin: 8px 0; padding-left: 10px; border-left: 2px solid var(--line); color: var(--muted); }
    .markdown code, pre, .tableText { font-family: Consolas, monospace; }
    .markdown code { background: #2b2b2b; border-radius: 3px; padding: 1px 4px; }
    pre { max-height: 300px; overflow: auto; background: #161616; border: 1px solid #2d2d2d; border-radius: 5px; padding: 8px; white-space: pre-wrap; }
    .codeLabel { color: var(--muted); font-size: 11px; margin-bottom: 3px; }
    .fileLink { width: auto; margin: 6px 6px 0 0; color: var(--accent); font-family: Consolas, monospace; text-align: left; }
    form { padding: 8px 10px 10px; border-top: 1px solid var(--line); }
    .composerBox { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; overflow: hidden; }
    #body { display: block; border: 0; border-radius: 0; background: transparent; padding: 10px; }
    #body:focus { outline: 1px solid rgba(76,194,255,.35); outline-offset: -1px; }
    .composerFooter { display: flex; align-items: center; gap: 6px; padding: 7px; border-top: 1px solid var(--line); background: #1d1d1d; }
    .compactSelect { width: auto; min-width: 0; max-width: 150px; height: 30px; padding: 4px 7px; }
    #model { max-width: 190px; }
    .spacer { flex: 1; min-width: 8px; }
    .secondaryButton { width: auto; min-width: 62px; height: 30px; padding: 4px 8px; color: var(--muted); }
    .sendIcon { width: 30px; height: 30px; padding: 0; border-radius: 50%; color: #fff; background: #7f5a48; font-size: 17px; line-height: 1; }
    #status { margin-top: 6px; color: var(--muted); min-height: 16px; font-size: 12px; overflow-wrap: anywhere; }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <header>
    <div class="meta">Role Chat</div>
    <h2 id="activeRole">${escapeHtml(activeRole)}</h2>
    <div class="meta">${spec ? escapeHtml(spec.title) : "No active Spec"}</div>
    <div class="mono">${spec ? escapeHtml(spec.gitBranch || "not set") : ""}</div>
    <div class="meta" id="sessionState"></div>
  </header>
  <nav class="toolbar" aria-label="Timeline filters">
    <button type="button" class="chip active" data-filter="all">All</button>
    <button type="button" class="chip" data-filter="replies">Replies</button>
    <button type="button" class="chip" data-filter="tools">Tools</button>
    <button type="button" class="chip" data-filter="errors">Errors</button>
    <button type="button" class="chip" data-filter="files">Files</button>
    <button type="button" class="chip" data-filter="team">TeamBus</button>
    <button type="button" class="chip" id="jumpBottom">Bottom</button>
  </nav>
  <main class="timeline" id="timeline">${renderTimeline(items)}</main>
  <form id="chatForm" class="composer">
    <div class="composerBox">
      <textarea id="body" rows="2" aria-label="Message" placeholder="Chat with selected role..."></textarea>
      <div class="composerFooter">
        <select id="role" class="compactSelect" aria-label="Agent Role">${renderRoleOptions(activeRole)}</select>
        <select id="model" class="compactSelect" aria-label="Model">
          <option value="default">Default model</option>
          <option value="claude-default">Claude Code default</option>
        </select>
        <span class="spacer"></span>
        <button type="button" class="secondaryButton" id="retryButton">Retry</button>
        <button type="button" class="secondaryButton" id="continueButton">Continue</button>
        <button id="sendButton" class="sendIcon" title="Send" aria-label="Send">↑</button>
      </div>
    </div>
    <div id="status"></div>
  </form>
  <script>
    const vscode = acquireVsCodeApi();
    let timelineItems = ${timelineJson};
    const roleSessions = ${roleSessionsJson};
    const timeline = document.querySelector("#timeline");
    const status = document.querySelector("#status");
    const sendButton = document.querySelector("#sendButton");
    const retryButton = document.querySelector("#retryButton");
    const continueButton = document.querySelector("#continueButton");
    const bodyInput = document.querySelector("#body");
    let selectedRole = ${JSON.stringify(activeRole)};
    let activeFilter = "all";
    let lastPrompt = "";
    let composing = false;

    function escapeText(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
    }

    function renderInline(value) {
      return escapeText(value)
        .replace(/\\x60([^\\x60]+)\\x60/g, '<code>$1</code>')
        .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
    }

    function renderMarkdown(value) {
      const lines = String(value ?? '').replace(/\\r\\n/g, '\\n').split('\\n');
      const html = [];
      let paragraph = [];
      let list = [];
      let inCode = false;
      let codeLang = '';
      let codeLines = [];

      function flushParagraph() {
        if (!paragraph.length) return;
        html.push('<p>' + paragraph.map(renderInline).join('<br>') + '</p>');
        paragraph = [];
      }

      function flushList() {
        if (!list.length) return;
        html.push('<ul>' + list.map(item => '<li>' + renderInline(item) + '</li>').join('') + '</ul>');
        list = [];
      }

      function flushCode() {
        const label = codeLang ? '<div class="codeLabel">' + escapeText(codeLang) + '</div>' : '';
        html.push('<div class="codeBlock">' + label + '<pre><code>' + escapeText(codeLines.join('\\n')) + '</code></pre></div>');
        codeLines = [];
        codeLang = '';
      }

      for (const line of lines) {
        const fence = /^\\x60\\x60\\x60([A-Za-z0-9_-]+)?\\s*$/.exec(line);
        if (fence) {
          if (inCode) {
            flushCode();
            inCode = false;
          } else {
            flushParagraph();
            flushList();
            inCode = true;
            codeLang = fence[1] || '';
          }
          continue;
        }
        if (inCode) {
          codeLines.push(line);
          continue;
        }
        if (!line.trim()) {
          flushParagraph();
          flushList();
          continue;
        }
        const listMatch = /^\\s*(?:[-*+]|\\d+\\.)\\s+(.+)$/.exec(line);
        if (listMatch) {
          flushParagraph();
          list.push(listMatch[1]);
          continue;
        }
        const quoteMatch = /^\\s*>\\s?(.+)$/.exec(line);
        if (quoteMatch) {
          flushParagraph();
          flushList();
          html.push('<blockquote>' + renderInline(quoteMatch[1]) + '</blockquote>');
          continue;
        }
        if (/^\\s*\\|.+\\|\\s*$/.test(line)) {
          flushParagraph();
          flushList();
          html.push('<pre class="tableText">' + escapeText(line) + '</pre>');
          continue;
        }
        paragraph.push(line);
      }

      if (inCode) flushCode();
      flushParagraph();
      flushList();
      return html.join('');
    }

    function itemHtml(item) {
      if (item.type === "turn_start") return '<div class="timelineItem system" data-kind="system">' + escapeText(item.title) + '</div>';
      if (item.type === "turn_end") return '<div class="timelineItem system" data-kind="system">Turn ' + escapeText(item.status) + '</div>';
      if (item.type === "user_message") return '<article class="timelineItem message user" data-kind="replies"><div class="itemTitle">You</div><div class="markdown">' + renderMarkdown(item.body) + '</div></article>';
      if (item.type === "assistant_message") return '<article class="timelineItem message assistant" data-kind="replies"><div class="itemTitle">' + escapeText(item.role) + '</div><div class="markdown">' + renderMarkdown(item.body) + '</div></article>';
      if (item.type === "tool_call") return '<details class="timelineItem tool" data-kind="tools"><summary><span>Tool</span><b>' + escapeText(item.toolName) + '</b><em>' + escapeText(item.inputSummary) + '</em></summary><pre>' + escapeText(JSON.stringify(item.rawInput ?? item.inputSummary, null, 2)) + '</pre></details>';
      if (item.type === "tool_result") return '<details class="timelineItem tool ' + escapeText(item.status) + '" data-kind="tools"><summary><span>' + escapeText(item.status) + '</span><b>' + escapeText(item.toolName) + '</b><em>' + escapeText(item.outputSummary) + '</em></summary><pre>' + escapeText(item.outputPreview ?? '') + '</pre></details>';
      if (item.type === "team_bus") return '<details class="timelineItem teamBus" data-kind="team"><summary><span>TeamBus</span><b>' + escapeText(item.role) + ' -> ' + escapeText(item.to) + '</b><em>' + escapeText(item.subject) + '</em></summary><div class="teamBody">' + renderMarkdown(item.body) + '</div><div class="meta">type: ' + escapeText(item.messageType) + ' · response: ' + (item.requiresResponse ? 'required' : 'not required') + '</div></details>';
      if (item.type === "artifact") return '<article class="timelineItem artifact" data-kind="files"><div class="itemTitle">' + escapeText(item.title) + '</div>' + (item.path ? '<button class="fileLink" data-open-file="' + escapeText(item.path) + '">' + escapeText(item.path) + '</button>' : '') + '<div>' + escapeText(item.summary ?? '') + '</div></article>';
      if (item.type === "system_status") return '<div class="timelineItem system ' + escapeText(item.status) + '" data-kind="system">' + escapeText(item.message) + '</div>';
      if (item.type === "error") return '<article class="timelineItem error" data-kind="errors"><div class="itemTitle">' + escapeText(item.severity) + '</div><div>' + escapeText(item.message) + '</div></article>';
      return '';
    }

    function renderTimeline() {
      const items = timelineItems.filter(item => item.role === selectedRole);
      const groups = [];
      const byTurn = new Map();
      for (const item of items) {
        if (!byTurn.has(item.turnId)) {
          const group = { turnId: item.turnId, items: [] };
          byTurn.set(item.turnId, group);
          groups.push(group);
        }
        byTurn.get(item.turnId).items.push(item);
      }
      timeline.innerHTML = groups.map(group => '<section class="turn" data-turn="' + escapeText(group.turnId) + '">' + group.items.map(itemHtml).join('') + '</section>').join('');
      applyFilter();
      document.querySelector("#activeRole").textContent = selectedRole;
      document.querySelector("#role").value = selectedRole;
      document.querySelector("#sessionState").textContent = roleSessions[selectedRole] ? "resumable CLI session" : "new CLI session";
      retryButton.disabled = !lastPrompt;
      timeline.scrollTop = timeline.scrollHeight;
    }

    function applyFilter() {
      document.querySelectorAll(".chip[data-filter]").forEach(button => button.classList.toggle("active", button.dataset.filter === activeFilter));
      document.querySelectorAll(".timelineItem").forEach(node => {
        const kind = node.getAttribute("data-kind");
        node.hidden = activeFilter !== "all" && kind !== activeFilter;
      });
    }

    function appendItems(items) {
      for (const item of items) {
        if (!timelineItems.some(candidate => candidate.id === item.id)) {
          timelineItems.push(item);
        }
      }
      renderTimeline();
    }

    function sendPrompt(prompt) {
      if (!prompt.trim()) return;
      lastPrompt = prompt.trim();
      sendButton.disabled = true;
      status.textContent = "Running Claude Code...";
      vscode.postMessage({
        command: "send",
        role: selectedRole,
        model: document.querySelector("#model").value,
        body: prompt.trim()
      });
    }

    document.querySelector("#role").addEventListener("change", event => {
      selectedRole = event.target.value;
      renderTimeline();
      vscode.postMessage({ command: "selectRole", role: selectedRole });
    });

    document.querySelectorAll(".chip[data-filter]").forEach(button => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        applyFilter();
      });
    });

    document.querySelector("#jumpBottom").addEventListener("click", () => {
      timeline.scrollTop = timeline.scrollHeight;
    });

    bodyInput.addEventListener("compositionstart", () => composing = true);
    bodyInput.addEventListener("compositionend", () => composing = false);
    bodyInput.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey && !composing) {
        event.preventDefault();
        document.querySelector("#chatForm").requestSubmit();
      }
    });

    document.querySelector("#chatForm").addEventListener("submit", event => {
      event.preventDefault();
      sendPrompt(bodyInput.value);
      bodyInput.value = "";
    });

    retryButton.addEventListener("click", () => sendPrompt(lastPrompt));
    continueButton.addEventListener("click", () => sendPrompt("继续"));

    timeline.addEventListener("click", event => {
      const target = event.target.closest("[data-open-file]");
      if (!target) return;
      vscode.postMessage({ command: "openFile", path: target.getAttribute("data-open-file") });
    });

    window.addEventListener("message", event => {
      if (event.data.type === "timelineItems") {
        appendItems(event.data.items || []);
      }
      if (event.data.type === "roleSelected") {
        selectedRole = event.data.role;
        renderTimeline();
      }
      if (event.data.type === "agentStarted") {
        status.textContent = (event.data.resumed ? "Resumed " : "Started ") + event.data.role + " via " + event.data.engine;
      }
      if (event.data.type === "sessionUpdated") {
        roleSessions[event.data.role] = true;
        renderTimeline();
      }
      if (event.data.type === "agentDone") {
        sendButton.disabled = false;
        status.textContent = "Agent response saved: " + event.data.message.id;
      }
      if (event.data.type === "agentError") {
        sendButton.disabled = false;
        status.textContent = "Agent run failed: " + event.data.error;
      }
      if (event.data.type === "teamMessage") {
        status.textContent = "TeamBus message saved: " + event.data.message.id;
      }
    });

    renderTimeline();
  </script>
</body>
</html>`;
}

function renderRoleOptions(activeRole: AgentRole): string {
  return agentRoles
    .map(role => `<option value="${role}"${role === activeRole ? " selected" : ""}>${role}</option>`)
    .join("");
}
