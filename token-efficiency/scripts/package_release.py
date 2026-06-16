#!/usr/bin/env python3
"""
Build student distribution zip: dist/token-efficiency-{version}.zip

Python 3.8+, stdlib only.
"""

from __future__ import annotations

import argparse
import zipfile
from pathlib import Path

from _paths import DIST, REPO_ROOT, VERSION

SKIP_DIRS = {".git", "__pycache__", "dist", ".DS_Store"}
SKIP_SUFFIX = {".pyc", ".bak"}


def should_include(path: Path) -> bool:
    parts = set(path.parts)
    if parts & SKIP_DIRS:
        return False
    if path.suffix in SKIP_SUFFIX:
        return False
    return True


def build(out_name: str | None = None) -> Path:
    DIST.mkdir(parents=True, exist_ok=True)
    name = out_name or f"token-efficiency-{VERSION}.zip"
    dest = DIST / name
    prefix = f"token-efficiency-{VERSION}"

    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(REPO_ROOT.rglob("*")):
            if not path.is_file() or not should_include(path.relative_to(REPO_ROOT)):
                continue
            rel = path.relative_to(REPO_ROOT)
            arc = f"{prefix}/{rel.as_posix()}"
            zf.write(path, arc)

    return dest


def main() -> int:
    parser = argparse.ArgumentParser(description="Package token-efficiency for students")
    parser.add_argument("--output", help="Zip filename inside dist/")
    args = parser.parse_args()
    dest = build(args.output)
    size_kb = dest.stat().st_size // 1024
    print(f"Built: {dest} ({size_kb} KB)")
    print(f"Students: unzip && cd token-efficiency-{VERSION} && bash install.sh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
