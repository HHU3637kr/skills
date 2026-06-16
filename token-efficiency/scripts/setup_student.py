#!/usr/bin/env python3
"""
One-shot student setup: install skill + audit + optional skill fix preview.

Python 3.8+, stdlib only. v0.3
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from _paths import REPO_ROOT, VERSION


def run(cmd: list[str]) -> int:
    print(f"\n$ {' '.join(cmd)}\n")
    return subprocess.call(cmd, cwd=REPO_ROOT)


def main() -> int:
    parser = argparse.ArgumentParser(description="Student one-shot setup")
    parser.add_argument("--project", type=Path, default=Path.home())
    parser.add_argument("--skip-install", action="store_true")
    parser.add_argument("--fix-skills", action="store_true", help="Apply fix_skills --write")
    parser.add_argument("--keep", default="", help="Skills to keep auto-invoke (comma list)")
    args = parser.parse_args()

    py = sys.executable
    scripts = REPO_ROOT / "scripts"

    print(f"token-efficiency v{VERSION} — student setup")
    print(f"  project scope: {args.project.resolve()}")

    if not args.skip_install:
        if run([py, str(scripts / "install_skill.py"), "--write"]) != 0:
            return 1

    if run([py, str(scripts / "audit.py"), "--project", str(args.project)]) != 0:
        return 1

    ledger = scripts / "ledger_report.py"
    if ledger.is_file():
        run([py, str(ledger)])  # ok if no ledger

    if args.fix_skills:
        cmd = [py, str(scripts / "fix_skills.py"), "--write"]
        if args.keep:
            cmd.extend(["--keep", args.keep])
        run(cmd)
    else:
        run([py, str(scripts / "fix_skills.py"), "--list"])

    print("\n--- Next ---")
    print("1. Save baseline + install rules to your repo:")
    print(f"   {py} scripts/perf.py --save-baseline")
    print(f"   {py} scripts/install.py --write --project YOUR_REPO --agents cursor,claude-code,hermes --levers 1,2,3")
    print("2. Re-audit / compare:")
    print(f"   {py} scripts/perf.py --compare-baseline")
    print("3. Large tool output → shrink before agent reads:")
    print(f"   {py} scripts/shrink.py OUTPUT --vault -o OUTPUT.shrunk")
    print("4. Read docs/学员安装指南.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
