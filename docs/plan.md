# Implementation plan: visual abstract algebra in sw-MLPL

Derived from `docs/research.txt`, restricted to the abstract-algebra half of
that brief. The category-theory half is deferred to `../demo-category-theory`
under the contract in `docs/scope-boundary.md`.

Verified baseline: `mlpl-repl 0.20.0` from `../sw-mlpl/target/release`.
Lesson 01 is implemented and green; everything from Lesson 02 on is planned.

## The thesis

A finite binary operation on `n` elements **is** an `n x n` array. Therefore:

- building it is `table(f, elements, elements)` — one line;
- every law is an array predicate — no explicit loop, ever;
- every counterexample is an index into that array — so a failed law names a
  witness instead of returning `false`;
- and the array is directly renderable, so the algebra is *visible*.

That last point is the whole reason this repo exists as a *visual* demo rather
than a test suite. Two pictures do most of the teaching:

1. **The identity's cross.** When an element `e` is a two-sided identity, row
   `e` and column `e` reproduce the headings. Ring them in white and the
   definition stops needing prose.
2. **The Latin square.** A group's Cayley table has every element exactly once
   in every row and column. Color by result and a group is recognizable across
   the room; a mere monoid is not.

## Architecture

```
lib/algebra.mlpl     laws, classification, counterexamples, homomorphisms
lib/render.mlpl      ASCII / SVG / JSON renderers + the string primitives
                     sw-MLPL lacks
demos/NN-topic/*.mlpl one self-checking lesson per file; writes to out/
tests/test_*.mlpl    mlplunit conformance, including viewer fixtures
viewer/*.html        dependency-free interactive pages
out/                 every artifact, gitignored, rebuilt by `just render`
```

Contracts that hold everywhere:

- Elements are indices `0 .. n-1`. Names live in a parallel string list, never
  inside the table.
- A "structure" is the record `{title, names, table}` — bundled because
  sw-MLPL will not accept a string list as a `u:` function argument.
- Classification is **derived, never declared.** No lesson says "this is a
  monoid"; each hands `elements` and `operation` to `u:classify` and reports
  what came back. That is the pedagogy and the acceptance test at once.
- Each lesson asserts its own invariants and ends in `ok(...)` / `err(...)`.
- Artifacts are an additional effect. Delete `out/` and every assertion still
  passes.

## Lesson sequence

The ladder is climbed one rung at a time, and the games are the hook rather
than the subject — they are gone by lesson 03.

| # | Lesson | Concept | New visual | Status |
|---|---|---|---|---|
| 01 | `01-magmas/rock_paper_scissors` | Magma; closure; a law that fails | Colored Cayley table; ASCII grid | **done** |
| 02 | `02-rpsls/lizard_spock` | The same structure at n=5; function / table / graph as three views of one object | Dominance digraph in SVG, drawn on a circle | planned |
| 03 | `03-closure/escaping_the_set` | Closure by counterexample: an operation that leaves the set | Out-of-set cells struck out in grey | planned |
| 04 | `04-associativity/bracketing` | The `n^3` triple check; why the witness matters | The two bracketing cubes as stacked slices | planned |
| 05 | `05-semigroups/string_joins` | Associative but no identity | Latin-square-ness absent; no white cross | planned |
| 06 | `06-monoids/identity_cross` | Identity discovered, not asserted; uniqueness | The white cross | planned |
| 07 | `07-inverses/undoing` | Inverses relative to the identity | Inverse pairs joined by chords over the table | planned |
| 08 | `08-groups/latin_square` | Groups; `Z_n` and the Klein four-group | The Latin square, side by side with a non-group | planned |
| 09 | `09-commutativity/symmetry` | Commutativity as a property, not a rung; `S_3` is not abelian | Reflection across the diagonal, animated in the viewer | planned |
| 10 | `10-enumeration/all_small_magmas` | Enumerate all `n^(n^2)` operations; classify them | Population bar chart of the ladder rungs | planned |
| 11 | `11-isomorphism/same_up_to_naming` | Relabeling; canonical forms; equivalence classes | Two tables shown becoming identical under a permutation | planned |
| 12 | `12-homomorphisms/structure_preserving` | `f(a*b) = f(a)*f(b)`; the bridge out of this repo | Two tables with arrows between them; violated cells flagged | planned |

Lessons 13+ (rings, fields, two interacting operations) are a later saga, not
part of this plan.

### Lesson 10 is the serious array-programming workload

For `n` elements there are `n^(n^2)` binary operations: 16 at `n=2`, 19,683 at
`n=3`. Enumerating and classifying all of them exercises generation,
combinatorics, higher-order predicates, filtering, grouping, and reduction —
the brief's point that "the mathematics generated the workload" rather than a
benchmark being invented for the language.

The array formulation: an operation is a base-`n` numeral with `n^2` digits, so
all operations are one `[n^(n^2), n, n]` array produced by digit extraction over
`range(n^(n^2))`. Every law predicate then applies along the leading axis at
once. If the associativity cube cannot be lifted to a batch of tables without a
loop, that is a genuine finding for `docs/upstream-asks.md`, and the loop-based
version ships with the friction recorded.

### Lesson 11 falls out of lesson 10

19,683 tables at `n=3` collapse to far fewer once relabeling is quotiented out.
Canonical form = the lexicographically smallest table over all `n!`
permutations. `u:permute_table` already exists; the work is the quotient and
the count.

## Visual layers, in the order they are built

1. **ASCII first.** `disp()` renders any table in the terminal with no
   dependencies and no files. Every lesson has this. It is what survives when
   someone runs a demo over ssh.
2. **SVG second.** `lib/render.mlpl` emits its own SVG — headings, cell values,
   per-element color, and the identity cross. The built-in
   `svg(t, "heatmap")` colors cells but draws no headings, values, or
   highlights, which is most of the teaching (upstream ask #5).
3. **The interactive page last.** `viewer/cayley.html`: load a structure's
   JSON, edit a cell, watch the law verdicts recompute. This is where the
   brief's best idea lives — *"Make this magma associative"*, *"Turn this
   semigroup into a monoid"* as puzzles.

The viewer re-implements the law checks in JavaScript, because a page cannot
call the interpreter. That duplication is deliberate and is kept honest:
`tests/test_viewer_conformance.mlpl` writes the fixture set the page's checker
must reproduce, and the MLPL result is authoritative. If they ever disagree,
the page is wrong.

## Delivery sequence (saga steps)

1. **Foundation** *(done)* — agentrail setup, harness, `lib/algebra.mlpl`,
   `lib/render.mlpl`, lesson 01, catalog, docs.
2. **Lessons 02-04** — RPSLS and the graph view; closure and associativity as
   lessons in their own right. Adds the digraph renderer.
3. **Lessons 05-08** — the ladder proper, semigroup through group. Adds the
   Latin-square check and the side-by-side comparison renderer.
4. **The viewer** — `viewer/cayley.html` plus the conformance fixture, wired to
   the structures from lessons 01-08. Editable cells, live verdicts, the two
   puzzles.
5. **Lesson 09 + 10** — commutativity, then the enumeration workload. Expect
   the largest crop of upstream asks here.
6. **Lessons 11-12** — isomorphism classes, then homomorphisms. Step 6 closes
   with a handoff note for `../demo-category-theory`.

Steps 2-6 are queued in `.agentrail/`. Each ends with the suite green, the
catalog updated, and any new friction appended to `docs/upstream-asks.md`.

## What would make this plan wrong

Worth stating so a later session can notice:

- **If the batch-of-tables formulation in lesson 10 needs a loop per table**,
  the enumeration lesson becomes a language-limitation demo rather than an
  array-programming showcase. Still worth shipping, with the framing changed.
- **If the SVG string-building recursion does not scale past `n=8`**, the
  larger structures (`S_3` is order 6, but `S_4` would be 24) need a different
  emitter — most likely JSON to the viewer, with SVG reserved for small
  tables. `u:cells_svg` recurses `n^2` deep; that is 576 frames at `n=24`.
- **If a learner cannot tell a group from a monoid in the rendered table**, the
  color-per-element choice has failed and the visual needs a redesign
  (row/column duplicate marking rather than color alone).
