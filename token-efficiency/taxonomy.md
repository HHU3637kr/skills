# Token Taxonomy — L0 through L5

Root-cause model. Every fix maps to exactly one primary layer.

## L0 — Fixed tax (per turn, compounds)

**What:** Context injected on every LLM turn whether or not the task needs it.

**Sources:**
- `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, alwaysApply rules
- Skill descriptions in system prompt (auto-invoke skills)
- MCP tool JSON schemas (stateless APIs re-send tools each turn)
- User rules / workspace rules

**Detection:** `audit.py` → section `fixed_tax`

**Fixes (by typical ROI):**
1. Disable unused MCP servers
2. Set `disable-model-invocation: true` on rarely-used skills
3. Convert alwaysApply rules → glob-scoped rules
4. Compress/dedup instruction files (`compress.py`)
5. Landmines-only rewrite ([core/context-design.md](core/context-design.md))

**Expected impact:** 2K–50K tokens/turn depending on MCP + skill count

---

## L1 — Turn multiplier (agent behavior)

**What:** Extra LLM round-trips from inefficient tool use.

**Sources:**
- Re-reading files already in context
- Serial independent tool calls
- Speculative repo exploration
- Verification loops after done

**Detection:** Manual session review; future: turn-count heuristics

**Fixes:**
- Install [core/behavior-rules.md](core/behavior-rules.md) via adapter
- grep before read; offset/limit for large files
- Batch parallel reads
- Stop when done

**Expected impact:** 30–70% of agent-task tokens (GitHub gh-aw: turn count dominates)

---

## L2 — Context inflation (tool returns)

**What:** Large payloads piped back into context per turn.

**Sources:**
- Full file read (1000+ lines)
- Unbounded command output
- Wide semantic search results

**Fixes:**
- Targeted read with line range
- Pipe through `head`/`tail` for logs
- Narrow search scope first

**Expected impact:** 1K–10K tokens per offending call

---

## L3 — Output waste

**What:** Model generates more text than task requires.

**Sources:**
- Preamble ("Sure!", "Let me…")
- Post-edit summaries
- Full-file rewrite vs diff

**Fixes:**
- Install [core/output-rules.md](core/output-rules.md) via adapter
- Optional terse mode (lighter than caveman)

**Expected impact:** 40–70% output tokens on code tasks

---

## L4 — Session bloat

**What:** Conversation history grows unbounded.

**Sources:**
- Long multi-topic threads
- Repeated context from earlier turns

**Fixes:**
- Fork/new chat per task
- Checkpoint summary to file; start fresh
- Ask mode for Q&A (no tool overhead)

**Expected impact:** 60–90% on simple questions in agent mode

---

## L5 — Model mismatch

**What:** Expensive model for cheap work.

**Fixes:**
- Ask/explore with fast model; escalate for write
- Agent-specific — skill advises, does not enforce

---

## ROI ranking algorithm (audit.py)

```
score = estimated_tokens_saved × frequency × confidence
```

- L0 fixes: frequency = every turn → highest priority
- L1 fixes: frequency = every agent task
- L3 fixes: frequency = every response

Always report top 3 with layer tag and confidence (high/medium/low).
