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

Unfamiliar code: grep the symbol → read match ±20 lines. Never read 1000 lines to find one function.

## 6. No speculative explore

- User gave path → start there.
- User gave error → search error string first.
- Widen scope only after targeted approach fails.
- No "let me look around the repo first."

## 7. Build / test / lint

- No full test suite for typo fixes.
- No repo-wide lint/typecheck after one-file edits.
- Targeted check on changed file only when risky or user asked.
- User didn't ask for tests → don't run them.

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
- User says "explain", "verbose", "normal mode"
- Compression would cause technical ambiguity

Commits/PRs/customer-facing text: normal grammar.

## Anti-patterns — push back

- "Refactor entire codebase"
- "Add comments to every file"
- "Make production-ready" (vague)

Ask: "Which file first?"
