#!/usr/bin/env python3
"""Stage a minimal MkDocs branch preview without the rest of the site."""
from __future__ import annotations

import os
import re
import shutil
from pathlib import Path


BRANCH_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$")
STATIC_DIRS = (
    "assets",
    "vendor",
    "stylesheets",
    "js",
    "images",
    "search",
    "search-results",
)


def main() -> None:
    branch = os.environ.get("BRANCH_NAME", "")
    if not BRANCH_RE.fullmatch(branch):
        raise ValueError(f"Unsupported preview branch name: {branch!r}")

    site_dir = Path(os.environ.get("SITE_DIR", "site")).resolve()
    output_dir = Path(os.environ.get("PREVIEW_DIR", "branch-preview")).resolve()
    article_dir = site_dir / "articles" / branch
    article_page = article_dir / "article" / "index.html"
    if not article_page.is_file():
        print(f"No generated article page for '{branch}'; skipping branch deployment.")
        _set_output("has_article", "false")
        return

    required_downloads = (
        site_dir / "download" / f"{branch}.pdf",
        site_dir / "download" / f"{branch}.epub",
    )
    missing = [str(path) for path in required_downloads if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            "Branch preview is missing required download(s): " + ", ".join(missing)
        )

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    for filename in ("index.html",):
        source = site_dir / filename
        if not source.is_file():
            raise FileNotFoundError(f"Generated branch home page is missing: {source}")
        shutil.copy2(source, output_dir / filename)

    shutil.copytree(article_dir, output_dir / "articles" / branch)
    for download in required_downloads:
        target_dir = output_dir / "download"
        target_dir.mkdir(exist_ok=True)
        shutil.copy2(download, target_dir / download.name)

    for relative_dir in STATIC_DIRS:
        source = site_dir / relative_dir
        if source.is_dir():
            shutil.copytree(source, output_dir / relative_dir)

    error_page = site_dir / "404.html"
    if error_page.is_file():
        shutil.copy2(error_page, output_dir / error_page.name)

    _set_output("has_article", "true")
    print(
        f"Prepared {output_dir}: one article, its PDF/EPUB, "
        "and shared site assets."
    )


def _set_output(name: str, value: str) -> None:
    output_path = os.environ.get("GITHUB_OUTPUT")
    if output_path:
        with open(output_path, "a", encoding="utf-8") as output:
            output.write(f"{name}={value}\n")


if __name__ == "__main__":
    main()
