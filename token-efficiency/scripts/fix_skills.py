#!/usr/bin/env python3
"""
Batch-set disable-model-invocation on rarely-used skills to cut L0 fixed tax.

Python 3.8+, stdlib only.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Set

CHARS_PER_TOKEN = 4

SEARCH_DIRS = [
    Path.home() / ".cursor" / "skills",
    Path.home() / ".codex" / "skills",
    Path.home() / ".agents" / "skills",
    Path.home() / ".claude" / "skills",
    Path.home() / ".hermes" / "skills",
]


@dataclass
class SkillRow:
    path: Path
    name: str
    est_tokens: int
    auto_invoke: bool


def parse_frontmatter(text: str) -> tuple[str, dict, str]:
    m = re.match(r"^(---\s*\n)(.*?)(\n---\s*\n)(.*)$", text, re.DOTALL)
    if not m:
        return "", {}, text
    meta: dict = {}
    for line in m.group(2).splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
    return m.group(1), meta, m.group(3) + m.group(4)


def est_tokens(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)


def scan_skills() -> List[SkillRow]:
    rows: List[SkillRow] = []
    seen: Set[str] = set()
    for base in SEARCH_DIRS:
        if not base.is_dir():
            continue
        for skill in base.rglob("SKILL.md"):
            key = str(skill.resolve())
            if key in seen:
                continue
            seen.add(key)
            text = skill.read_text(encoding="utf-8", errors="replace")
            _, meta, _ = parse_frontmatter(text)
            desc = meta.get("description", "")
            disabled = meta.get("disable-model-invocation", "false").lower() == "true"
            rows.append(
                SkillRow(
                    path=skill,
                    name=meta.get("name", skill.parent.name),
                    est_tokens=est_tokens(desc or text[:400]),
                    auto_invoke=not disabled,
                )
            )
    rows.sort(key=lambda r: -r.est_tokens)
    return rows


def set_on_demand(skill: Path, dry_run: bool) -> bool:
    text = skill.read_text(encoding="utf-8", errors="replace")
    prefix, meta, body = parse_frontmatter(text)
    if not prefix:
        return False
    if meta.get("disable-model-invocation", "").lower() == "true":
        return False
    meta["disable-model-invocation"] = "true"
    lines = [f"{k}: {v}" for k, v in meta.items()]
    new_text = prefix + "\n".join(lines) + body
    if not dry_run:
        backup = skill.with_suffix(".md.bak")
        if not backup.exists():
            backup.write_text(text, encoding="utf-8")
        skill.write_text(new_text, encoding="utf-8")
    return True


def main(argv: Optional[list] = None) -> int:
    parser = argparse.ArgumentParser(description="Set skills to on-demand invocation")
    parser.add_argument("--keep", default="", help="comma skill names to keep auto-invoke")
    parser.add_argument("--min-tokens", type=int, default=40, help="Only fix skills above this desc size")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--list", action="store_true", help="List auto-invoke skills only")
    args = parser.parse_args(argv)

    keep = {k.strip().lower() for k in args.keep.split(",") if k.strip()}
    rows = scan_skills()
    auto = [r for r in rows if r.auto_invoke]

    if args.list:
        print(f"Auto-invoke skills: {len(auto)}\n")
        for r in auto:
            flag = " KEEP" if r.name.lower() in keep else ""
            print(f"  ~{r.est_tokens:4} tok  {r.name}{flag}  {r.path}")
        return 0

    to_fix = [
        r
        for r in auto
        if r.est_tokens >= args.min_tokens and r.name.lower() not in keep
    ]
    mode = "WRITE" if args.write else "DRY-RUN"
    save = sum(r.est_tokens for r in to_fix)
    print(f"fix_skills [{mode}] — {len(to_fix)} skills, est save ~{save:,} tok/turn\n")

    changed = 0
    for r in to_fix:
        ok = set_on_demand(r.path, dry_run=not args.write)
        if ok:
            changed += 1
            print(f"  {'FIX' if args.write else 'WOULD FIX'}: {r.name} (~{r.est_tokens} tok)")

    if not args.write:
        print(f"\nRe-run with --write to apply. Use --keep name1,name2 to exclude.")
    else:
        print(f"\nApplied to {changed} skills (.md.bak backups created).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
