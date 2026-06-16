#!/usr/bin/env python3
"""
token-efficiency audit — cross-platform context scanner.

Python 3.8+, stdlib only. Win / Mac / Linux / WSL.
"""

from __future__ import annotations

import argparse
import json
import platform
import re
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

from _paths import VERSION

CHARS_PER_TOKEN = 4

SKILL_SEARCH_DIRS = [
    Path.home() / ".cursor" / "skills",
    Path.home() / ".codex" / "skills",
    Path.home() / ".agents" / "skills",
    Path.home() / ".claude" / "skills",
    Path.home() / ".hermes" / "skills",
]

PROJECT_ALWAYS_ON = ["CLAUDE.md", "AGENTS.md", "GEMINI.md", ".cursorrules", ".windsurfrules"]

MCP_PATHS = [
    Path.home() / ".cursor" / "mcp.json",
    Path(".cursor") / "mcp.json",
    Path.home() / ".codex" / "mcp.json",
]


@dataclass
class FileFinding:
    path: str
    bytes: int
    est_tokens: int
    layer: str
    note: str = ""


@dataclass
class DupFinding:
    file_a: str
    file_b: str
    similarity: float
    est_waste_tokens: int


@dataclass
class FixRecommendation:
    rank: int
    layer: str
    title: str
    est_save_tokens: int
    confidence: str
    action: str


@dataclass
class AuditReport:
    version: str = VERSION
    timestamp: str = ""
    project: str = ""
    platform: str = ""
    agents_detected: List[str] = field(default_factory=list)
    findings: List[FileFinding] = field(default_factory=list)
    duplicates: List[DupFinding] = field(default_factory=list)
    fixes: List[FixRecommendation] = field(default_factory=list)
    summary: dict = field(default_factory=dict)


def est_tokens(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def parse_yaml_frontmatter(text: str) -> dict:
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return {}
    out: dict = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            out[k.strip()] = v.strip()
    return out


def detect_agents(project: Path) -> List[str]:
    agents: List[str] = []
    checks = [
        ("cursor", lambda: (project / ".cursor").exists()),
        ("claude-code", lambda: (project / "CLAUDE.md").exists() or (project / ".claude").exists()),
        ("codex", lambda: (project / ".codex").exists() or (Path.home() / ".codex").exists()),
        ("windsurf", lambda: (project / ".windsurfrules").exists()),
        ("hermes", lambda: (Path.home() / ".hermes").is_dir()),
        ("gemini", lambda: (project / "GEMINI.md").exists()),
        ("aider", lambda: (project / ".aider.conf.yml").exists()),
    ]
    for name, fn in checks:
        if fn():
            agents.append(name)
    if not agents:
        agents.append("generic")
    return agents


def scan_always_on(project: Path) -> List[FileFinding]:
    findings: List[FileFinding] = []
    for name in PROJECT_ALWAYS_ON:
        p = project / name
        if p.is_file():
            findings.append(
                FileFinding(str(p), p.stat().st_size, est_tokens(read_text(p)), "L0", "always-on")
            )

    home_claude = Path.home() / "CLAUDE.md"
    if home_claude.is_file():
        findings.append(
            FileFinding(
                str(home_claude),
                home_claude.stat().st_size,
                est_tokens(read_text(home_claude)),
                "L0",
                "global user CLAUDE.md",
            )
        )

    rules = project / ".cursor" / "rules"
    if rules.is_dir():
        for p in sorted(rules.glob("*.mdc")):
            text = read_text(p)
            always = re.search(r"alwaysApply:\s*true", text, re.I) is not None
            findings.append(
                FileFinding(
                    str(p),
                    p.stat().st_size,
                    est_tokens(text),
                    "L0",
                    "alwaysApply" if always else "glob-scoped",
                )
            )
    return findings


def scan_skills(extra: Iterable[Path]) -> Tuple[List[FileFinding], int, int]:
    findings: List[FileFinding] = []
    auto_count = 0
    on_demand = 0
    seen: Set[str] = set()
    for base in list(SKILL_SEARCH_DIRS) + list(extra):
        if not base.is_dir():
            continue
        for skill in base.rglob("SKILL.md"):
            key = str(skill.resolve())
            if key in seen:
                continue
            seen.add(key)
            text = read_text(skill)
            meta = parse_yaml_frontmatter(text)
            desc = meta.get("description", "")
            disabled = meta.get("disable-model-invocation", "false").lower() == "true"
            tok = est_tokens(desc if desc else text[:400])
            note = "on-demand" if disabled else "auto-invoke"
            if disabled:
                on_demand += 1
            else:
                auto_count += 1
            findings.append(FileFinding(str(skill), skill.stat().st_size, tok, "L0", note))
    return findings, auto_count, on_demand


def parse_mcp_servers(path: Path) -> int:
    text = read_text(path)
    if not text.strip():
        return 0
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return len(re.findall(r'"command"\s*:', text))
    if isinstance(data, dict):
        if "mcpServers" in data:
            return len(data["mcpServers"])
        return len(data)
    return 0


def scan_mcp() -> List[FileFinding]:
    findings: List[FileFinding] = []
    seen: Set[str] = set()
    for p in MCP_PATHS:
        if not p.is_file():
            continue
        key = str(p.resolve())
        if key in seen:
            continue
        seen.add(key)
        servers = parse_mcp_servers(p)
        schema_est = servers * 2000  # ~2K tok/server/turn heuristic (gh-aw)
        findings.append(
            FileFinding(
                str(p),
                p.stat().st_size,
                schema_est,
                "L0",
                f"MCP {servers} servers (~{schema_est:,} tok/turn schema)",
            )
        )
    return findings


def normalize_for_dup(text: str) -> str:
    text = re.sub(r"^---.*?---", "", text, flags=re.DOTALL)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text[:8000]


def find_duplicates(paths: List[Path], threshold: float = 0.55) -> List[DupFinding]:
    bodies: List[Tuple[str, str]] = []
    for p in paths:
        if p.is_file() and p.suffix in (".md", ".mdc", ""):
            bodies.append((str(p), normalize_for_dup(read_text(p))))

    dups: List[DupFinding] = []
    for i in range(len(bodies)):
        for j in range(i + 1, len(bodies)):
            a, ta = bodies[i]
            b, tb = bodies[j]
            if len(ta) < 80 or len(tb) < 80:
                continue
            ratio = SequenceMatcher(None, ta, tb).ratio()
            if ratio >= threshold:
                waste = int(min(len(ta), len(tb)) / CHARS_PER_TOKEN * (ratio - 0.3))
                dups.append(DupFinding(a, b, round(ratio, 2), max(waste, 0)))
    dups.sort(key=lambda x: -x.est_waste_tokens)
    return dups[:10]


def collect_instruction_paths(project: Path) -> List[Path]:
    paths: List[Path] = []
    for name in PROJECT_ALWAYS_ON:
        p = project / name
        if p.is_file():
            paths.append(p)
    rules = project / ".cursor" / "rules"
    if rules.is_dir():
        paths.extend(rules.glob("*.mdc"))
    return paths


def rank_fixes(
    findings: List[FileFinding],
    dups: List[DupFinding],
    auto_skills: int,
) -> List[FixRecommendation]:
    fixes: List[FixRecommendation] = []
    rank = 1

    mcp_findings = [f for f in findings if f.note.startswith("MCP")]
    if mcp_findings:
        save = sum(f.est_tokens for f in mcp_findings) // 2
        fixes.append(
            FixRecommendation(
                rank,
                "L0",
                "Disable unused MCP servers",
                save,
                "high",
                "Edit mcp.json — remove servers unused in last week",
            )
        )
        rank += 1

    if auto_skills > 5:
        auto_tok = sum(f.est_tokens for f in findings if f.note == "auto-invoke")
        fixes.append(
            FixRecommendation(
                rank,
                "L0",
                f"Set disable-model-invocation on {auto_skills} auto-invoke skills",
                auto_tok // 2,
                "high",
                "Add `disable-model-invocation: true` to rarely-used SKILL.md",
            )
        )
        rank += 1

    always = [f for f in findings if f.note == "alwaysApply"]
    if always:
        fixes.append(
            FixRecommendation(
                rank,
                "L0",
                f"Scope {len(always)} alwaysApply rules to globs",
                sum(f.est_tokens for f in always) // 3,
                "high",
                "alwaysApply: false + globs in .mdc",
            )
        )
        rank += 1

    if dups:
        fixes.append(
            FixRecommendation(
                rank,
                "L0",
                f"Dedup {len(dups)} overlapping instruction pairs",
                sum(d.est_waste_tokens for d in dups[:3]),
                "medium",
                "Merge duplicates; keep one canonical file",
            )
        )
        rank += 1

    big_always = [f for f in findings if f.note == "always-on" and f.est_tokens > 1500]
    for f in big_always[:2]:
        fixes.append(
            FixRecommendation(
                rank,
                "L0",
                f"Compress {Path(f.path).name} ({f.est_tokens:,} tok)",
                f.est_tokens // 3,
                "medium",
                f"python3 scripts/compress.py \"{f.path}\" --write",
            )
        )
        rank += 1

    fixes.append(
        FixRecommendation(
            rank,
            "L1",
            "Install behavior + output rules",
            0,
            "high",
            "python3 scripts/install.py --write --agents cursor,claude-code,windsurf --levers 1,3",
        )
    )
    return fixes


def build_report(project: Path) -> AuditReport:
    findings: List[FileFinding] = []
    findings.extend(scan_always_on(project))
    skill_findings, auto_n, _ = scan_skills(
        [project / ".cursor" / "skills", project / ".codex" / "skills"]
    )
    findings.extend(skill_findings)
    findings.extend(scan_mcp())

    instr_paths = collect_instruction_paths(project)
    home = Path.home() / "CLAUDE.md"
    if home.is_file():
        instr_paths.append(home)
    dups = find_duplicates(instr_paths)

    l0_always = sum(
        f.est_tokens
        for f in findings
        if f.layer == "L0" and f.note in ("always-on", "alwaysApply", "global user CLAUDE.md")
    )
    l0_mcp = sum(f.est_tokens for f in findings if f.note.startswith("MCP"))
    l0_skills = sum(f.est_tokens for f in findings if f.note == "auto-invoke")

    fixes = rank_fixes(findings, dups, auto_n)

    return AuditReport(
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        project=str(project.resolve()),
        platform=f"{platform.system()} {platform.release()}",
        agents_detected=detect_agents(project),
        findings=findings,
        duplicates=dups,
        fixes=fixes,
        summary={
            "files_scanned": len(findings),
            "l0_always_on_tok": l0_always,
            "l0_mcp_schema_tok_per_turn": l0_mcp,
            "l0_auto_skill_desc_tok": l0_skills,
            "auto_invoke_skills": auto_n,
            "duplicate_pairs": len(dups),
            "estimate_method": "chars/4 heuristic; MCP ~2K/server/turn",
        },
    )


def render_markdown(r: AuditReport) -> str:
    s = r.summary
    lines = [
        "# Token Audit Report",
        "",
        f"- **Version:** {r.version}",
        f"- **Time:** {r.timestamp}",
        f"- **Project:** `{r.project}`",
        f"- **Platform:** {r.platform}",
        f"- **Agents detected:** {', '.join(r.agents_detected)}",
        "",
        "## Summary",
        "",
        f"| Metric | Est. tokens |",
        f"|--------|-------------|",
        f"| Always-on files | ~{s.get('l0_always_on_tok', 0):,} |",
        f"| MCP schema / turn | ~{s.get('l0_mcp_schema_tok_per_turn', 0):,} |",
        f"| Auto-invoke skill desc | ~{s.get('l0_auto_skill_desc_tok', 0):,} |",
        f"| Auto-invoke skills | {s.get('auto_invoke_skills', 0)} |",
        f"| Duplicate pairs | {s.get('duplicate_pairs', 0)} |",
        "",
        f"*{s.get('estimate_method', '')}*",
        "",
        "## Top findings",
        "",
        "| Layer | Tokens | Note | Path |",
        "|-------|--------|------|------|",
    ]
    for f in sorted(r.findings, key=lambda x: -x.est_tokens)[:25]:
        short = f.path if len(f.path) < 60 else "…" + f.path[-57:]
        lines.append(f"| {f.layer} | ~{f.est_tokens:,} | {f.note} | `{short}` |")

    if r.duplicates:
        lines.extend(["", "## Duplicates", ""])
        for d in r.duplicates[:5]:
            lines.append(
                f"- **{d.similarity:.0%}** overlap (~{d.est_waste_tokens:,} tok waste): "
                f"`{Path(d.file_a).name}` ↔ `{Path(d.file_b).name}`"
            )

    lines.extend(["", "## Fixes (ROI order)", ""])
    for fix in r.fixes:
        lines.append(f"### {fix.rank}. [{fix.layer}] {fix.title}")
        if fix.est_save_tokens:
            lines.append(f"- **Est. save:** ~{fix.est_save_tokens:,} tokens")
        else:
            lines.append("- **Est. save:** per-task (30–70% agent tasks)")
        lines.append(f"- **Confidence:** {fix.confidence}")
        lines.append(f"- **Action:** `{fix.action}`")
        lines.append("")

    return "\n".join(lines)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Token efficiency audit")
    parser.add_argument("--project", type=Path, default=Path.cwd())
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--with-ledger", action="store_true", help="Append Phoenix/Hermes ledger report")
    args = parser.parse_args(argv)

    project = args.project.resolve()
    if not project.is_dir():
        print(f"error: not a directory: {project}", file=sys.stderr)
        return 1

    report = build_report(project)
    out = json.dumps(asdict(report), indent=2, ensure_ascii=False) if args.json else render_markdown(report)

    if args.with_ledger and not args.json:
        import subprocess

        ledger_script = Path(__file__).resolve().parent / "ledger_report.py"
        if ledger_script.is_file():
            proc = subprocess.run(
                [sys.executable, str(ledger_script)],
                capture_output=True,
                text=True,
            )
            if proc.returncode == 0:
                out += "\n\n---\n\n" + proc.stdout
            else:
                out += "\n\n---\n\n*(Ledger not found — optional for Phoenix users)*\n"

    if args.output:
        args.output.write_text(out, encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
