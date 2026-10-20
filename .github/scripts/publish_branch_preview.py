#!/usr/bin/env python3
"""Replace only one branch's preview directory in a gh-pages checkout."""
from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


BRANCH_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--branch", required=True)
    parser.add_argument("--preview-dir", type=Path, required=True)
    parser.add_argument("--pages-dir", type=Path, required=True)
    args = parser.parse_args()

    if not BRANCH_RE.fullmatch(args.branch):
        raise ValueError(f"Unsupported preview branch name: {args.branch!r}")

    preview_dir = args.preview_dir.resolve()
    pages_dir = args.pages_dir.resolve()
    if not preview_dir.is_dir() or not any(preview_dir.iterdir()):
        raise FileNotFoundError(f"Prepared preview directory is empty: {preview_dir}")

    target = (pages_dir / args.branch).resolve()
    if target.parent != pages_dir:
        raise ValueError(f"Branch preview path escapes the Pages checkout: {args.branch!r}")

    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(preview_dir, target)
    print(f"Replaced only {target} in the Pages checkout.")


if __name__ == "__main__":
    main()
