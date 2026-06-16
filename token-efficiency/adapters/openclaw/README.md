# Token Efficiency — OpenClaw Adapter

## Skill install (global)

```bash
python3 scripts/install_skill.py --write --targets openclaw
```

→ `~/.openclaw/skills/token-efficiency/`

## Project / workspace rules

```bash
python3 scripts/install.py --write --agents openclaw --levers 1,2,3
```

Appends to:

- `~/.openclaw/workspace/SOUL.md`
- `~/.openclaw/workspace/AGENTS.md`

Includes **capability guardrails** automatically (save waste, not intelligence).

## Invoke

Say: **token audit** / **省 token** / **save tokens**

## Notes

- OpenClaw legacy installs may use `~/.clawdbot` or `~/.moltbot` — copy skill to that tree's `skills/` if needed, or migrate to Hermes with `hermes claw migrate`.
- Optional ledger: `audit.py --with-ledger` if Phoenix token_ledger is present.
