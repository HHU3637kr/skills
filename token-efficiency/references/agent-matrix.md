# Agent Matrix

## Install command

```bash
python3 scripts/install.py --write --project . --agents AGENTS --levers LEVERS
```

| Agent | `--agents` | Output paths |
|-------|------------|--------------|
| **Hermes** | `hermes` | `~/.hermes/skills/token-efficiency/` → 然后 `/reload-skills` |
| Cursor | `cursor` | `.cursor/rules/token-efficiency-*.mdc` |
| Claude Code | `claude-code` | append `AGENTS.md`, `CLAUDE.md` |
| Codex | `codex` | copy skill to `~/.codex/skills/token-efficiency` |
| Windsurf | `windsurf` | append `.windsurfrules` |
| Cline / Roo | `cline` | `AGENTS.md` + `.cursorrules` |
| Aider | `aider` | `TOKEN-EFFICIENCY.md` |
| Continue.dev | `continue` | `TOKEN-EFFICIENCY.md` + manual customRules |
| Gemini CLI | `gemini` | append `GEMINI.md` |
| Any other | `generic` | `TOKEN-EFFICIENCY.md` |

## Levers

| `--levers` | Layer | Source |
|------------|-------|--------|
| `0` | L0 context design | `core/context-design.md` |
| `1` | L1 behavior | `core/behavior-rules.md` |
| `3` | L3 output | `core/output-rules.md` |

Recommended first install: `--levers 1,3`  
Full stack: `--levers 0,1,3`

## Windows

```powershell
python scripts/install.py --write --project . --agents cursor,claude-code --levers 1,3
```

## Sync adapters after editing core

```bash
python3 scripts/sync_adapters.py
```
