import { renderSafeMarkdown } from "./markdown";
import { escapeHtml } from "./sanitize";
import type { RoleTimelineItem } from "./timelineTypes";

export function renderTimeline(items: RoleTimelineItem[]): string {
  const groups = groupByTurn(items);
  return groups
    .map(group => `<section class="turn" data-turn="${escapeHtml(group.turnId)}">${group.items.map(renderTimelineItem).join("")}</section>`)
    .join("");
}

export function renderTimelineItem(item: RoleTimelineItem): string {
  switch (item.type) {
    case "turn_start":
      return `<div class="timelineItem system" data-kind="system"><span>${escapeHtml(item.title)}</span></div>`;
    case "turn_end":
      return `<div class="timelineItem system" data-kind="system"><span>Turn ${escapeHtml(item.status)}</span></div>`;
    case "user_message":
      return `<article class="timelineItem message user" data-kind="replies"><div class="itemTitle">You</div><div class="markdown">${renderSafeMarkdown(item.body)}</div></article>`;
    case "assistant_message":
      return `<article class="timelineItem message assistant" data-kind="replies"><div class="itemTitle">${escapeHtml(item.role)}</div><div class="markdown">${renderSafeMarkdown(item.body)}</div></article>`;
    case "plan":
      return `<article class="timelineItem plan" data-kind="plans"><div class="itemTitle">${escapeHtml(item.title)}</div><ol>${item.steps.map(step => `<li class="${escapeHtml(step.status)}">${escapeHtml(step.text)}</li>`).join("")}</ol></article>`;
    case "tool_call":
      return `<details class="timelineItem tool" data-kind="tools"><summary><span>Tool</span><b>${escapeHtml(item.toolName)}</b><em>${escapeHtml(item.inputSummary)}</em></summary><pre>${escapeHtml(JSON.stringify(item.rawInput ?? item.inputSummary, null, 2))}</pre></details>`;
    case "tool_result":
      return `<details class="timelineItem tool ${escapeHtml(item.status)}" data-kind="tools"><summary><span>${escapeHtml(item.status)}</span><b>${escapeHtml(item.toolName)}</b><em>${escapeHtml(item.outputSummary)}</em></summary><pre>${escapeHtml(item.outputPreview ?? "")}</pre></details>`;
    case "artifact":
      return `<article class="timelineItem artifact" data-kind="files"><div class="itemTitle">${escapeHtml(item.title)}</div>${item.path ? renderFileButton(item.path) : ""}<div>${escapeHtml(item.summary ?? "")}</div></article>`;
    case "team_bus":
      return `<details class="timelineItem teamBus" data-kind="team"><summary><span>TeamBus</span><b>${escapeHtml(item.role)} -> ${escapeHtml(item.to)}</b><em>${escapeHtml(item.subject)}</em></summary><div class="teamBody">${renderSafeMarkdown(item.body)}</div>${item.artifacts.map(renderFileButton).join("")}<div class="meta">type: ${escapeHtml(item.messageType)} · response: ${item.requiresResponse ? "required" : "not required"}</div></details>`;
    case "system_status":
      return `<div class="timelineItem system ${escapeHtml(item.status)}" data-kind="system"><span>${escapeHtml(item.message)}</span></div>`;
    case "error":
      return `<article class="timelineItem error" data-kind="errors"><div class="itemTitle">${escapeHtml(item.severity)}</div><div>${escapeHtml(item.message)}</div>${item.detail ? `<pre>${escapeHtml(item.detail)}</pre>` : ""}</article>`;
  }
}

function renderFileButton(filePath: string): string {
  return `<button class="fileLink" data-open-file="${escapeHtml(filePath)}">${escapeHtml(filePath)}</button>`;
}

function groupByTurn(items: RoleTimelineItem[]): Array<{ turnId: string; items: RoleTimelineItem[] }> {
  const groups: Array<{ turnId: string; items: RoleTimelineItem[] }> = [];
  const index = new Map<string, { turnId: string; items: RoleTimelineItem[] }>();

  for (const item of items) {
    let group = index.get(item.turnId);
    if (!group) {
      group = { turnId: item.turnId, items: [] };
      index.set(item.turnId, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  return groups;
}
