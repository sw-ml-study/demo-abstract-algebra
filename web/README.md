# Web demos — run these in the sw-MLPL playground

Three standalone `.mlpl` files that draw abstract algebra in your browser. No
install, no build, nothing to clone.

## How to run one

1. Open **<https://sw-ml-study.github.io/sw-mlpl/>**
2. Click the **Editor** tab (top of the page, next to **REPL**).
3. Click **Load** and pick one of the `.mlpl` files in this directory.
   *(Or open the file in any text editor, select all, and paste it into the
   editor box — same result.)*
4. Click **Run**.
5. Click the **REPL** tab to see the results.

The transcript reads top to bottom: a line saying what the demo will show, then
each step with its result, with the diagrams drawn inline as you scroll, then a
few lines explaining what you just looked at.

Every diagram has a **⬇ download button** in its top-right corner if you want
to keep it.

> **Load, not paste, if you can.** `Load` reads the file exactly. Pasting works
> too, but make sure you copy the *whole* file — the last few lines are the
> explanation of the pictures.

---

## The demos

### `magma_rps.mlpl` — Rock-Paper-Scissors is a magma

**Two pictures.** First the game as a **cycle of arrows**: three circles, an
arrow `a → b` meaning *a beats b*. Rock smashes scissors, scissors cuts paper,
paper covers rock — one closed loop, no start and no end. Then the **same
operation as a 3×3 grid**, one square per matchup, each square colored by who
won.

**What it teaches.** That the loop you already knew is an algebraic structure. A
*magma* is a set with one closed binary operation and nothing else, and the grid
is the picture of "closed": every square holds one of the three choices, never a
fourth thing. It also shows what is *missing* — no row reproduces the header
order, so there is no identity element, and Rock-Paper-Scissors stops at the
bottom rung.

*22 steps, 2 pictures.*

---

### `latin_square.mlpl` — what a group looks like

**Two animations, side by side in the transcript.** Both are 3×3 operation
tables cycling through three frames; in frame *k* a cell lights up when
`row * column = k`.

- The first is Rock-Paper-Scissors. The lit cells clump: some rows get two,
  others none.
- The second is `Z₃`, addition modulo 3. Every frame lights **exactly one cell
  per row and one per column** — a permutation matrix.

**What it teaches.** That second pattern is a **Latin square**, and it is what
being a *group* looks like. Each row is a shuffle of the elements, which is the
same as saying nothing is ever lost and every element has an inverse. You can
recognize a group across the room without reading a single number.

This one is pure sw-MLPL: the animation is `svg(frames, "life")`, a built-in
renderer, and the frames come from one line of array work — no hand-written SVG
anywhere.

*10 steps, 2 pictures.*

---

### `rpsls_pentagon.mlpl` — Rock-Paper-Scissors-Lizard-Spock, and why it's a star

**Two pictures.** First the **beats graph**: five circles on a ring, ten arrows.
Then the **same operation animated** as a 5×5 table, one frame per element.

**What it teaches.** Ten rules, one idea — arrange the five choices in a circle
and each beats the *next two* going around. Because each beats the two *after*
it rather than the one beside it, no arrow follows the rim; every one cuts
across, and ten arrows cutting across five points draw the pentagram. The star
is not decoration, it is the shape of "beats the next two".

Count the arrows at any circle: two leave, two arrive. Every choice wins twice
and loses twice, which is exactly why the game is fair. And five elements
instead of three added rules but no **laws** — this is still just a magma.

*20 steps, 2 pictures.*

---

## Notes

**These files are generated.** The sources are `../demos/web/*.mlpl`; run
`just web` to rebuild, and `just check` fails if these copies are stale. Don't
edit them here.

**Why they carry no header comment.** The playground evaluates a file as
balanced statement groups and shows one entry per group, and leading comment
lines ride with the statement after them — a preamble would be glued onto the
demo's opening line. So each file begins directly with its own first sentence,
and provenance lives in this README instead.

**Why they are short.** One entry per statement group means length is friction.
An earlier version of these demos pulled in the whole shared library and
produced 89 entries, 88 of them printing `0`, with the diagram buried at the
bottom — it ran perfectly and read as "nothing happened".
`scripts/check-web-size` now caps a demo at 26 groups.

**These are not the lessons.** The `demos/` directory at the repo root holds CLI
lessons that write SVG files and end in a pass/fail verdict. Pasting one of
those into the playground shows a line of text, because its final value is a
verdict rather than a picture, and because it uses `include` and `write_text`,
neither of which exists in the browser. `docs/viewing.md` explains the split.
