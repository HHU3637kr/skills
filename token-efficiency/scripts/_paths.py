#!/usr/bin/env python3
"""Shared paths and version for token-efficiency."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CORE = REPO_ROOT / "core"
ADAPTERS = REPO_ROOT / "adapters"
DIST = REPO_ROOT / "dist"

BEHAVIOR = CORE / "behavior-rules.md"
PAYLOAD = CORE / "payload-rules.md"
OUTPUT = CORE / "output-rules.md"
CONTEXT = CORE / "context-design.md"
CAPABILITY = CORE / "capability-guardrails.md"
MARKER = "<!-- token-efficiency -->"

VERSION_FILE = REPO_ROOT / "VERSION"
VERSION = VERSION_FILE.read_text(encoding="utf-8").strip() if VERSION_FILE.is_file() else "0.3.1"

# Optional ledger paths (e.g. Hermes ~/.hermes/phoenix/data/token_ledger.jsonl)
LEDGER_CANDIDATES = [
    Path.home() / ".hermes" / "phoenix" / "data" / "token_ledger.jsonl",
    Path.home() / ".phoenix" / "data" / "token_ledger.jsonl",
    Path.home() / "phoenix_v52_data" / "memory" / "token_ledger.jsonl",
]
