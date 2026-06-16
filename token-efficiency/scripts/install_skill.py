#!/usr/bin/env python3
"""
Install token-efficiency skill to user skill directories.

Standalone use: makes the skill available to Codex / Cursor / agents runtimes.
Python 3.8+, stdlib only. Win / Mac / Linux / WSL.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path
from typing import Dict, List

from _paths import REPO_ROOT

IGNORE = shutil.ignore_patterns(
    "__pycache__", "*.pyc", ".git", ".DS_Store", "Thumbs.db", "*.bak"
)

TARGETS: Dict[str, Path] = {
    "codex": Path.home() / ".codex" / "skills" / "token-efficiency",
    "cursor": Path.home() / ".cursor" / "skills" / "token-efficiency",
    "agents": Path.home() / ".agents" / "skills" / "token-efficiency",
    "claude": Path.home() / ".claude" / "skills" / "token-efficiency",
    "hermes": Path.home() / ".hermes" / "skills" / "token-efficiency",
    "openclaw": Path.home() / ".openclaw" / "skills" / "token-efficiency",
}


def install_one(dest: Path, dry_run: bool) -> str:
    if dest.exists():
        action = f"REPLACE: {dest}"
        if not dry_run:
            shutil.rmtree(dest)
    else:
        action = f"INSTALL: {dest}"
    if not dry_run:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(REPO_ROOT, dest, ignore=IGNORE)
    return action


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Install token-efficiency skill globally")
    parser.add_argument(
        "--targets",
        default="codex,cursor,agents,claude,hermes,openclaw",
        help="comma list: codex,cursor,agents,claude,hermes,openclaw",
    )
    parser.add_argument("--write", action="store_true", help="Apply (default dry-run)")
    args = parser.parse_args(argv)

    names = [t.strip().lower() for t in args.targets.split(",") if t.strip()]
    unknown = set(names) - set(TARGETS)
    if unknown:
        print(f"Unknown targets: {', '.join(sorted(unknown))}", file=sys.stderr)
        return 1

    print(f"token-efficiency skill installer")
    print(f"  source:  {REPO_ROOT}")
    print(f"  mode:    {'WRITE' if args.write else 'DRY-RUN'}")
    print()

    for name in names:
        print(install_one(TARGETS[name], dry_run=not args.write))

    if not args.write:
        print("\nRe-run with --write to install.")
    else:
        print("\nDone. Invoke: token audit / 省 token / save tokens")
        print("Hermes users: run /reload-skills in TUI after install")
        print("OpenClaw users: restart gateway or reload skills if your build supports it")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
