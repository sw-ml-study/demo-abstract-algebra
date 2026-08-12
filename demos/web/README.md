# Web demo sources

These are the **sources**. `scripts/build-web-demos` turns them into the
standalone, paste-ready files in `../../web/`, which is what you load into the
playground — see [`web/README.md`](../../web/README.md) for how to run them.

Edit here, then `just web`. `just check` fails if the generated copies are
stale.

## Rules these files follow

Enforced by `scripts/check-narration`, `scripts/check-web-size` and
`scripts/check-comment-style`:

- **Open with a `"WHAT THIS SHOWS ..."` string** as the first statement, so the
  first entry says what is about to appear.
- **Close with `"HOW TO READ ..."` strings**, the last one `"THE POINT ..."`,
  describing the picture concretely: what rows and columns are, what a color or
  a lit cell means, what to notice, and what is conspicuously absent.
- **Annotate code lines with terse trailing comments** — labels of a few words,
  not sentences. The prose belongs in the epilog; saying it twice makes the
  transcript repeat itself. Capped at 52 characters.
- **Narrate with `#` comment blocks, never string literals.** A string
  statement echoes twice in the transcript — as the input line and again as its
  own output. A comment renders once, with no output.
- **Close the opening block with a bare `;`** so it becomes its own entry.
  Blank lines are discarded by the grouper and cannot separate a block from the
  code after it; without the `;` the following statement renders inside the
  comment span (`docs/upstream-asks.md` #16, #18).
- Blocks placed immediately before an `svg(...)` are meant to ride with it —
  prose and picture in one entry.
- **No `include`, no `write_text`**, and the final value is prose, not a Result:
  the browser has no filesystem and rejects `include`, and a Result would print
  `Ok(...)` instead of drawing.
- **Set `width` and `height` on every `<svg>` you emit,** not just a
  `viewBox`. The playground's result panel is `display: inline-block`, so an
  SVG with no intrinsic width collapses to nothing and only the download arrow
  shows. `scripts/check-web-renders` fails the gate on a bare root tag.
- **Stay under 26 statement groups.** The playground shows one entry per group,
  so length is friction.

The header comment block at the top of each source file is metadata for
`scripts/check-docstrings`; `build-web-demos` strips it so the generated file
opens on its prolog.
