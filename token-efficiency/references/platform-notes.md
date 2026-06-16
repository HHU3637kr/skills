# Platform Notes

Cross-platform paths and constraints. Python stdlib scripts target all four environments.

## Supported platforms

| OS | Shell | Python | Notes |
|----|-------|--------|-------|
| macOS | zsh/bash | `python3` | Primary dev |
| Linux | bash | `python3` | Native |
| Ubuntu | bash | `python3` | Same as Linux |
| WSL | bash | `python3` | Use Linux paths; `/mnt/c/...` for Windows files |
| Windows | PowerShell/cmd | `python` or `py -3` | install.py detects via `os.name == 'nt'` |

## Path conventions

```
Home (Unix):     Path.home()  → /Users/you
Home (Windows):  Path.home()  → C:\Users\you
Project:         --project .  → cwd or explicit path
```

## Skill search paths (audit.py)

| Path | Platform |
|------|----------|
| `~/.cursor/skills/` | all |
| `~/.codex/skills/` | all |
| `~/.agents/skills/` | all |
| `~/.claude/skills/` | all |
| `.cursor/skills/` | project |
| `.codex/skills/` | project |

## MCP config paths (audit.py)

| Agent | Config file |
|-------|-------------|
| Cursor | `.cursor/mcp.json`, `~/.cursor/mcp.json` |
| Codex | `~/.codex/config.toml` (TBD parse) |
| Claude Code | `~/.claude/settings.json` (TBD) |

## Script invocation

```bash
# Unix / WSL / macOS
python3 scripts/audit.py --project .

# Windows PowerShell
python scripts/audit.py --project .

# Windows if python3 missing
py -3 scripts/audit.py --project .
```

## Dependencies

- Python 3.8+
- stdlib only in v0.x
- Optional: `tiktoken` for accurate counts (`--accurate` flag, v0.2)

## Encoding

All text files UTF-8. Scripts use `encoding="utf-8"` on read/write.

## Line endings

Adapters emit LF. Git `core.autocrlf` handles Windows checkout.
