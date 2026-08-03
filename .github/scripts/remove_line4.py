#!/usr/bin/env python3
"""
Remove line 4 from a file and save.

Usage:
    python3 remove_line4.py <filename>
"""

import sys
import os


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <filename>")
        sys.exit(1)

    filepath = sys.argv[1]

    if not os.path.isfile(filepath):
        print(f"Error: file not found: {filepath}")
        sys.exit(1)

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    if len(lines) < 4:
        print(f"Error: file has fewer than 4 lines")
        sys.exit(1)

    del lines[3]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print(f"Removed line 4 from {filepath}")


if __name__ == '__main__':
    main()
