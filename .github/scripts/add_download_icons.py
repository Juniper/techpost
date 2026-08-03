#!/usr/bin/env python3
"""
Add download icons (PDF, ePUB, Email) to line 4 of a article.md file.

Usage:
    python3 add_download_icons.py <article.md path> <name>

Example:
    python3 add_download_icons.py docs/techpost/mx301-deepdive/article.md mx301-deepdive
"""

import sys
import os

def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <filename> <name>")
        sys.exit(1)

    filepath = sys.argv[1]
    name = sys.argv[2]

    if not os.path.isfile(filepath):
        print(f"Error: file not found: {filepath}")
        sys.exit(1)

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Inline SVGs with explicit dimensions for reliable rendering
    pdf_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 384 512" fill="#d32f2f"><path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/></svg>'
    epub_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 448 512" fill="#1565c0"><path d="M96 0C43 0 0 43 0 96V416c0 53 43 96 96 96H384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V384c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H384 96zm0 384H352v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm16 48H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/></svg>'
    mail_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512" fill="#616161"><path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>'

    icons_html = (
        f'<br><br><span style="display:inline-flex; align-items:center; gap:12px; margin-top:4px;">'
        f'<a href="../../../download/{name}.pdf" target="_blank" title="Download PDF" style="display:inline-flex; align-items:center;">{pdf_svg}</a>'
        f'<a href="../../../download/{name}.epub" target="_blank" title="Download ePUB" style="display:inline-flex; align-items:center;">{epub_svg}</a>'
        f'<a href="mailto:techpost@hpe.com" title="Contact us" style="display:inline-flex; align-items:center;">{mail_svg}</a>'
        f'</span>\n'
    )

    # Insert at line 4 (index 3)
    lines.insert(3, icons_html)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print(f"Added download icons to {filepath} (name={name})")


if __name__ == '__main__':
    main()
