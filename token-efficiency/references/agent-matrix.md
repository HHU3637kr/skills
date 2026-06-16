# Agent Matrix

## Supported agents (skill + rules)

| Agent | Skill (`install_skill.py`) | Rules (`install.py --agents`) |
|-------|---------------------------|-------------------------------|
| **Codex** | `codex` → `~/.codex/skills/` | `codex` |
| **Cursor** | `cursor` → `~/.cursor/skills/` | `cursor` → `.cursor/rules/` |
| **Claude Code** | `claude` → `~/.claude/skills/` | `claude-code` → `AGENTS.md` / `CLAUDE.md` |
| **Hermes** | `hermes` → `~/.hermes/skills/` + `/reload-skills` | `hermes` → `~/.hermes/SOUL.md` |
| **OpenClaw** | `openclaw` → `~/.openclaw/skills/` | `openclaw` → `~/.openclaw/workspace/SOUL.md` |
| **Generic agents** | `agents` → `~/.agents/skills/` | `generic` → `TOKEN-EFFICIENCY.md` |
| Windsurf | use `agents` or project rules | `windsurf` |
| Cline / Roo | use `agents` or project rules | `cline` |
| Aider | use `agents` or project rules | `aider` |
| Continue.dev | use `agents` + manual customRules | `continue` |
| Gemini CLI | use `agents` or project rules | `gemini` |

One-shot global skill install:

```bash
python3 scripts/install_skill.py --write
# all: codex,cursor,agents,claude,hermes,openclaw
```

## Install command

```bash
python3 scripts/install.py --write --project . --agents AGENTS --levers LEVERS
```

## Levers

| `--levers` | Layer | Source |
|------------|-------|--------|
| `0` | L0 context design | `core/context-design.md` |
| `1` | L1 behavior | `core/behavior-rules.md` |
| `2` | L2 payload shrink | `core/payload-rules.md` |
| `3` | L3 output | `core/output-rules.md` |

When `1`, `2`, or `3` is set, **`core/capability-guardrails.md` is included automatically** — efficiency must not suppress agent capability.

Recommended first install: `--levers 1,2,3`  
Full stack: `--levers 0,1,2,3`

## Windows

```powershell
python scripts/install.py --write --project . --agents cursor,claude-code,hermes,openclaw --levers 1,2,3
```

## Sync adapters after editing core

```bash
python3 scripts/sync_adapters.py
```
