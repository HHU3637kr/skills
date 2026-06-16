#!/usr/bin/env python3
"""
Parse token_ledger.jsonl — tier/model spend patterns (Hermes 等环境可选).

Python 3.8+, stdlib only. v0.2
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from _paths import LEDGER_CANDIDATES, VERSION


@dataclass
class LedgerSummary:
    path: str
    total_events: int = 0
    confirm_boxes: int = 0
    api_results: int = 0
    by_tier: Dict[str, int] = field(default_factory=dict)
    by_model: Dict[str, int] = field(default_factory=dict)
    tier_cost_min: Dict[str, float] = field(default_factory=lambda: defaultdict(float))
    tier_cost_max: Dict[str, float] = field(default_factory=lambda: defaultdict(float))
    top_previews: List[str] = field(default_factory=list)


def find_ledger(explicit: Optional[Path]) -> Optional[Path]:
    if explicit and explicit.is_file():
        return explicit
    env = os.environ.get("TOKEN_EFFICIENCY_LEDGER") or os.environ.get("PHOENIX_TOKEN_LEDGER")
    if env:
        p = Path(env).expanduser()
        if p.is_file():
            return p
    for p in LEDGER_CANDIDATES:
        if p.is_file():
            return p
    return None


def load_summary(path: Path) -> LedgerSummary:
    s = LedgerSummary(path=str(path))
    previews: Counter = Counter()
    with path.open(encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            s.total_events += 1
            ev = row.get("event", "")
            if ev == "confirm_box":
                s.confirm_boxes += 1
                tier = row.get("tier", "unknown")
                s.by_tier[tier] = s.by_tier.get(tier, 0) + 1
                model = row.get("model", "unknown")
                s.by_model[model] = s.by_model.get(model, 0) + 1
                s.tier_cost_min[tier] += float(row.get("cost_min", 0) or 0)
                s.tier_cost_max[tier] += float(row.get("cost_max", 0) or 0)
                prev = row.get("task_preview", "")
                if prev:
                    previews[prev[:60]] += 1
            elif ev == "api_result":
                s.api_results += 1
    s.top_previews = [p for p, _ in previews.most_common(8)]
    return s


def render(s: LedgerSummary) -> str:
    lines = [
        "# Token Ledger Report",
        "",
        f"- **Version:** token-efficiency {VERSION}",
        f"- **Ledger:** `{s.path}`",
        f"- **Events:** {s.total_events} (confirm_box: {s.confirm_boxes}, api_result: {s.api_results})",
        "",
        "## By tier (confirm_box cost sum)",
        "",
        "| Tier | Count | Cost min (sum) | Cost max (sum) |",
        "|------|-------|----------------|----------------|",
    ]
    for tier in sorted(s.by_tier.keys()):
        lines.append(
            f"| {tier} | {s.by_tier[tier]} | ${s.tier_cost_min.get(tier, 0):.4f} | ${s.tier_cost_max.get(tier, 0):.4f} |"
        )

    lines.extend(["", "## By model", ""])
    for model, n in sorted(s.by_model.items(), key=lambda x: -x[1])[:10]:
        lines.append(f"- `{model}`: {n} confirm boxes")

    if s.top_previews:
        lines.extend(["", "## Frequent task previews", ""])
        for p in s.top_previews:
            lines.append(f"- {p}")

    lines.extend(
        [
            "",
            "## L5 hints (model tier)",
            "",
            "- Heavy tiers (`god`, `deep`, Opus) on small tasks → switch to daily/fast for explore",
            "- Run `audit.py` for L0 fixed tax; ledger shows L5 usage patterns",
            "",
        ]
    )
    return "\n".join(lines)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Token ledger report (optional, e.g. Hermes)")
    parser.add_argument("--ledger", type=Path, help="Path to token_ledger.jsonl")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    path = find_ledger(args.ledger)
    if not path:
        print("No ledger found. Tried:", file=sys.stderr)
        for p in LEDGER_CANDIDATES:
            print(f"  {p}", file=sys.stderr)
        print("Use --ledger PATH or set TOKEN_EFFICIENCY_LEDGER", file=sys.stderr)
        return 1

    summary = load_summary(path)
    if args.json:
        import dataclasses

        print(json.dumps(dataclasses.asdict(summary), indent=2, ensure_ascii=False))
    else:
        print(render(summary))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
