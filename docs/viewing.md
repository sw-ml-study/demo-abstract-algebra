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
mlpl-repl --source-dir . --svg-out /tmp/svgs web/rps_associativity_web.mlpl
# viz: /tmp/svgs/34e504471fe7.svg
```

The filename is a content hash, so re-running an unchanged program overwrites
rather than accumulating.

> **Watch out:** `mlpl-repl script.mlpl` with a *bare* filename currently fails
> with `--source-dir : No such file or directory` and exit 1, even though
> `--help` shows exactly that form. Write `./script.mlpl`, or pass
> `--source-dir`, and it works. Reported as `docs/upstream-asks.md` #9.

---

## 4. The sw-MLPL Web UI — paste and go

**Use the files in `web/`, not the ones in `demos/`.**

The browser session rejects `include`, has no sandboxed filesystem, and shows
a program's *final value*. So a web entry must be one self-contained file whose
last expression is the SVG. Three exist today:

| Paste this | What you get |
|---|---|
| `web/rps_cayley_web.mlpl` | Rock-Paper-Scissors as a colored Cayley table |
| `web/rps_associativity_web.mlpl` | The same table, animated, showing associativity fail |
| `web/rpsls_dominance_web.mlpl` | Rock-Paper-Scissors-Lizard-Spock as a pentagram digraph |

Open the [sw-MLPL playground](https://sw-ml-study.github.io/sw-mlpl/), paste the
whole file into the editor, and run. The browser REPL detects an SVG return
value and renders it inline beneath the input.

Those files are **generated** — `scripts/build-web-demos` splices the `include`
lines of `demos/web/*.mlpl` into standalone programs. Edit the source under
`demos/web/`, then:

```sh
just web           # regenerate web/
```

`just check` fails if `web/` is stale, so the paste-ready copies cannot silently
drift from `lib/`.

---

## 5. The interactive viewer

Planned, not built — saga step `005-interactive-viewer`. `viewer/cayley.html`
will load a structure's JSON and recompute every law verdict live as you edit a
cell, with the brief's two puzzles: *make this magma associative*, *turn this
semigroup into a monoid*. See `viewer/README.md`.

---

## What there is to look at, today

| Diagram | Structure | Shows |
|---|---|---|
| `assets/rps-cayley.svg` | Rock-Paper-Scissors | The 3x3 operation table, one color per element |
| `assets/rps-associativity.svg` | Rock-Paper-Scissors | **Animated.** Two markers walk `(a*b)*c` and `a*(b*c)` to different results |
| `assets/rpsls-cayley.svg` | RPS-Lizard-Spock | The 5x5 table |
| `assets/rpsls-dominance.svg` | RPS-Lizard-Spock | The dominance digraph — the pentagram, out-degree 2 everywhere |

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
