# sw-MLPL Abstract Algebra, Visually

Executable, **visual** demonstrations of abstract algebra — magmas,
semigroups, monoids, groups, and the structure-preserving maps between them —
written as standalone `.mlpl` scripts for the
[sw-MLPL](https://sw-ml-study.github.io/sw-mlpl/) interpreter.

The premise is small and does a lot of work:

> A finite binary operation on `n` elements **is** an `n x n` array.

So building one is a single `table(f, elements, elements)`; every law is an
array predicate with no explicit loop; every counterexample is an index into
that array; and the array is directly renderable — which is why this is a
*visual* demo repository rather than a test suite.

Two pictures do most of the teaching:

- **The identity's cross.** When `e` is a two-sided identity, row `e` and
  column `e` reproduce the headings. Ring them and the definition explains
  itself.
- **The Latin square.** A group's table has every element exactly once in every
  row and column. Color by result and a group is recognizable at a glance; a
  mere monoid is not.

Nothing here declares what a structure is. Each lesson hands `elements` and
`operation` to a classifier and reports what came back — magma, semigroup,
monoid, group, abelian group are **derived**, and a failed law names a witness
rather than returning `false`:

```
  associativity counterexample:
    a = rock  b = paper  c = scissors
    (a*b)*c:  a*b = paper  ->  scissors
    a*(b*c):  b*c = scissors  ->  rock
```

## Status

Verified baseline: `mlpl-repl 0.20.0` from the adjacent
`../sw-mlpl/target/release` build, with mlplunit for conformance.

Lesson 01 (magmas, via Rock-Paper-Scissors) is implemented and green:
7 conformance tests passing, 0 explicit loops, ASCII and SVG output. Lessons
02–12 are planned and queued — see [docs/plan.md](docs/plan.md).

## Quick start

```sh
just demos     # run every lesson; artifacts land in out/
just tests     # mlplunit conformance suite
just check     # the full local gate
just render    # rebuild out/ and list what was written
```

The interpreter is found at `../sw-mlpl/target/release/mlpl-repl`, or wherever
`$MLPL` points. Nothing is installed and no stable binary is overwritten.

## Layout

```
lib/algebra.mlpl      laws, classification, counterexamples, homomorphisms
lib/render.mlpl       ASCII / SVG / JSON renderers
demos/NN-topic/*.mlpl one self-checking lesson per file
probes/*.mlpl         capability probes against the interpreter
tests/test_*.mlpl     mlplunit conformance
viewer/*.html         dependency-free interactive pages (planned)
out/                  every artifact, gitignored
```

## The second job: dogfooding sw-MLPL

When a law check, an enumeration, or a rendering turns out to be awkward or
impossible in ordinary `.mlpl`, the gap is recorded precisely rather than
worked around silently.

**Six of the eight findings so far are blockers**, and they are all the same
missing surface: sw-MLPL cannot concatenate two strings, cannot turn a number
into one, cannot measure or search one, and cannot build a string list. Since
every lesson here has to *generate* a diagram, that surface is load-bearing.
These are specified for implementation — signatures, semantics, acceptance
tests, and the bridge each one deletes — in
**[docs/mlpl-blockers.md](docs/mlpl-blockers.md)**. They are to be fixed
upstream and then used; the bridges in `lib/render.mlpl` are temporary.

`probes/text_capabilities.mlpl` runs under `just demos` and reports open vs.
closed, so the day any of this lands, one command says so. It reports; it does
not gate. The other two findings have honest workarounds and live in
[docs/upstream-asks.md](docs/upstream-asks.md).

The wins are recorded too. `table(f, a, b)` gives the Cayley table in one line,
and `gather_rows` + `transpose_axes` express the `n^3` associativity check with
no loop and no comprehension syntax — which is precisely the question the
source brief posed.

## Scope

This repository is **abstract algebra only**. Category theory — functors,
natural transformations, monads, adjunctions — is deferred to
`../demo-category-theory`, worked separately. The boundary, including the two
shared surfaces, is a written contract:
[docs/scope-boundary.md](docs/scope-boundary.md).

Words that collide across branches of mathematics ("groupoid", "kernel",
"product", "order") are disambiguated in each lesson header and registered in
[docs/terminology.md](docs/terminology.md). That is a feature of the pedagogy,
not boilerplate.

## Documents

- [docs/plan.md](docs/plan.md) — the twelve-lesson sequence and delivery order
- [docs/scope-boundary.md](docs/scope-boundary.md) — the contract with
  demo-category-theory
- [docs/mlpl-blockers.md](docs/mlpl-blockers.md) — the sw-MLPL capabilities
  that block this work, specified for implementation
- [docs/upstream-asks.md](docs/upstream-asks.md) — the full friction record
- [docs/terminology.md](docs/terminology.md) — the word-collision register
- [docs/research.txt](docs/research.txt) — the source brief
- [AGENTS.md](AGENTS.md) — agent instructions and the AgentRail protocol
