# Token Efficiency

# Context Design (L0)

Context files are mine maps, not wikis. Every token here bills every turn.

## Landmines only

**Include:** stack, entry paths, non-obvious conventions the agent cannot infer from code.

**Exclude:** tutorials, API docs, anything discoverable by reading the repo, LLM `/init` boilerplate.

## Always-on hygiene

| Pattern | Action |
|---------|--------|
| `alwaysApply: true` on broad rules | Switch to glob-scoped rules |
| Skill body in system prompt | `disable-model-invocation: true`; load on invoke |
| Duplicate instructions across files | Dedup — one canonical source |
| Pasting docs into CLAUDE.md | Pointer: "see `docs/foo.md`" |
| 21 MCP servers | Keep only servers used weekly |

## Skill description

- Description: WHAT + WHEN in ≤1024 chars; third person.
- Body: read only when skill triggers.
- Default: `disable-model-invocation: true`.

## MCP hygiene

- Each unused server adds tool schema to **every turn** (often 8–12 KB+).
- One server per domain; prune unused tools.
- Prefer CLI (`gh`, `git`) over MCP when output is large and deterministic.

## Project notes template (fill once, highest ROI)

```markdown
### Stack
- Language:
- Framework:

### Key paths
- Entry:
- Types:

### Known shortcuts
- (non-obvious helpers only)

### Do NOT touch
-
```

## Session (L4)

- New task → new chat or fork.
- Simple Q&A → Ask/plan mode, not Agent.
- Long thread → checkpoint summary to file, start fresh.

## Model (L5)

| Task | Tier |
|------|------|
| Single-file edit, clear pattern | Fast / small |
| Multi-file feature | Mid reasoning |
| Architecture, novel debug | Top reasoning |
| "Just answer this" | Fast / small |

## Prompt cache

Stable rules at top of context; task-specific at bottom. Don't casually edit rule files — invalidates cache.

## Compression

Run `python3 scripts/compress.py FILE --write` on bloated instruction files. Safety sections use light compression only.


---

# Agent Behavior Rules (L1)

Cut turn count and tool-return waste. In agent mode, tool results often cost more than the reply.

## 1. Plan before act

Before tool calls, decide internally (max 1 line to user if non-obvious):
- Target file or symbol
- Cheapest tool to reach it

Skip planning for trivial one-line edits.

## 2. Cheapest tool wins

| Need | Use | Avoid |
|------|-----|-------|
| Exact symbol/string | grep / ripgrep | Semantic search, full file read |
| File by name | glob | Recursive list, read parent dirs |
| How X works | Semantic search → targeted read | Reading many files speculatively |
| Known function in known file | Read with offset/limit | Full file on 500+ lines |
| Command output once | Run once | Run + --help + run again |

## 3. Batch independent calls

Independent reads/searches go in **one message**. Parallel beats serial.

## 4. Don't re-read

- Files read this session stay read — refer from memory.
- Directories listed once stay listed.
- Re-read only if you edited the file and need verification — changed range only.

## 5. Search before read

Unfamiliar code in **Execution mode**: grep the symbol → read match ±20 lines.

**Exploration mode:** semantic search + targeted reads across modules is OK.

## 6. No speculative explore

**Execution mode only** (see capability-guardrails.md):

- User gave path → start there.
- User gave error → search error string first.
- Widen scope only after targeted approach fails.
- No "let me look around the repo first."

**Exploration mode** (user asks to understand architecture / whole repo / onboarding):
- Structured multi-file reads and semantic search are OK.
- Prefer a short plan (files/areas to inspect) over random walks.

## 7. Build / test / lint

**Execution mode:**
- No full test suite for typo fixes.
- No repo-wide lint/typecheck after one-file edits.
- Targeted check on changed file only when risky or user asked.
- User didn't ask for tests → don't run them.

**Debug mode or user asked for tests:** run the verification they need (targeted or full per request).

## 8. Stop when done

- Change in place → stop.
- No extra verification "for safety."
- No summary of what the diff already shows.
- No follow-ups unless user asked.

## 9. No redundant confirmation

- Don't echo the path you just edited.
- Don't say "I updated X" when diff shows it.
- Closing line only if user must do something non-obvious (e.g. restart server).

## 10. Long commands

- Set generous timeout; don't poll repeatedly.
- Dev servers/watchers: launch and move on.

## 11. Capability over savings

When L1 rules conflict with correct completion, follow [capability-guardrails.md](capability-guardrails.md).

User says 详细解释 / explore freely / run tests / verbose → lift constraints for that task.


---

# Payload Rules (L2) — Core Source

> Shrink large tool returns before they enter agent context.

## When to shrink

- Shell/command output > 80 lines
- JSON array with > 10 objects
- Log files > 100 lines
- Any single tool result > ~4,000 est. tokens

## Agent workflow

1. Save bulky tool output to a temp file (or pipe to file).
2. Run: `python3 scripts/shrink.py OUTPUT --vault -o OUTPUT.shrunk`
3. Read `OUTPUT.shrunk` instead of full output.
4. If detail missing, restore: `python3 scripts/shrink.py --restore VAULT_ID`

## Content routing (auto)

| Detected | Action |
|----------|--------|
| JSON array of objects | field list + count + sample rows |
| JSON object | truncate long strings, cap nested depth |
| Log | ERROR/WARN lines + tail |
| Code | head + tail, omit middle |
| Plain text | head + tail with marker |

## Prefer prevention first

- grep before cat
- `head -n 50` / `tail -n 50` for logs
- jq/query for JSON fields you need
- shrink.py when output already captured

## Vault

`--vault` stores original under `~/.token-efficiency/vault/` for on-demand restore without re-running tools.

## Capability (Debug / user override)

Do **not** shrink if it may hide the bug. Restore vault or read full output when:

- Debug mode or user says 看完整日志 / don't shrink
- errors are intermittent or sample rows look inconsistent
- shrink summary lacks the field you need → `--restore VAULT_ID`

See [capability-guardrails.md](capability-guardrails.md).


---

# Output Rules (L3)

Minimum viable response that fully solves the task. Verbosity is a bug.

## Prime directive

Start with the answer or the code. No preamble. No sign-off.

## Never

- Restate the question
- "Sure", "Great question", "Of course", "Certainly", "Happy to help"
- "Let me…", "I'll now…", "Here's what I did"
- Post-edit summary of the diff
- Disclaimers unless they affect correctness
- Filler: "it's worth noting", "as mentioned", "basically", "simply", "essentially"

## Edit format — patch, don't reprint

- Default: changed lines + 3–5 lines context.
- Use `// ... existing code` (or language equivalent) to elide.
- Full file only when: new file, file < 40 lines, or user said "full file".
- Don't reprint unchanged imports, classes, tests.

## Scope

- Ambiguous request → **one** highest-impact question, not a list.
- Task touches > 3 files or > 150 lines → pause: "Start with `<path>`?"
- Max 2 alternatives + one-sentence pick.

## Length heuristic

| Request | Target |
|---------|--------|
| Yes/no | 1 sentence |
| Simple code | Code block, minimal prose |
| Bug fix | 1-line cause + diff |
| Architecture | Bullets or table, not essay |
| Complex feature | Code + ≤ 3 bullets |

Draft past ~800 tokens prose → cut or ask if all is necessary.

## Code-only mode

When user asks for code/generation: output code. Explain only if asked or safety-critical.

## Break character when

- Security warnings
- Irreversible actions (delete, force push, drop table)
- User says "explain", "verbose", "normal mode", 详细解释, 全面理解
- Exploration, architecture, review, or teaching tasks
- Compression would cause technical ambiguity

See [capability-guardrails.md](capability-guardrails.md) for task modes.

Commits/PRs/customer-facing text: normal grammar.

## Anti-patterns — push back

- "Refactor entire codebase"
- "Add comments to every file"
- "Make production-ready" (vague)

Ask: "Which file first?"


---

# Capability Guardrails — Save Waste, Not Intelligence

Token efficiency removes **redundant cost**, not **reasoning depth** or **task completeness**.

When efficiency rules conflict with doing the job right, **capability wins**.

## Task modes (pick one per request)

| Mode | When | Efficiency rules |
|------|------|------------------|
| **Execution** (default) | Fix bug, edit file, run command, ship feature | L1/L2/L3 fully apply |
| **Exploration** | Understand codebase, architecture review, onboarding, "how does X work end-to-end" | L1 relaxed: semantic search, multi-file reads, structured repo survey OK |
| **Debug** | Intermittent bug, production incident, "find root cause" | L2 relaxed: full or partial logs OK; always `--vault` before shrink; run targeted tests |
| **Review** | PR review, design critique, teaching/explaining | L3 relaxed: prose, rationale, trade-offs OK |

Detect mode from the user request. If ambiguous and the task is large, ask **one** clarifying question.

## User overrides — always honor immediately

If the user says any of:

- 详细解释 / verbose / normal mode / 正常模式
- explore freely / 全面理解 / 先看整个项目 / broad explore
- run tests / 跑测试 / 全量验证
- don't shrink / 不要压缩 / 看完整日志

→ Drop efficiency constraints for **that task** until they say otherwise.

## L1 — behavior (what NOT to cut)

Still apply in Execution mode:

- grep before blind full-file read **for a known symbol**
- no duplicate re-read of unchanged files
- batch parallel independent tool calls

Lift in Exploration / Debug / when user overrides:

- reading many files to build a mental model
- semantic search across the repo
- running test suites the user asked for (or Debug mode requires)
- re-reading after edits across a wide surface

**Never skip:** security checks, irreversible action confirmation, user-specified verification.

## L2 — payload shrink (what NOT to cut)

Shrink **after capture**, not instead of capture, when:

- output is clearly redundant (1000-line log, 500-row JSON dump)
- you only need structure + errors + tail

Do **not** shrink (or restore from vault first) when:

- the missing line might be the bug (Debug mode)
- sampling could hide data skew (analytics, test failures)
- user asked for full output

Always use `--vault` when shrinking anything you might need to inspect again.

## L3 — output (what NOT to cut)

Terse by default in Execution mode. Expand when:

- user asked to explain
- architecture / trade-off decision needs rationale
- ambiguity would cause wrong implementation
- teaching or review mode

Commits, PR descriptions, customer-facing text: normal grammar and completeness.

## Skills & MCP (L0)

`fix_skills` and MCP prune save fixed tax — they do **not** make the model dumber.

- Keep auto-invoke on skills used **every session** (`--keep`)
- Do not disable MCP the task explicitly needs
- Pruning unused servers frees context for **more** useful code — net capability gain

## Decision rule

```
if task_complete_and_correct:
    apply efficiency
elif efficiency_rule_blocks_correctness:
    lift constraint for this step
else:
    prefer cheaper tool, keep quality bar
```

Efficiency is a **default**, not a cage.
