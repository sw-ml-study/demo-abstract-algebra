# Implementation plan: visual abstract algebra in sw-MLPL

Derived from `docs/research.txt`, restricted to the abstract-algebra half of
that brief. The category-theory half is deferred to `../demo-category-theory`
under the contract in `docs/scope-boundary.md`.

Verified baseline: `mlpl-repl 0.20.0` from `../sw-mlpl/target/release`.
Lessons 01 to 10 are implemented and green; 11 and 12 remain.

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
lib/render.mlpl      ASCII / SVG / JSON renderers + temporary bridges for the
                     text surface sw-MLPL lacks (docs/mlpl-blockers.md)
demos/NN-topic/*.mlpl one self-checking lesson per file; writes to out/
probes/*.mlpl        capability probes against the interpreter itself
tests/test_*.mlpl    mlplunit conformance, including viewer fixtures
viewer/*.html        dependency-free interactive pages
out/                 every artifact, gitignored, rebuilt by `just render`
```

Contracts that hold everywhere:

- Elements are indices `0 .. n-1`. Names live in a parallel string list, never
  inside the table.
- A "structure" is the record `{title, names, table}` — bundled because
  sw-MLPL will not accept a string list as a `u:` function argument
  (`docs/mlpl-blockers.md`, B5). The bundling is good design and will likely
  outlive the fix, but it was forced, not chosen.
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
| 02 | `02-rpsls/lizard_spock` | The same structure at n=5; function / table / graph as three views of one object | Dominance digraph on a circle; the labelled animated frames | **done** |
| 03 | `03-closure/escaping_the_set` | Closure by counterexample; the two repairs (shrink the operation, grow the set) | Escaping cells in grey, marked `!v` | **done** |
| 04 | `04-associativity/bracketing` | The `n^3` triple check; independence from commutativity; why the witness matters | The agreement cube as `n` square panels, green/red | **done** |
| 05 | `05-semigroups/adjoining_an_identity` | Associative but no identity; the `S^1` construction | Striped rows; the adjoined row and column | **done** (substitute, see below) |
| 06 | `06-monoids/identity_cross` | Identity discovered, not asserted; uniqueness as an array fact | The white cross, and the `2n-1` cells it owns | **done** |
| 07 | `07-inverses/undoing` | Inverses relative to the identity; why the question needs one | Cells equal to the identity, ringed | **done** |
| 08 | `08-groups/latin_square` | Groups; the Latin square derived; `Z4` vs Klein | Three tables: two Latin squares and a failure | **done** |
| 09 | `09-commutativity/symmetry` | Commutativity as a property, not a rung; `S_3`, the smallest non-abelian group | The fold across the diagonal, and the mirrored pairs that break it | **done** |
| 10 | `10-enumeration/all_small_magmas` | Every operation on 2 and 3 elements, classified in one batched pass | Population bar chart of the ladder rungs | **done** |
| 11 | `11-isomorphism/same_up_to_naming` | Relabeling; canonical forms; equivalence classes | Two tables shown becoming identical under a permutation | planned |
| 12 | `12-homomorphisms/structure_preserving` | `f(a*b) = f(a)*f(b)`; the bridge out of this repo | Two tables with arrows between them; violated cells flagged | planned |

That is **Stage 1 of six**. It covers structures with a single binary
operation, and it stops at the moment a group has been recognized. The rest of
the syllabus is below.

## Scope: what belongs in this repository

Abstract algebra does not end, so a finite plan has to be a decision. Here is
the decision.

> **A concept belongs here when it can be demonstrated on a FINITE structure,
> expressed as array operations over its tables, and shown as a picture.**

That criterion does real work in both directions.

It **admits** essentially all finite group theory — subgroups, cosets,
Lagrange, quotients, group actions, orbits, the classification of small
groups — along with finite rings and fields, and universal algebra. All of it
is tables, and most of it is more visual than the prose that usually carries
it. Cosets *partition a Cayley table into congruent blocks*; Lagrange's theorem
is then a divisibility fact you can see rather than a proof to accept.

It **excludes** the infinite and the analytic: topological groups, Lie theory,
Galois theory over infinite fields, anything whose objects have no finite
table. Not because they are unimportant, but because this repository's entire
argument is "the structure IS an array", and those have no array.

### Why universal algebra lives here and not in a third repository

Universal algebra — signatures, equational laws, varieties, free algebras — is
the natural continuation of Stage 1's enumerate-and-classify work: take
"hand it elements and an operation, let it tell you which laws hold" and let
the SIGNATURE vary too. It is tempting to give it its own repo, sitting between
this one and `demo-category-theory`. It should not have one.

- It is the same object. The machinery is already pointed at it.
- A third repository would split one argument across a boundary.
  `docs/scope-boundary.md` earns its place because it separates two genuinely
  different questions — *what laws does this operation obey* versus *what
  survives a mapping*. Universal algebra is squarely the first.
- The bridge to category theory is correctly placed at homomorphisms, and it
  works precisely because the algebra side arrives there carrying enough
  structure to make composition interesting.

So it is Stage 6, and the handoff happens from there.

## The six stages

Each stage is independently shippable, so the repository is always in a
coherent state rather than permanently half-finished. One AgentRail saga per
stage; archive and open the next.

### Stage 1 — one operation *(in progress: 10 of 12)*

The ladder from magma to group, plus the two meta-lessons that make the rest
possible. Detailed in the table above.

### Stage 2 — inside a group

The structure a single group contains. This is the most visual material in the
subject and the stage with the highest teaching return.

| Lesson | Concept | Visual |
|---|---|---|
| 13 | Subgroups: subsets closed under the operation | The sub-table highlighted inside the whole |
| 14 | Order of an element; cyclic subgroups and generators | The orbit of one element traced through the table |
| 15 | Cosets: `aH` partitions the group | The table permuted into congruent blocks |
| 16 | Lagrange's theorem | Block count times block size equals the whole — visibly |
| 17 | Normal subgroups; conjugation | The blocks that survive conjugation, side by side with ones that do not |
| 18 | Quotient groups | The block structure collapsed into a smaller table |
| 19 | Kernel and image; the first isomorphism theorem | A homomorphism's kernel as a subgroup, its image as a sub-table |

### Stage 3 — groups acting

A group stops being a table and starts being something that *does* things. The
action table is a different shape — `G x X -> X` rather than `G x G -> G` —
which stresses the array thesis productively.

| Lesson | Concept | Visual |
|---|---|---|
| 20 | Permutations as a group; `S_3`, `S_4` | Permutation matrices, composed |
| 21 | Cayley's theorem: every group IS a permutation group | Each row of the table read as a permutation |
| 22 | Dihedral groups; the symmetries of a polygon | The polygon, with each symmetry animated |
| 23 | Group actions `G x X -> X` | A rectangular action table beside the square group table |
| 24 | Orbits and stabilizers | The set coloured by orbit; the orbit-stabilizer count |
| 25 | Burnside's counting lemma | Necklace colourings counted by averaging fixed points |

### Stage 4 — building new from old

Where Stage 1's enumeration and isomorphism machinery pays off: the
classification of small groups becomes something the repository DERIVES rather
than states.

| Lesson | Concept | Visual |
|---|---|---|
| 26 | Direct products `G x H` | The product table as a block pattern of the factors |
| 27 | Every group of order 4, derived | Two tables, proven non-isomorphic by search |
| 28 | Groups of order 6: `Z6` and `S_3` | The first non-abelian appearance |
| 29 | Classification through order 8 | A gallery of all five, with the isomorphism classes computed |
| 30 | Generators and relations, finitely presented | A presentation expanded into a table |

### Stage 5 — two operations

Distributivity is the first law that relates two operations, and it is an
`n^3` cube check — the same shape as associativity, which Stage 1 already
built the renderer for.

| Lesson | Concept | Visual |
|---|---|---|
| 31 | Rings: two operations, one distributive law | Two tables side by side; the distributivity cube |
| 32 | Zero divisors; integral domains | The multiplication table's zero pattern |
| 33 | Fields; `Z_p` versus `Z_n` for composite `n` | Which tables have full inverse coverage |
| 34 | `F_4`: a field that is not `Z_4` | Two order-4 tables that differ where it matters |
| 35 | Characteristic | Repeated addition of 1, traced to zero |
| 36 | Ideals and quotient rings | The ring analogue of Stage 2's blocks |

### Stage 6 — universal algebra, and the handoff

| Lesson | Concept | Visual |
|---|---|---|
| 37 | Signatures: an algebra is a set with operations | The same set under several signatures |
| 38 | Equational laws as data, not code | A law table checked against a structure table |
| 39 | Varieties: the class of all structures satisfying a law set | The enumeration of Stage 1, sliced by law |
| 40 | Free algebras; terms as trees | Term trees evaluated into a table |
| 41 | The bridge: homomorphisms compose, so algebras form a category | The handoff to `demo-category-theory` |

About forty lessons, six stages, one criterion. Finite because the criterion is
finite, not because a number was picked.

## Deferred deliberately

- **Infinite structures.** No finite table, so no picture, so out of scope by
  the criterion — not by preference.
- **Sylow theory and the deeper classification results.** They are finite, but
  their content is the PROOF rather than the object, and a table does not show
  a proof. Revisit only if a visual argument appears.
- **Category theory.** `../demo-category-theory`, under the contract in
  `docs/scope-boundary.md`.

### Lesson 05 shipped a substitute

Its natural subject is string concatenation — the canonical semigroup that is
not a monoid until you add `""`. sw-MLPL cannot concatenate strings
(`docs/sw-mlpl-work-order.md`, B1) or measure them (B3), so that version is
unwritable today.

Shipped instead: left projection and the constant operation, both associative
with no identity, followed by the `S^1` construction that adjoins one. The
same point, and the adjoining is arguably a better lesson than the string
version would have been — it shows a rung being climbed by construction rather
than by luck.

**When B1/B3 land**, add the string version alongside rather than replacing
this one. The lesson header records the substitution.

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
loop, that is a genuine finding — record it and ship the loop-based version
with the friction noted.

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
   highlights, which is most of the teaching (upstream ask #5). Both bridges
   this depends on are blockers: `docs/mlpl-blockers.md`, B1 and B2.
3. **The interactive page last** *(done)*. `viewer/cayley.html`: seven
   editable structures, every law rechecked as you click, and the brief's
   puzzles — *"Make this magma associative"*, *"Turn this semigroup into a
   monoid"*. Dependency-free, no server.

The viewer re-implements the law checks in JavaScript, because a page cannot
call the interpreter. That duplication is deliberate and is kept honest:
`tests/test_viewer_conformance.mlpl` writes the fixture set the page's checker
must reproduce, and the MLPL result is authoritative. If they ever disagree,
the page is wrong.

## Delivery sequence (saga steps)

1. **Foundation** *(done)* — agentrail setup, harness, `lib/algebra.mlpl`,
   `lib/render.mlpl`, lesson 01, catalog, docs.
2. **Upstream text blockers** *(done)* — `docs/mlpl-blockers.md` and
   `probes/text_capabilities.mlpl`. No lesson work; the specification exists so
   the missing surface gets fixed rather than permanently worked around.
3. **Lessons 02-04** — RPSLS and the graph view; closure and associativity as
   lessons in their own right. Adds the digraph renderer.
4. **Lessons 05-08** — the ladder proper, semigroup through group. Adds the
   Latin-square check and the side-by-side comparison renderer.
5. **The viewer** — `viewer/cayley.html` plus the conformance fixture, wired to
   the structures from lessons 01-08. Editable cells, live verdicts, the two
   puzzles.
6. **Lesson 09 + 10** — commutativity, then the enumeration workload. Expect
   the largest crop of upstream asks here.
7. **Lessons 11-12** — isomorphism classes, then homomorphisms. The final step closes
   with a handoff note for `../demo-category-theory`.

These are queued in `.agentrail/`, behind a step that specified the upstream
text blockers. Each ends with the suite green, the catalog updated, and any new
friction recorded — in `docs/mlpl-blockers.md` if it blocks, with a case added
to `probes/text_capabilities.mlpl`, otherwise in `docs/upstream-asks.md`.

When a blocker closes upstream, adopting the builtin and deleting the bridge it
justified belongs in the same step — see the bridge list in
`docs/mlpl-blockers.md`.

## What would make this plan wrong

Worth stating so a later session can notice:

- **If the batch-of-tables formulation in lesson 10 needs a loop per table**,
  the enumeration lesson becomes a language-limitation demo rather than an
  array-programming showcase. Still worth shipping, with the framing changed.
- **If the text blockers (`docs/mlpl-blockers.md`) never close**, the visual
  layer stays built on a byte-array round trip and a dependency on `to_json`'s
  incidental scalar formatting. That is survivable but not the point of
  dogfooding: the repository would be demonstrating sw-MLPL's limits rather
  than its expressiveness.
- **If the SVG string-building recursion does not scale past `n=8`**, the
  larger structures (`S_3` is order 6, but `S_4` would be 24) need a different
  emitter — most likely JSON to the viewer, with SVG reserved for small
  tables. `u:cells_svg` recurses `n^2` deep; that is 576 frames at `n=24`.
- **If a learner cannot tell a group from a monoid in the rendered table**, the
  color-per-element choice has failed and the visual needs a redesign
  (row/column duplicate marking rather than color alone).
