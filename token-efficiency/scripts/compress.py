#!/usr/bin/env python3
"""
token-efficiency compress — semantic-safe instruction compression.

Synthesized from context-compress (vidanov) with safety-first classification.
Python 3.8+, stdlib only.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import List, Optional, Tuple


class ContentType(Enum):
    SAFETY = "safety"
    PREFERENCE = "preference"
    REFERENCE = "reference"
    PERSONALITY = "personality"
    CODE = "code"
    PROCEDURE = "procedure"
    PROSE = "prose"


SAFETY_PATTERNS = [
    r"(?i)\bnever\b.*\b(execute|delete|push|commit|overwrite|modify|remove)\b",
    r"(?i)\b(always|must)\b.*\b(ask|confirm|approval|permission)\b",
    r"(?i)\bdo not\b.*\b(without|unless)\b",
    r"(?i)\b(destructive|irreversible)\b",
    r"(?i)\bbefore\b.*\b(proceed|execute|act)\b.*\b(ask|confirm)\b",
]

PREFERENCE_PATTERNS = [
    r"(?i)\b(always use|prefer|default to)\b",
    r"(?i)\bfor (python|javascript|typescript)\b.*\buse\b",
    r"(?i)\b(style|convention|format)\b.*\b(use|follow|apply)\b",
]

REFERENCE_PATTERNS = [
    r"(?i)^(path|location|directory|folder):",
    r"/[A-Za-z][\w/.-]+",
    r"(?i)\b(consult|reference|see|check)\b.*\.(md|yaml|json)\b",
]

FILLER_WORDS = re.compile(
    r"(?i)\b(basically|actually|simply|just|really|essentially|importantly|it's worth noting)\b\s*"
)


@dataclass
class CompressResult:
    original_bytes: int
    compressed_bytes: int
    sections: List[Tuple[ContentType, int]]

    @property
    def reduction_pct(self) -> float:
        if self.original_bytes == 0:
            return 0.0
        return (1 - self.compressed_bytes / self.original_bytes) * 100


def classify_section(text: str) -> ContentType:
    if text.strip().startswith("```") or re.match(r"^\s{4}\S", text, re.MULTILINE):
        return ContentType.CODE

    safety_score = sum(1 for p in SAFETY_PATTERNS if re.search(p, text))
    if safety_score >= 2 or (safety_score == 1 and len(text) < 200):
        return ContentType.SAFETY

    for p in PREFERENCE_PATTERNS:
        if re.search(p, text):
            return ContentType.PREFERENCE

    for p in REFERENCE_PATTERNS:
        if re.search(p, text):
            return ContentType.REFERENCE

    if re.search(r"(?i)\b(personality|tone|style|voice)\b", text):
        return ContentType.PERSONALITY

    if re.search(r"(?i)^\d+\.\s", text, re.MULTILINE):
        return ContentType.PROCEDURE

    return ContentType.PROSE


def _strip_formatting(text: str) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^>\s?", "", text, flags=re.MULTILINE)
    return text


def _remove_blanks(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text.strip()) + "\n"


def _collapse_lists(text: str) -> str:
    lines = []
    for line in text.splitlines():
        m = re.match(r"^(\s*[-*]|\s*\d+\.)\s+(.*)", line)
        if m:
            lines.append(f"- {m.group(2).strip()}")
        elif line.strip():
            lines.append(line)
    return "\n".join(lines) + "\n"


def _remove_filler(text: str) -> str:
    return FILLER_WORDS.sub("", text)


def _use_shorthand(text: str) -> str:
    repl = {
        r"(?i)\bfor example\b": "e.g.",
        r"(?i)\bthat is\b": "i.e.",
        r"(?i)\bwith respect to\b": "re:",
        r"(?i)\bin order to\b": "to",
    }
    for pat, sub in repl.items():
        text = re.sub(pat, sub, text)
    return text


def compress_section(text: str, content_type: ContentType, level: str) -> str:
    if content_type == ContentType.CODE:
        return text

    if content_type == ContentType.SAFETY:
        return _remove_blanks(_strip_formatting(text))

    if content_type == ContentType.PREFERENCE:
        return _remove_blanks(_strip_formatting(text))

    if content_type == ContentType.REFERENCE:
        t = _strip_formatting(text)
        t = _remove_blanks(t)
        if level in ("medium", "heavy"):
            t = _collapse_lists(t)
            t = _use_shorthand(t)
        return t

    if content_type == ContentType.PROCEDURE:
        t = _strip_formatting(text)
        t = _remove_blanks(t)
        if level == "heavy":
            t = _remove_filler(t)
        return t

    # PROSE, PERSONALITY
    t = _strip_formatting(text)
    t = _remove_blanks(t)
    if level in ("medium", "heavy"):
        t = _collapse_lists(t)
        t = _use_shorthand(t)
    if level == "heavy":
        t = _remove_filler(t)
    return t


def split_sections(text: str) -> List[str]:
    parts = re.split(r"(?=^## )", text, flags=re.MULTILINE)
    return [p for p in parts if p.strip()] or [text]


def compress_text(text: str, level: str = "medium") -> Tuple[str, List[Tuple[ContentType, int]]]:
    sections_meta: List[Tuple[ContentType, int]] = []
    out: List[str] = []
    for sec in split_sections(text):
        ct = classify_section(sec)
        compressed = compress_section(sec, ct, level)
        sections_meta.append((ct, len(compressed.encode("utf-8"))))
        out.append(compressed)
    return "".join(out), sections_meta


def compress_file(path: Path, level: str = "medium", write: bool = False) -> CompressResult:
    original = path.read_text(encoding="utf-8", errors="replace")
    compressed, sections = compress_text(original, level)
    if write:
        backup = path.with_suffix(path.suffix + ".bak")
        if not backup.exists():
            backup.write_text(original, encoding="utf-8")
        path.write_text(compressed, encoding="utf-8")
    return CompressResult(
        original_bytes=len(original.encode("utf-8")),
        compressed_bytes=len(compressed.encode("utf-8")),
        sections=sections,
    )


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Semantic-safe markdown compression")
    parser.add_argument("paths", nargs="+", type=Path, help="Files to compress")
    parser.add_argument("--level", choices=["light", "medium", "heavy"], default="medium")
    parser.add_argument("--write", action="store_true", help="Write files (.bak created)")
    args = parser.parse_args(argv)

    exit_code = 0
    for path in args.paths:
        if not path.is_file():
            print(f"skip (not found): {path}", file=sys.stderr)
            exit_code = 1
            continue
        r = compress_file(path, args.level, write=args.write)
        mode = "WRITTEN" if args.write else "DRY-RUN"
        print(f"[{mode}] {path}")
        print(f"  {r.original_bytes} → {r.compressed_bytes} B ({r.reduction_pct:.1f}%)")
        types = ", ".join(sorted({t.value for t, _ in r.sections}))
        print(f"  sections: {types}")
    if not args.write:
        print("\nUse --write to apply (creates .bak backup).")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
