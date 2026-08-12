# How to see the visualizations

Five ways, cheapest first. The first needs nothing but a terminal; the last
runs in a browser with no build step.

Every one of them reads the *same* Cayley table. Nothing is computed twice, so
no view can disagree with another.

---

## 1. The terminal, immediately

```sh
just demos
```

Each lesson prints an ASCII `disp()` grid, the law checklist, and — when a law
fails — the witness:

```
Rock-Paper-Scissors (magma)
  elements: ["rock", "paper", "scissors"]
+-------+
| 0 1 0 |
| 1 1 2 |
| 0 2 2 |
+-------+
rank 2  shape [3, 3]  depth 1

Which laws hold?
  closed       yes
  associative  no
  commutative  yes
  identity     no
  inverses     no
  => magma

  associativity counterexample:
    a = rock  b = paper  c = scissors
    (a*b)*c:  a*b = paper  ->  scissors
    a*(b*c):  b*c = scissors  ->  rock
```

This is the view that survives ssh, CI logs, and a machine with no browser. It
is deliberately the first thing every lesson emits.

---

## 2. SVG files, in any browser or image viewer

`just demos` also writes SVG to `out/` (gitignored scratch):

```sh
just render        # rebuild out/ and list exactly what was written
open out/01-rock-paper-scissors.svg          # macOS
xdg-open out/01-rock-paper-scissors.svg      # Linux
```

`just render` prints the manifest, so there is never any guessing about what
exists:

```
Artifacts written under out/:
out/01-rock-paper-scissors-associativity.svg
out/01-rock-paper-scissors.svg
out/02-rpsls-cayley.svg
out/02-rpsls-dominance.svg
```

The committed copies in `assets/` are the same files; the README embeds those.

---

## 3. `--svg-out`, for any script whose value is an SVG

The CLI does not display images, but it will save them. When a script's final
value is an SVG string, `--svg-out` writes it to a directory:

```sh
mlpl-repl --source-dir . --svg-out /tmp/svgs web/rpsls_pentagon.mlpl
# viz: /tmp/svgs/e03081a2ae79.svg
```

The filename is a content hash, so re-running an unchanged program overwrites
rather than accumulating.

> **Watch out:** `mlpl-repl script.mlpl` with a *bare* filename currently fails
> with `--source-dir : No such file or directory` and exit 1, even though
> `--help` shows exactly that form. Write `./script.mlpl`, or pass
> `--source-dir`, and it works. Reported as `docs/upstream-asks.md` #9.

---

## 4. The sw-MLPL Web UI — paste and go

**Use the files in `web/`.** They are short on purpose; see "Why short" below.

| Paste this | Groups | What you get |
|---|---|---|
| `web/magma_rps.mlpl` | 4 | The Cayley table, printed and as a heatmap |
| `web/latin_square.mlpl` | 5 | **Two animations**: a magma's frames vs a group's permutation matrices |
| `web/rpsls_pentagon.mlpl` | 15 | RPSLS animated, then the pentagram digraph |

Open the [sw-MLPL playground](https://sw-ml-study.github.io/sw-mlpl/), paste a
whole file into the **script editor**, and press Run.

### How the UI decides to draw

The playground renders a result as an inline SVG widget when, and only when,
the entry's output starts with `<svg`
(`components/web-render/crates/mlpl-web-render-aux/src/entry.rs`):

```rust
if !entry.is_error && out.starts_with("<svg") {
    return render_svg_body(&entry.output);   // .svg-output panel + download button
}
```

Nothing is written to a file; there is no browser filesystem and none is
wanted. Three things break the contract, and all three are natural to write:

| In the script | What the UI shows |
|---|---|
| `include "../../lib/x.mlpl"` | An error — the browser session rejects `include` |
| `write_text("out/x.svg", doc)` | Nothing useful — no sandboxed filesystem |
| `ok("...")` as the final value | The text `Ok(...)` — no SVG to draw |

That third one is why **pasting a lesson from `demos/` shows text, not a
picture.** A lesson ends in `ok(...)` / `err(...)` so `just demos` can gate on
it. Its value is a verdict.

### Why short

Run evaluates the file as balanced **statement groups**
(`mlpl-web-render-core/src/statement_groups.rs`) and puts one REPL entry per
group. The first version of these demos spliced the whole of `lib/` into each
file: **89 groups**, 88 of them printing `0`, with the diagram at the very
bottom. It ran correctly and read as "no graphics".

`scripts/check-web-size` now ports that grouper to awk and fails the gate above
20 groups per demo. Its counts match the browser's exactly.

### Use the built-in renderers first

This is a dogfooding repository, so a web demo reaches for sw-MLPL's own
visualization before writing a byte of SVG. There are **twelve** `svg()` types,
only six of which are in `docs/lang-reference.md` (upstream ask #11):

```
scatter  scatter3d  plotly3d  line  bar  heatmap  heatmap_grid
life  waffle  critical_dimensions  gallery  attention_overlay  decision_boundary
```

`life` is the one that matters here. It takes a `[T, H, W]` array and emits a
SMIL-animated grid — so an animated Cayley table is one call:

```mlpl
# Frame k marks every cell where a * b = k.
def u:frames(t, n) { reshape(transpose(one_hot(flatten(t), n)), [n, n, n]) }
svg(u:frames(table(:u:add3, range(3), range(3)), 3), "life")
```

For a **group**, every frame is a permutation matrix — exactly one lit cell per
row and per column. The Latin square becomes something you watch. For a magma
the cells clump. Two lines, no hand-written SVG.

Where a builtin genuinely does not exist, the hand-rolling is the evidence:
`rpsls_pentagon.mlpl` draws its own digraph because `svg()` has no graph type
(upstream ask #14), and that hand-rolling is about half the demo.

### Every demo explains its own picture

A colored grid with no legend teaches nothing. sw-MLPL's built-in demo catalog
gives each demo an `intro` and a `takeaway`
(`components/web-demos/crates/mlpl-web-demos/demos.toml`); demos here use the
same shape, expressed inside the file:

| Part | How | Renders as |
|---|---|---|
| Prolog | a `"WHAT THIS SHOWS ..."` string as the **first** statement | an entry whose output is that prose |
| Annotation | a trailing `# comment` on every code line | italic grey text beside the code |
| Epilog | `"HOW TO READ ..."` strings, closing with `"THE POINT ..."` | prose entries after the picture |

The epilog names the concrete thing on screen — what the rows and columns are,
what a color or a lit cell means, what moves and where it lands — then says
what to notice, including what is conspicuously *absent*.

Because the epilog comes last, **a web demo's final value is prose, not an
SVG.** That is correct: the playground makes one entry per statement group and
renders any entry that starts with `<svg`, so pictures draw wherever they sit.
`scripts/check-web-renders` proves it by evaluating growing prefixes of the file
— prefix *k*'s value is exactly what entry *k* displays — and counting the
entries that render. Its counts match the browser's: 1, 2, 2.

CLI lessons do the same with `u:prolog`, `u:explain(path, ...)`, `u:note(...)`
and `u:takeaway(...)` from `lib/render.mlpl`, printing a "HOW TO READ WHAT WAS
JUST WRITTEN" section that names every file they produced.

`scripts/check-narration` enforces the structure on both. It cannot check that
the prose is any good.


## 5. The interactive viewer

Planned, not built — saga step `005-interactive-viewer`. `viewer/cayley.html`
will load a structure's JSON and recompute every law verdict live as you edit a
cell, with the brief's two puzzles: *make this magma associative*, *turn this
semigroup into a monoid*. See `viewer/README.md`.

---

## What there is to look at, today

| Diagram | Where | Shows |
|---|---|---|
| `assets/rps-cayley.svg` | README | The 3x3 table, labelled, one color per element |
| `assets/rps-associativity.svg` | README | **Animated.** Two markers walk `(a*b)*c` and `a*(b*c)` to different results |
| `assets/rpsls-cayley.svg` | README | The 5x5 table |
| `assets/rpsls-dominance.svg` | README | The dominance digraph — the pentagram |
| `web/latin_square.mlpl` | playground | **Animated.** A magma's frames vs a group's permutation matrices |
| `web/magma_rps.mlpl` | playground | The table as a built-in heatmap |
| `web/rpsls_pentagon.mlpl` | playground | RPSLS animated, then the pentagram |

The `assets/` diagrams come from `lib/render.mlpl`, which emits labelled SVG by
hand because `svg(_, "heatmap")` draws no headings or cell text (ask #5) and
`svg(_, "life")` is binary (ask #12). The `web/` demos use the builtins. That
split is deliberate: the hand-rolled path shows what the diagrams should look
like, and the asks say what would let the builtins produce them.

More arrive with the lessons in `docs/plan.md`: the identity's white cross at
lesson 06, the Latin square at lesson 08, and the population chart of all
19,683 order-3 magmas at lesson 10.

---

## Why animated SVG and not GIF

The animation is [SMIL](https://developer.mozilla.org/en-US/docs/Web/SVG/SVG_animation_with_SMIL)
— `<animate>` elements inside the SVG:

```xml
<animate attributeName="x" values="132;132;196;196"
         keyTimes="0;0.35;0.5;1" dur="5s"
         repeatCount="indefinite" calcMode="linear"/>
```

That is *text*, which matters more than it sounds:

- **It needs no new language capability.** sw-MLPL already emits the SVG; an
  animation is more of the same string. A GIF would need an LZW encoder and
  palette quantization written in MLPL, and `write_bytes` to emit it — a
  project in its own right, teaching nothing about algebra.
- **It stays scalable and diffable.** A rendering change shows up as a text
  diff in review. A GIF shows up as an opaque binary blob.
- **It renders anywhere an `<img>` does**, including the browser REPL.

The cost: SMIL is unsupported in a few contexts that sanitize SVG, where the
animation degrades to its first frame rather than breaking. Since the first
frame is a correct static Cayley table, that degradation is acceptable.

Note that `keyTimes` and `values` must have equal length or browsers drop the
animation *silently* — `tests/test_render.mlpl` counts both for exactly that
reason.
