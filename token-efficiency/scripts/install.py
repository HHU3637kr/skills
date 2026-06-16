#!/usr/bin/env python3
"""
token-efficiency install — emit rules from core/ to any agent, any OS.

Python 3.8+, stdlib only. Win / Mac / Linux / WSL.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path
from typing import Callable, Dict, List, Set

from _paths import ADAPTERS, BEHAVIOR, CAPABILITY, CONTEXT, CORE, MARKER, OUTPUT, PAYLOAD, REPO_ROOT, VERSION

ALL_AGENTS = (
    "cursor",
    "claude-code",
    "codex",
    "windsurf",
    "hermes",
    "openclaw",
    "cline",
    "aider",
    "continue",
    "gemini",
    "generic",
)


def read_core(name: Path) -> str:
    return name.read_text(encoding="utf-8")


def collect_rule_parts(levers: Set[str]) -> List[str]:
    """L1/L2/L3 + capability guardrails (auto-included with any rule lever)."""
    parts: List[str] = []
    if "1" in levers:
        parts.append(read_core(BEHAVIOR))
    if "2" in levers:
        parts.append(read_core(PAYLOAD))
    if "3" in levers:
        parts.append(read_core(OUTPUT))
    if levers & {"1", "2", "3"}:
        parts.append(read_core(CAPABILITY))
    return parts


def install_capability_cursor(
    dest: Path, levers: Set[str], dry_run: bool, merge: bool, actions: List[str]
) -> None:
    if not levers & {"1", "2", "3"}:
        return
    body = read_core(CAPABILITY)
    content = mdc_frontmatter(
        "Token efficiency — capability guardrails (save waste, not intelligence)", False
    ) + body
    actions.append(write_file(dest / "token-efficiency-capability.mdc", content, dry_run, merge))


def mdc_frontmatter(description: str, always: bool = False) -> str:
    apply = "true" if always else "false"
    return f"""---
description: {description}
globs:
alwaysApply: {apply}
---

"""


def append_marked(path: Path, title: str, body: str, dry_run: bool) -> str:
    marker = f"{MARKER} {title}"
    if path.exists():
        text = path.read_text(encoding="utf-8", errors="replace")
        if marker in text:
            return f"SKIP (exists): {path}"
    block = f"\n\n{marker}\n\n{body}\n"
    action = f"APPEND: {path}"
    if not dry_run:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(block)
    return action


def write_file(path: Path, content: str, dry_run: bool, merge: bool) -> str:
    if path.exists() and merge:
        return f"SKIP (exists): {path}"
    action = f"WRITE: {path}"
    if not dry_run:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return action


def install_cursor(project: Path, levers: Set[str], dry_run: bool, merge: bool) -> List[str]:
    actions: List[str] = []
    dest = project / ".cursor" / "rules"
    if "1" in levers:
        body = read_core(BEHAVIOR)
        content = mdc_frontmatter("Token efficiency L1 — agent tool-call discipline", False) + body
        actions.append(write_file(dest / "token-efficiency-behavior.mdc", content, dry_run, merge))
    if "2" in levers:
        body = read_core(PAYLOAD)
        content = mdc_frontmatter("Token efficiency L2 — payload shrink discipline", False) + body
        actions.append(write_file(dest / "token-efficiency-payload.mdc", content, dry_run, merge))
    if "3" in levers:
        body = read_core(OUTPUT)
        content = mdc_frontmatter("Token efficiency L3 — output discipline", False) + body
        actions.append(write_file(dest / "token-efficiency-output.mdc", content, dry_run, merge))
    if "0" in levers:
        body = read_core(CONTEXT)
        content = mdc_frontmatter("Token efficiency L0 — context landmines", False) + body
        actions.append(write_file(dest / "token-efficiency-context.mdc", content, dry_run, merge))
    install_capability_cursor(dest, levers, dry_run, merge, actions)
    return actions


def install_claude_code(project: Path, levers: Set[str], dry_run: bool, _: bool) -> List[str]:
    actions: List[str] = []
    parts = collect_rule_parts(levers)
    if parts:
        labeled: List[str] = []
        if "1" in levers:
            labeled.append("### L1 Behavior\n\n" + read_core(BEHAVIOR))
        if "2" in levers:
            labeled.append("### L2 Payload\n\n" + read_core(PAYLOAD))
        if "3" in levers:
            labeled.append("### L3 Output\n\n" + read_core(OUTPUT))
        if levers & {"1", "2", "3"}:
            labeled.append("### Capability Guardrails\n\n" + read_core(CAPABILITY))
        actions.append(append_marked(project / "AGENTS.md", "rules", "\n\n".join(labeled), dry_run))
    if "0" in levers:
        actions.append(append_marked(project / "CLAUDE.md", "context", read_core(CONTEXT), dry_run))
    return actions


def install_windsurf(project: Path, levers: Set[str], dry_run: bool, _: bool) -> List[str]:
    parts = []
    if "0" in levers:
        parts.append(read_core(CONTEXT))
    parts.extend(collect_rule_parts(levers))
    body = "\n\n---\n\n".join(parts)
    return [append_marked(project / ".windsurfrules", "rules", body, dry_run)]


def install_generic(project: Path, levers: Set[str], dry_run: bool, merge: bool) -> List[str]:
    parts = ["# Token Efficiency Rules\n"]
    if "0" in levers:
        parts.append(read_core(CONTEXT))
    parts.extend(collect_rule_parts(levers))
    content = "\n\n".join(parts)
    return [write_file(project / "TOKEN-EFFICIENCY.md", content, dry_run, merge)]


def install_codex(project: Path, levers: Set[str], dry_run: bool, merge: bool) -> List[str]:
    actions: List[str] = []
    targets = [
        project / ".codex" / "skills" / "token-efficiency",
        Path.home() / ".codex" / "skills" / "token-efficiency",
    ]
    for dest in targets:
        if dest.exists() and merge:
            actions.append(f"SKIP (exists): {dest}")
            continue
        actions.append(f"COPY TREE: {REPO_ROOT} → {dest}")
        if not dry_run:
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(
                REPO_ROOT,
                dest,
                ignore=shutil.ignore_patterns(
                    "__pycache__", "*.pyc", ".git", ".DS_Store", "Thumbs.db"
                ),
            )
    if levers & {"0", "1", "2", "3"}:
        actions.append("NOTE: codex skill installed; invoke with token audit / save tokens")
    return actions


def install_gemini(project: Path, levers: Set[str], dry_run: bool, _: bool) -> List[str]:
    parts = collect_rule_parts(levers)
    return [append_marked(project / "GEMINI.md", "rules", "\n\n".join(parts), dry_run)]


def install_cline(project: Path, levers: Set[str], dry_run: bool, merge: bool) -> List[str]:
    actions = install_claude_code(project, levers, dry_run, False)
    body = "\n\n".join(collect_rule_parts(levers))
    actions.append(append_marked(project / ".cursorrules", "rules", body, dry_run))
    return actions


def install_aider(project: Path, levers: Set[str], dry_run: bool, merge: bool) -> List[str]:
    return install_generic(project, levers, dry_run, merge)


def install_continue(project: Path, levers: Set[str], dry_run: bool, merge: bool) -> List[str]:
    actions = install_generic(project, levers, dry_run, merge)
    actions.append("NOTE: add TOKEN-EFFICIENCY.md to Continue customRules in config")
    return actions


def install_hermes(project: Path, levers: Set[str], dry_run: bool, _: bool) -> List[str]:
    actions: List[str] = []
    actions.append("NOTE: Hermes skill → ~/.hermes/skills/token-efficiency/ (use install_skill.py)")
    actions.append("NOTE: After install, run /reload-skills in Hermes TUI")
    soul = Path.home() / ".hermes" / "SOUL.md"
    parts = collect_rule_parts(levers)
    if parts:
        actions.append(append_marked(soul, "rules", "\n\n".join(parts), dry_run))
    if "0" in levers:
        actions.append(append_marked(soul, "context", read_core(CONTEXT), dry_run))
    return actions


def install_openclaw(project: Path, levers: Set[str], dry_run: bool, _: bool) -> List[str]:
    actions: List[str] = []
    actions.append("NOTE: OpenClaw skill → ~/.openclaw/skills/token-efficiency/ (use install_skill.py)")
    workspace = Path.home() / ".openclaw" / "workspace"
    soul = workspace / "SOUL.md"
    agents = workspace / "AGENTS.md"
    parts = collect_rule_parts(levers)
    if parts:
        actions.append(append_marked(soul, "rules", "\n\n".join(parts), dry_run))
        actions.append(append_marked(agents, "rules", "\n\n".join(parts), dry_run))
    if "0" in levers:
        ctx = read_core(CONTEXT)
        actions.append(append_marked(soul, "context", ctx, dry_run))
    return actions


INSTALLERS: Dict[str, Callable[..., List[str]]] = {
    "cursor": install_cursor,
    "claude-code": install_claude_code,
    "codex": install_codex,
    "windsurf": install_windsurf,
    "hermes": install_hermes,
    "openclaw": install_openclaw,
    "cline": install_cline,
    "aider": install_aider,
    "continue": install_continue,
    "gemini": install_gemini,
    "generic": install_generic,
}


def parse_list(s: str) -> List[str]:
    return [x.strip().lower() for x in s.split(",") if x.strip()]


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Install token-efficiency rules (all agents, all platforms)"
    )
    parser.add_argument("--project", type=Path, default=Path.cwd())
    parser.add_argument("--agents", default="cursor,claude-code", help=f"comma list: {','.join(ALL_AGENTS)}")
    parser.add_argument("--levers", default="1,2,3", help="0=context 1=behavior 2=payload 3=output")
    parser.add_argument("--write", action="store_true", help="Apply changes")
    parser.add_argument("--merge", action="store_true", default=True, help="Skip existing files")
    parser.add_argument("--force", action="store_true", help="Overwrite existing adapter files")
    args = parser.parse_args(argv)

    agents = parse_list(args.agents)
    unknown = set(agents) - set(ALL_AGENTS)
    if unknown:
        print(f"Unknown agents: {', '.join(sorted(unknown))}", file=sys.stderr)
        return 1

    levers = set(parse_list(args.levers.replace("0", "0")))  # keep 0
    levers = {x for x in args.levers.split(",") if x.strip()}
    dry_run = not args.write
    merge = not args.force
    project = args.project.resolve()

    print(f"token-efficiency install v{VERSION}")
    print(f"  project: {project}")
    print(f"  agents:  {', '.join(agents)}")
    print(f"  levers:  {', '.join(sorted(levers))}")
    print(f"  mode:    {'WRITE' if args.write else 'DRY-RUN'}")
    print()

    all_actions: List[str] = []
    for agent in agents:
        fn = INSTALLERS[agent]
        all_actions.extend(fn(project, levers, dry_run, merge))

    for line in all_actions:
        print(line)

    if dry_run:
        print("\nRe-run with --write to apply.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
