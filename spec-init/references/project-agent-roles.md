# Project Agent Role Templates

Use these definitions when `spec-init` creates project-level roles. The source of truth is the neutral `.agents/roles/` role definition; Claude Code and Codex files are runtime adapters generated from the same role.

## Common Protocol

- Role definitions are project-scoped. Do not create user-global agents unless the user explicitly asks.
- TeamLead is the current main agent. Do not create a TeamLead subagent.
- Skill is the working method. Role is the workflow identity.
- Cross-role communication goes through TeamLead by default. A role may name intended downstream recipients in its output, but it must not assume direct agent-to-agent messaging.
- Role instances should remain resumable during one Spec run when the runtime supports agent threads. If a role thread is unavailable, restart the same project-level role and rebuild context from persisted Spec artifacts.
- Runtime handles for spawned role instances must be recorded in the current Spec's `lead/team-context.md` by TeamLead. Treat `agent_id`, `thread_id`, and `session_id` as runtime-local handles, not durable role identities.
- TeamLead owns the structure and control-plane sections of `lead/team-context.md`: frontmatter, run path, Git/PR metadata, runtime handles, artifact registry, gate decisions, handoffs, blockers, and next action.
- All roles may directly maintain the shared sections in `lead/team-context.md`:「任务进度」for their own completed work,「问题闭环记录」for issues they found or resolved (bugs and process issues alike, tagged via `category`), and「决策记录」for substantive trade-offs they decided (record the options considered, the choice, and the rationale). Do not edit other roles' rows.
- Non-Lead roles must not edit any other `lead/team-context.md` sections. They return control-plane changes, handoff requests, and blocker updates to TeamLead.
- `lead/team-context.md` is maintained manually by TeamLead and the roles. Update the relevant section as soon as an artifact is produced, an issue is found or resolved, or a trade-off is decided.
- Required state must be written to `spec/`, `AGENTS.md`, `.agents/rules/`, `.agents/skills/`, or the explicit experience/knowledge store. Do not rely on hidden agent context for workflow correctness.
- Each role writes its own artifacts under the current Spec role directory: `lead/`, `explorer/`, `writer/`, `tester/`, `executor/`, `debugger/`, `reviewer/`, `updater/`, or `ender/`.
- Report artifacts are HTML (`*.html`) and follow the `html-report` skill contract: shared stylesheet, fixed skeleton, and traceable revision markers. The run ledger `lead/team-context.md` stays Markdown, as do the experience/knowledge memory files under `spec/context/`. Never convert the ledger or memory files to HTML, and never author a report as Markdown.
- Going HTML must not drop capability. Every former frontmatter field survives on two tracks: machine-readable `<meta name="rk:*">` in `<head>` (`rk:type`, `rk:spec-dir`, `rk:role`, `rk:created`, `rk:updated`, `rk:revision`, `rk:git-branch`, `rk:base-branch`, `rk:pr-url`, `rk:tags`) plus a human-readable `.rk-meta` mirror in the header. Document relations use `<link rel="rk-plan|rk-debug|rk-update|rk-ledger" href="...">`. Do not drop a field because HTML does not display it.
- Cross-report relations stay bidirectional: a report lists what it cites in `<ul class="rk-links">` (`data-rk-link="{type}"`) and who cites it in `<ul class="rk-backlinks">` (`data-rk-backlink="{type}"`). Whoever creates a relation also adds the reverse entry on the other side; when the other report does not exist yet, mark it `（待创建）` and backfill once it lands.
- Report revision history and the ledger Decision Log are complementary and must cross-reference. A revision driven by a substantive trade-off names the decision id in the「原因」column (e.g. `按 D-003（多实例部署需共享缓存）`); a typo, wording, or pure addition states the plain reason without inventing an id. The decision narrative itself stays in the Decision Log of `lead/team-context.md` — do not copy it into the report. The revision table keeps its 5 columns; never add one.

## Neutral Role File Format

Create one file per role under `.agents/roles/<role-id>.md`:

```markdown
---
role_id: spec-explorer
required_skill: spec-explore
activation: TeamLead starts the role for the current Spec run.
communication: TeamLead-mediated
---

# spec-explorer

Purpose, inputs, outputs, and role rules.
```

## Runtime Adapter Rendering

Claude Code project adapter path: `.claude/agents/<role-id>.md`

```markdown
---
name: <role-id>
description: <one-line role purpose and when TeamLead should use it>
---

You are <role-id> in the R&K Flow Spec workflow.
Read `.agents/roles/<role-id>.md` and follow the referenced `<required_skill>` protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
```

Codex project adapter path: `.codex/agents/<role-id>.toml`

Codex identifies a custom agent by the TOML `name` field. Use snake_case for
the Codex runtime name (`<codex-agent-name>`, computed by replacing `-` with
`_`, for example `spec-explorer` -> `spec_explorer`) while keeping the neutral
role id and file paths hyphenated. This mirrors the official Codex examples and
avoids ambiguity when asking Codex to spawn a role by name.

```toml
name = "<codex-agent-name>"
description = "<one-line role purpose and when TeamLead should use it>"

developer_instructions = """
You are <role-id> in the R&K Flow Spec workflow.
Read `.agents/roles/<role-id>.md` and follow the referenced `<required_skill>` protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
"""
```

Also create `.codex/config.toml` if absent, or merge these settings if safe:

```toml
[agents]
max_threads = 7
max_depth = 1
```

Codex CLI note: `/agent` shows active spawned agent threads. It is not a
library view of all files under `.codex/agents/`. To verify discovery, ask
Codex explicitly to spawn a project agent such as `spec_explorer`, then inspect
the active thread with `/agent`.

OMP (Oh My Pi) project adapter path: `.omp/agents/<role-id>.md`

OMP only discovers task agents under `.omp/agents/` and deliberately skips
`.claude/agents` and `.codex/agents` (their frontmatter is not the OMP
task-agent contract). The frontmatter must include `name` and `description`
(missing either makes the definition invalid and silently skipped); the whole
body becomes the agent's system prompt. Keep the neutral role id and file paths
hyphenated; `name` is the hyphenated role id.

```markdown
---
name: <role-id>
description: <one-line role purpose and when TeamLead should use it>
# OMP task-agent fields (recommended):
# model: <provider/model-id>        # optional; omit to inherit session / modelRoles
thinkingLevel: high               # off|minimal|low|medium|high|xhigh|max
# tools:  **omit by default** — inherit the full enabled builtin set (write/edit/bash/eval/irc/…)
spawns: ""                        # *|CSV; controls which agents this role may spawn
# read-summarize: false           # return raw file content instead of summaries
---

You are <role-id> in the R&K Flow Spec workflow.
Read `.agents/roles/<role-id>.md` and follow the referenced `<required_skill>` protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
```

OMP runtime notes:

- TeamLead is the current OMP main agent and spawns these 7 roles via the `task`
  tool; inter-role coordination (e.g. spec-tester <-> spec-debugger fix loop)
  uses OMP's `irc` subagent messaging, with handoffs still persisted to
  `lead/team-context.md`.
- OMP 16.4+ `task` wire schema (batch on by default): use
  `{ context, tasks: [{ name?, agent?, task }] }`. There is **no** top-level
  `agent` field; per-item field is `task` (not `assignment`) and optional
  stable id is `name` (not `id`). UI labels are auto-generated from `task` text.
- `.agents/skills/` is already OMP's native `agents`-provider skill path
  (gated by `enableAgentsProject`), so R&K skills work out of the box with no
  separate skill adapter.
- Mind OMP's `task.maxRecursionDepth`: TeamLead-spawned roles sit at depth 1; a
  role that must spawn further subagents needs an explicit `spawns` field and
  must not exceed the depth cap.
- Do not write to `~/.omp/agent/agents/` unless the user explicitly asks for a
  personal global agent. Do not overwrite existing `.omp/agents/*.md`; explain
  diffs and wait for confirmation before updating.
- **`tools` is a whitelist when present.** Omitting `tools` inherits the full
  enabled builtin set (subject to settings like `bash.enabled` / `lsp.enabled`).
  Subagents auto-get `yield`; parent-owned `todo` is stripped. Prefer omit.
- If you must set an explicit `tools` list, use OMP canonical names
  (`grep`/`glob`, not legacy `search`/`find`) and include at least the working
  set: `read, grep, glob, bash, lsp, write, edit, eval, web_search, ast_grep,
  ast_edit, debug, browser, ask, job, irc, search_tool_bm25` — missing any of
  these mid-run is a common stall. `yield` is auto-added; do not rely on a
  narrow scout-style list for Spec roles.

### OMP Per-Role Field Mapping

These are the recommended OMP task-agent frontmatter fields per role. Tune
`thinkingLevel` / optional `model` per project. The body of every
`.omp/agents/<role-id>.md` still begins by reading the neutral
`.agents/roles/<role-id>.md`.

**Hard rules for all 7 roles:**
1. **Omit `tools` by default** so every role inherits the full enabled OMP
   toolset and does not stall mid-run. Spec artifact delivery (write/edit) and
   operational tools (bash/eval/lsp/web_search/…) come free with the default set.
2. **Do not use narrow read-only tool lists** to enforce product-code boundaries.
   Those boundaries belong in neutral `.agents/roles/*.md` rules. A whitelist
   that drops `bash`/`eval`/`write` is how Spec roles fail.
3. **Only set `tools` when the project explicitly needs a restriction** — and
   then use the full working set above, never a scout-only subset.
4. **`model` is optional**: set per role when the project adopts multi-model
   routing; otherwise omit and inherit the session default.
5. Prefer canonical tool names if listing tools; `thinkingLevel` may be `max`.

| role-id | tools | spawns | thinkingLevel | read-summarize | rationale |
|---------|-------|--------|---------------|----------------|-----------|
| spec-explorer | *(omit — full default)* | `""` | high | (keep summaries) | Wide scan + write `explorer/exploration-report.html`. Product code stays untouched via role rules, not tool locks. |
| spec-writer | *(omit — full default)* | `""` | high | false | Designs plan; reads source verbatim. Role rules: Spec docs only, not product code. |
| spec-tester | *(omit — full default)* | `""` | medium | (keep summaries) | **Delegation exception**: MUST run real tests and collect evidence. Do NOT apply "subagents skip verification". |
| spec-executor | *(omit — full default)* | `""` | medium | false | Implements per已确认 plan; product edits + `executor/summary.html` within scope. |
| spec-debugger | *(omit — full default)* | `""` | xhigh | false | Root-cause + fixes; does not touch已确认 `writer/plan.html`. |
| spec-reviewer | *(omit — full default)* | `""` | high | false | Audits only; role rules forbid product edits; must still write `reviewer/review.html`. |
| spec-ender | *(omit — full default)* | `""` | medium | (keep summaries) | 收尾 / git / PR / archive; needs full tool access by default. |

Notes:
- `spawns: ""` everywhere keeps all 7 roles at depth 1 under TeamLead, well clear
  of `task.maxRecursionDepth`. Only widen `spawns` if a role provably needs to
  fan out further, and confirm the depth cap is not exceeded.
- Omitting `model` inherits the session / modelRoles default; projects may pin
  per-role models (e.g. stronger model for writer/debugger) when ready.
- Product-code mutation policy is a **role rule** (neutral `.agents/roles/*.md`),
  not a tools lock.
- spec-explorer / spec-reviewer keep `read` structural summaries (default) for
  cheap wide scanning; spec-writer / spec-executor / spec-debugger set
  `read-summarize: false` because they reason about exact code, not shape.
- OMP bundled research agent is named `scout` (formerly `explore`); R&K keeps
  project agent id `spec-explorer` and does not collide with the bundled name.

### OMP Agent File Generation Examples

When `spec-init` writes `.omp/agents/<role-id>.md`, emit the full file.
**Omit `tools`.** Add `model` only when the project configures per-role models.

`spec-explorer`:

```markdown
---
name: spec-explorer
description: Spec 创建前的信息收集与探索；TeamLead 在需求对齐和分支准备后启动。
thinkingLevel: high
spawns: ""
---

You are spec-explorer in the R&K Flow Spec workflow.
Read `.agents/roles/spec-explorer.md` and follow the referenced `spec-explore` protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
```

`spec-writer` (verbatim reads + plan artifact):

```markdown
---
name: spec-writer
description: 撰写代码实现计划 writer/plan.html；TeamLead 提供探索报告后启动。
thinkingLevel: high
spawns: ""
read-summarize: false
---

You are spec-writer in the R&K Flow Spec workflow.
Read `.agents/roles/spec-writer.md` and follow the referenced `spec-write` protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
```

`spec-executor` (and the same shape for tester / debugger / ender — omit tools):

```markdown
---
name: spec-executor
description: 严格按已确认的 writer/plan.html 实现代码；TeamLead 在用户确认计划后启动。
thinkingLevel: medium
spawns: ""
read-summarize: false
---

You are spec-executor in the R&K Flow Spec workflow.
Read `.agents/roles/spec-executor.md` and follow the referenced `spec-execute` protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
```

`spec-reviewer`:

```markdown
---
name: spec-reviewer
description: 审查 Spec 执行的一致性、完成度与风险；TeamLead 在归档前审查时启动。
thinkingLevel: high
spawns: ""
read-summarize: false
---

You are spec-reviewer in the R&K Flow Spec workflow.
Read `.agents/roles/spec-reviewer.md` and follow the referenced `spec-review` protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
```

## Role Definitions

The 7 neutral role definitions are maintained exclusively in `.agents/roles/<role-id>.md`:
- `.agents/roles/spec-explorer.md`
- `.agents/roles/spec-writer.md`
- `.agents/roles/spec-tester.md`
- `.agents/roles/spec-executor.md`
- `.agents/roles/spec-debugger.md`
- `.agents/roles/spec-reviewer.md`
- `.agents/roles/spec-ender.md`

They are the single source of truth for role identities, inputs, outputs, handoff protocols, and boundary rules. Subagents read their own dedicated file on activation. Do not duplicate these role definition blocks into reference documents.
