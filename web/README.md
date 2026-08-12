# Paste-ready demos for the sw-MLPL Web UI

**Generated — do not edit.** Sources are `demos/web/*.mlpl`; run `just web` to
rebuild. `just check` fails if these are stale.

Open the [sw-MLPL playground](https://sw-ml-study.github.io/sw-mlpl/), paste a
whole file into the script editor, and press Run.

| File | What you get |
|---|---|
| `magma_rps.mlpl` | Rock-Paper-Scissors as a colored Cayley table |
| `latin_square.mlpl` | Two animations: a magma's frames vs a group's permutation matrices |
| `rpsls_pentagon.mlpl` | RPSLS animated, then the pentagram digraph |

Each file follows sw-MLPL's own demo shape — the `intro` / annotated `lines` /
`takeaway` structure used by the built-in demo catalog:

- it **opens** with a `"WHAT THIS SHOWS ..."` string, so the first entry says
  what is about to appear;
- every code line carries a trailing `# annotation`, which the UI renders
  beside the code;
- it **closes** with `"HOW TO READ ..."` strings that describe the picture,
  name what the colors and cells mean, and say what to notice.

That shape is why these files carry no header comment: the playground groups a
file into statements and shows one entry per group, and leading comments ride
with the statement after them — a preamble would be glued onto the opening
narration. Provenance lives here instead.

Why the files are short: Run puts one REPL entry per balanced statement group.
An earlier version spliced all of `lib/` into each demo and produced 89
entries, 88 of them printing `0`, with the diagram at the bottom. It read as
"no graphics". `scripts/check-web-size` now budgets 22 groups per demo.
