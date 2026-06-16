---
name: token-efficiency
description: >-
  Cross-platform token audit and optimization for AI coding agents (Cursor, Codex,
  Claude Code, Hermes, Windsurf, Cline, OpenClaw, Gemini CLI, Aider). Scans always-on
  context, MCP tools, skills; ranks ROI fixes; installs L0-L3 rules; shrinks large tool
  outputs. Use for save tokens, token audit, context bloat, MCP prune, reduce API cost,
  agent efficiency, payload shrink.
disable-model-invocation: true
---

# Token Efficiency v0.3.1

**Prime directive:** Audit before adding rules. Rules are fixed tax too.

**Capability promise:** Save waste, not intelligence. Guardrails ship with every rule install.

## 学员 / 讲师

```bash
# 讲师打包
python3 scripts/package_release.py   # → dist/token-efficiency-0.3.1.zip

# 学员解压后
bash install.sh
python3 scripts/setup_student.py
```

文档：`docs/学员安装指南.md` · `docs/能力保障说明.md` · `docs/架构说明.md`

## Quick commands

```bash
# Install skill globally (once)
bash install.sh
# or: python3 scripts/install_skill.py --write

# Audit + optional ledger
python3 scripts/audit.py --project . --with-ledger

# Fix auto-invoke skills (L0)
python3 scripts/fix_skills.py --list
python3 scripts/fix_skills.py --write --keep skill-a,skill-b

# Compress bloated CLAUDE.md (L0)
python3 scripts/compress.py CLAUDE.md --write

# Shrink large tool output (L2)
python3 scripts/shrink.py build.log --vault -o build.log.shrunk

# Before/after savings report
python3 scripts/perf.py --save-baseline
python3 scripts/perf.py --compare-baseline

# Install rules to project
python3 scripts/install.py --write --agents cursor,claude-code,hermes,openclaw,codex --levers 1,2,3
```

Windows: replace `python3` with `python` or `py -3`.

## Workflow

1. **AUDIT** — `scripts/audit.py` → fixed tax + duplicates + ROI fixes
2. **FIX L0** — MCP prune, skill on-demand, compress, dedup
3. **FIX L1/L2/L3** — `scripts/install.py` → behavior + payload + output + **capability guardrails**
4. **VERIFY** — `scripts/perf.py --compare-baseline` or re-run audit

## Six layers

| L | Layer | Fix tool |
|---|-------|----------|
| L0 | Fixed tax | audit, compress, MCP edit |
| L1 | Turn multiplier | install lever 1 |
| L2 | Context inflation | install lever 2 + shrink.py (+ vault restore) |
| L3 | Output waste | install lever 3 |
| L4 | Session bloat | new chat / Ask mode — see context-design |
| L5 | Model mismatch | user picks tier — see context-design |

Details: [taxonomy.md](taxonomy.md)

## Supported agents

cursor · claude-code · codex · hermes · openclaw · windsurf · cline · aider · continue · gemini · generic

Matrix: [references/agent-matrix.md](references/agent-matrix.md)

## References

- [capabilities.md](references/capabilities.md) — full feature stack
- [platform-notes.md](references/platform-notes.md) — Win/Mac/Linux/WSL
- [design-principles.md](references/design-principles.md) — architecture notes

## Agent execution rules (when this skill is active)

- Run audit before proposing new always-on rules
- Present top 3 ROI fixes with layer tags
- One lever at a time unless user asks batch
- **Never let efficiency block correct task completion** — see capability-guardrails.md
- Use shrink.py with `--vault` for tool output > ~4K est. tokens; restore if detail missing
- Honor user overrides: 详细解释 / explore freely / run tests / 看完整日志
- Never claim exact dollar savings without user's pricing data
