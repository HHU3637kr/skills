---
name: token-efficiency
description: >-
  Cross-platform token audit and optimization for AI coding agents (Cursor, Codex,
  Claude Code, Windsurf, Cline, OpenClaw, Gemini CLI, Aider). Scans always-on
  context, MCP tools, skills; ranks ROI fixes; installs L0-L3 rules. Use for save
  tokens, token audit, context bloat, MCP prune, reduce API cost, agent efficiency.
disable-model-invocation: true
---

# Token Efficiency v0.2.0

**Prime directive:** Audit before adding rules. Rules are fixed tax too.

## 学员 / 讲师

```bash
# 讲师打包
python3 scripts/package_release.py   # → dist/token-efficiency-0.2.0.zip

# 学员解压后
bash install.sh
python3 scripts/setup_student.py
```

文档：`docs/学员安装指南.md` · `docs/架构说明.md` · `docs/节省效果说明.md`

## Quick commands

```bash
# Install skill globally (once)
bash install.sh
# or: python3 scripts/install_skill.py --write

# Audit + optional Phoenix ledger
python3 scripts/audit.py --project . --with-ledger

# Fix auto-invoke skills (L0)
python3 scripts/fix_skills.py --list
python3 scripts/fix_skills.py --write --keep skill-a,skill-b

# Compress bloated CLAUDE.md
python3 scripts/compress.py CLAUDE.md --write

# Install rules to project
python3 scripts/install.py --write --agents cursor,claude-code --levers 1,3
```

Windows: replace `python3` with `python` or `py -3`.

## Workflow

1. **AUDIT** — `scripts/audit.py` → fixed tax + duplicates + ROI fixes
2. **FIX L0** — MCP prune, skill on-demand, compress, dedup
3. **FIX L1/L3** — `scripts/install.py` → behavior + output rules
4. **VERIFY** — re-run audit; compare summary table

## Six layers

| L | Layer | Fix tool |
|---|-------|----------|
| L0 | Fixed tax | audit, compress, MCP edit |
| L1 | Turn multiplier | install levers 1 |
| L2 | Context inflation | behavior rules (grep, offset read) |
| L3 | Output waste | install levers 3 |
| L4 | Session bloat | new chat / Ask mode — see context-design |
| L5 | Model mismatch | user picks tier — see context-design |

Details: [taxonomy.md](taxonomy.md)

## Supported agents

cursor · claude-code · codex · windsurf · cline · aider · continue · gemini · generic

Matrix: [references/agent-matrix.md](references/agent-matrix.md)

## References

- [competitive-edge.md](references/competitive-edge.md) — why we win vs GitHub
- [platform-notes.md](references/platform-notes.md) — Win/Mac/Linux/WSL
- [sources.md](references/sources.md) — attribution

## Agent execution rules (when this skill is active)

- Run audit before proposing new always-on rules
- Present top 3 ROI fixes with layer tags
- One lever at a time unless user asks batch
- Never claim exact dollar savings without user's pricing data
