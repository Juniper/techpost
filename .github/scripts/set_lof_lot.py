#!/usr/bin/env python3
"""Toggle the lof/lot flags in an article's pandoc-pdf.yml based on its
combined markdown content, without touching any other formatting in the file.

- lot (list of tables): true only if the article contains at least one
  Pandoc table caption line ("Table: ...").
- lof (list of figures): true only if the article contains at least one
  image with a real caption (alt text that isn't empty and isn't just
  "image", e.g. ![a caption other than image](./images/pic.png)).
"""
import re
import sys

TABLE_CAPTION_RE = re.compile(r'^Table:\s*\S.*$', re.MULTILINE)
IMAGE_RE = re.compile(r'!\[([^\]]*)\]\([^)]*\)')


def has_captioned_table(markdown):
    return bool(TABLE_CAPTION_RE.search(markdown))


def has_captioned_image(markdown):
    for alt in IMAGE_RE.findall(markdown):
        alt = alt.strip()
        if alt and alt.lower() != "image":
            return True
    return False


def set_flag(yaml_text, key, value):
    pattern = re.compile(rf'^{key}:\s*.*$', re.MULTILINE)
    replacement = f'{key}: {"true" if value else "false"}'
    new_text, count = pattern.subn(replacement, yaml_text, count=1)
    if count == 0:
        print(f"Warning: '{key}:' not found in pandoc-pdf.yml; leaving it unchanged.", file=sys.stderr)
        return yaml_text
    return new_text


def main():
    if len(sys.argv) != 3:
        print("Usage: set_lof_lot.py <combined.md> <pandoc-pdf.yml>", file=sys.stderr)
        sys.exit(1)

    md_path, yml_path = sys.argv[1], sys.argv[2]

    with open(md_path, "r", encoding="utf-8") as f:
        markdown = f.read()

    lot = has_captioned_table(markdown)
    lof = has_captioned_image(markdown)

    with open(yml_path, "r", encoding="utf-8") as f:
        yaml_text = f.read()

    yaml_text = set_flag(yaml_text, "lot", lot)
    yaml_text = set_flag(yaml_text, "lof", lof)

    with open(yml_path, "w", encoding="utf-8") as f:
        f.write(yaml_text)

    print(f"pandoc-pdf.yml updated: lot={lot}, lof={lof}")


if __name__ == "__main__":
    main()
