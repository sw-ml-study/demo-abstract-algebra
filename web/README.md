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

The transcript reads top to bottom: a block saying what the demo will show,
then each step with its result, each diagram preceded by a block explaining what
you are about to look at, and a closing block saying what to notice.

Every diagram has a **⬇ download button** in its top-right corner if you want
to keep it.

> **Load, not paste, if you can.** `Load` reads the file exactly. Pasting works
> too, but copy the *whole* file — the last block is the explanation of what
> you just saw.

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

*18 steps, 2 pictures.*

---

### `latin_square.mlpl` — what a pattern shows, and what it proves

**Three labelled tables**, 3×3, rows and columns labelled, every cell carrying
the **name and colour** of its result.

- Rock-Paper-Scissors. Colours repeat along rows and others go missing — not a
  Latin square.
- Subtraction modulo 3. Each of the three colours appears **exactly once** per
  row and per column: a **Latin square**.
- Addition modulo 3. Also a Latin square.

**What it teaches.** Tables 2 and 3 wear the same pattern, and only table 3 is
a group — subtraction mod 3 has no identity and is not associative. So the
Latin pattern is **necessary for a group but not sufficient**. What it does
prove is that `a * x = b` always has exactly one solution, which makes the
operation a **quasigroup**:

```
magma  --unique division-->  quasigroup  --identity-->  loop  --associativity-->  group
```

A picture suggests; a law test establishes. Every group is a Latin square, so
the shape is worth recognising — but two tables can be indistinguishable at a
glance and sit on different rungs.

*19 steps, 3 pictures.*

---

### `rpsls_pentagon.mlpl` — Rock-Paper-Scissors-Lizard-Spock, and why it's a star

**One picture:** the **beats graph** — five circles on a ring, ten arrows.
Note it draws the *beats relation*, which is a different object from the
winner operation whose laws the other demos check.

**What it teaches.** Ten rules, one idea — arrange the five choices in a circle
and each beats the *next two* going around. Because each beats the two *after*
it rather than the one beside it, no arrow follows the rim; every one cuts
across, and ten arrows cutting across five points draw the pentagram. The star
is not decoration, it is the shape of "beats the next two".

Count the arrows at any circle: two leave, two arrive. Every choice wins twice
and loses twice, which is exactly why the game is fair. And five elements
instead of three added rules but no **laws** — this is still just a magma.

*16 steps, 1 picture.*

---

## Notes

**These files are generated.** The sources are `../demos/web/*.mlpl`; run
`just web` to rebuild, and `just check` fails if these copies are stale. Don't
edit them here.

**How they are narrated.** Every explanation in these files is a `#` comment
block, framed with asterisk bars:

```mlpl
# **********************************************************************
# * PICTURE 1 -- THE BEATS CYCLE
# *
# * Three circles, one per choice. An arrow a -> b means "a beats b".
# **********************************************************************
u:cycle(3, {names: ["rock", "paper", "scissors"]})
```

Comments, not strings, and the reason is concrete: a string statement echoes
**twice** in the transcript — once as the input line, again as its own evaluated
output — while a comment renders once, as prose, with no output at all.

Placement does real work:

- the **opening** block is closed with a bare `;`, which makes it a transcript
  entry of its own with no output;
- a block placed **just before a picture** shares that picture's entry, so the
  explanation sits directly above the thing it explains;
- the **closing** block is a trailing group and ends the run on prose.

That lone `;` is a wart, and a deliberate one: blank lines are discarded by the
playground's statement grouper, so they cannot separate a comment block from
the code after it, and `;` is the shortest thing that can
(`docs/upstream-asks.md` #18). MLPL also has no block-comment syntax, so the
bars are built from line comments (#17).

**Why they carry no provenance header.** The playground evaluates a file as
balanced statement groups and shows one entry per group, and leading comment
lines ride with the statement after them — a "generated by" preamble would be
glued onto the demo's opening block. So each file begins directly with its
first bar, and provenance lives in this README instead.

**The algebra comes first.** Each file reads: narration, then the two or three
functions that *are* the operation, then a `RENDERING SUPPORT` banner, then the
SVG plumbing. Nothing below that banner is needed to define or check any
algebra — it is only there because a browser cannot load a shared library.
Skip it.

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
