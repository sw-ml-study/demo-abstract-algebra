"""Docstring conformance for every .mlpl function in the repository.

Two rules, both about what a reader needs:

1. Every `def u:...` opens with a nonempty string as the first statement of its
   body. That is sw-MLPL's own convention -- the built-in demo catalog uses it
   and mlplunit reads it -- and these files are read by learners, so a function
   whose body must be read to be understood has failed.

2. Everything below the RENDERING SUPPORT banner in lib/render.mlpl says "SVG
   helper:" in its docstring, so a reader following the mathematics knows what
   to skip (docs/research2.txt item 7).

`scripts/mlpl-fmt.sh` explodes one-line bodies onto separate lines, so a
docstring legitimately sits on the `def` line OR the line after it. Both spell
the same program, and both pass.
"""

import pathlib
import re
import sys

TREES = ["demos", "probes", "tests", "lib", "web"]

DEF_RE = re.compile(r"^\s*def\s+(u:[A-Za-z0-9_]+)\s*\(")
# A docstring is a nonempty double-quoted string forming the whole first
# statement, so it ends at `;` or -- in a one-statement body -- at `}`.
DOC_RE = re.compile(r'"[^"]+"\s*(;|\})')

# Narration and structure-record helpers sit below the banner for layout
# reasons but are not SVG plumbing, so they are exempt from rule 2 by name.
EXEMPT_RE = re.compile(
    r"^u:(prolog|epilog_open|explain|note|takeaway|limits|structure_record"
    r"|structure_json|write_structure_json|element_name|cell_name|cell_range"
    r"|yes_or_no|show_[A-Za-z0-9_]*|larger_of)$"
)


def opening_lines(lines, index):
    """The `def` line's body remainder and the line after it, which is where a
    docstring may be found before and after formatting respectively."""
    line = lines[index]
    after_brace = line.split("{", 1)[1] if "{" in line else ""
    following = lines[index + 1] if index + 1 < len(lines) else ""
    return after_brace.strip(), following.strip()


def check_docstrings(root):
    """Report every function that does not open with a docstring."""
    missing = []
    total = 0
    for tree in TREES:
        for path in sorted((root / tree).rglob("*.mlpl")):
            lines = path.read_text().splitlines()
            for i, line in enumerate(lines):
                match = DEF_RE.match(line)
                if not match:
                    continue
                total += 1
                head, following = opening_lines(lines, i)
                if not (DOC_RE.match(head) or DOC_RE.match(following)):
                    missing.append(f"{path.relative_to(root)}:{i + 1}: {match.group(1)}")
    return total, missing


def check_render_prefix(root):
    """Report every renderer below the banner whose docstring omits the prefix."""
    render = root / "lib" / "render.mlpl"
    lines = render.read_text().splitlines()
    banner = next((i for i, l in enumerate(lines) if l.startswith("# RENDERING SUPPORT")), None)
    if banner is None:
        return []

    unmarked = []
    for i in range(banner, len(lines)):
        match = DEF_RE.match(lines[i])
        if not match or EXEMPT_RE.match(match.group(1)):
            continue
        head, following = opening_lines(lines, i)
        if "SVG helper" not in head and "SVG helper" not in following:
            unmarked.append(f"lib/render.mlpl:{i + 1}: {match.group(1)}")
    return unmarked


def main():
    root = pathlib.Path(sys.argv[1])
    total, missing = check_docstrings(root)
    unmarked = check_render_prefix(root)

    if missing:
        print(f"{len(missing)} of {total} functions have no docstring:", file=sys.stderr)
        for item in missing[:8]:
            print("    " + item, file=sys.stderr)
    if unmarked:
        print('lib/render.mlpl: rendering functions missing the "SVG helper:" prefix', file=sys.stderr)
        for item in unmarked[:4]:
            print("    " + item, file=sys.stderr)
    if missing or unmarked:
        return 1

    print(f"docstrings: ok ({total} of {total} functions documented)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
