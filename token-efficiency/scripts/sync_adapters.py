#!/usr/bin/env python3
"""Sync core/*.md → adapters/ for manual installs and repo previews."""

from __future__ import annotations

from pathlib import Path

from _paths import ADAPTERS, BEHAVIOR, CONTEXT, OUTPUT, REPO_ROOT


def mdc(desc: str, body: str) -> str:
    return f"""---
description: {desc}
globs:
alwaysApply: false
---

{body}"""


def main() -> None:
    cursor = ADAPTERS / "cursor"
    cursor.mkdir(parents=True, exist_ok=True)
    (cursor / "token-efficiency-behavior.mdc").write_text(
        mdc("Token efficiency L1 — agent tool-call discipline", BEHAVIOR.read_text(encoding="utf-8")),
        encoding="utf-8",
    )
    (cursor / "token-efficiency-output.mdc").write_text(
        mdc("Token efficiency L3 — output discipline", OUTPUT.read_text(encoding="utf-8")),
        encoding="utf-8",
    )
    (cursor / "token-efficiency-context.mdc").write_text(
        mdc("Token efficiency L0 — context landmines", CONTEXT.read_text(encoding="utf-8")),
        encoding="utf-8",
    )

    cc = ADAPTERS / "claude-code"
    cc.mkdir(parents=True, exist_ok=True)
    (cc / "AGENTS-behavior.snippet.md").write_text(BEHAVIOR.read_text(encoding="utf-8"), encoding="utf-8")
    (cc / "AGENTS-output.snippet.md").write_text(OUTPUT.read_text(encoding="utf-8"), encoding="utf-8")
    (cc / "CLAUDE.snippet.md").write_text(CONTEXT.read_text(encoding="utf-8"), encoding="utf-8")

    generic = ADAPTERS / "generic" / "RULES.md"
    generic.write_text(
        "# Token Efficiency\n\n"
        + CONTEXT.read_text(encoding="utf-8")
        + "\n\n---\n\n"
        + BEHAVIOR.read_text(encoding="utf-8")
        + "\n\n---\n\n"
        + OUTPUT.read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    print(f"Synced adapters from {REPO_ROOT / 'core'}")


if __name__ == "__main__":
    main()
