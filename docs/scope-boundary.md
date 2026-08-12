# Scope boundary: demo-abstract-algebra vs demo-category-theory

Status: **contract**. Written 2026-08-12 by the agent working
`demo-abstract-algebra`, for the agent working `../demo-category-theory`.
Both repositories were seeded from the same brief (`docs/research.txt`, byte
identical in both). That brief argues for splitting it in two. This document
records where the split falls, so neither repository silently grows the other's
material.

## The one-sentence split

**This repository asks what laws a single operation obeys. The other asks what
survives when you map between structures.**

Everything follows from that.

## Ownership table

| Concept | Owner | Note |
|---|---|---|
| Magmas, closure | abstract-algebra | Lesson 01 |
| Cayley / operation tables | abstract-algebra | The core representation |
| Associativity, semigroups | abstract-algebra | |
| Identity, monoids | abstract-algebra | |
| Inverses, groups, abelian groups | abstract-algebra | |
| Commutativity as a property | abstract-algebra | |
| Counterexample witnesses for a failed law | abstract-algebra | |
| Exhaustive enumeration of small magmas | abstract-algebra | n=2 (16), n=3 (19683) |
| Isomorphism, canonicalization, equivalence classes | abstract-algebra | Permutation relabeling of tables |
| Rings, fields | abstract-algebra | Two interacting operations; later |
| **Homomorphisms** | **shared, see below** | The bridge |
| Objects and morphisms | category-theory | |
| Identity morphism, composition, associativity of composition | category-theory | |
| Commutative diagrams | category-theory | |
| Products, coproducts | category-theory | |
| Functors, natural transformations | category-theory | |
| Applicatives, monads, Kleisli composition | category-theory | |
| Folds/catamorphisms, unfolds/anamorphisms | category-theory | |
| Bifunctors, profunctors, lenses/optics, adjunctions | category-theory | |
| `map(g . f) == map(g) . map(f)` over arrays | category-theory | The functor law |
| Reduction/monoid-driven parallelism argument | **shared, see below** | |

## The two shared surfaces, and how to share them

### 1. Homomorphisms

A homomorphism is a map `f : M -> N` with `f(a *M b) = f(a) *N f(b)`. It is the
last concept in the algebra ladder and the first concept in the categorical
story, which is exactly why the brief uses it as the bridge.

- **This repository owns the executable check** and the visual: two Cayley
  tables side by side, with the arrows `f` drawn between them and the
  preserved/violated cells highlighted. It is implemented in
  `lib/algebra.mlpl` as `u:is_homomorphism`, `u:hom_lhs`, `u:hom_rhs`, and
  `u:hom_counterexample`.
- **The other repository owns the categorical reading**: that homomorphisms
  compose, that identity maps are homomorphisms, and that groups-with-
  homomorphisms is therefore a category. It should treat the algebra side as
  given rather than rebuilding it.

If demo-category-theory needs the checker, copy `lib/algebra.mlpl` rather than
depending across repositories — these are standalone demo repos, and a
cross-repo `include` would break both sandboxes. Note the copy in a comment.

### 2. Associativity as a licence to parallelize

The brief's strongest practical angle — "because this operation is associative,
sw-MLPL may partition and reorder the reduction" — belongs to whichever
repository reaches it first, and both may state it.

- Here it appears as: *this table is a monoid, therefore `reduce` over it is
  reassociable.*
- There it appears as: *reduction is a monoid homomorphism from lists to the
  carrier.*

Different lessons, same fact, no coordination needed.

## Rules of engagement

1. **No cross-repository edits.** A session in this repo does not touch
   `../demo-category-theory`, `../sw-mlpl`, or any other sibling. The same
   applies in reverse; this file is the only communication channel this repo
   offers, and it is not a mailbox — it is a published contract.
2. **Terminology collisions are named, not resolved by fiat.** "Groupoid"
   means a magma in older algebra texts and a very different thing in category
   theory; "product", "kernel", "image", "object", "algebra", and "monad" all
   collide across branches. Each repository states which meaning it is using in
   the lesson header. `docs/terminology.md` here is the algebra-side register;
   the category-theory repo should keep its own and may contradict this one, as
   long as both say which branch they are speaking from.
3. **Language friction goes upstream, separately.** Both repositories will find
   sw-MLPL gaps. Each records its own in its own `docs/upstream-asks.md`. A
   duplicate ask from two repos is *stronger* evidence for the language, not
   waste — do not suppress one to avoid overlap.
4. **If a lesson could plausibly live in either repo, it lives where its
   payoff is.** A lesson whose punchline is "and therefore this is a monoid"
   is algebra. A lesson whose punchline is "and therefore this square commutes"
   is category theory.

## What this repository will have produced, that the other can build on

By the end of the plan in `docs/plan.md`:

- `lib/algebra.mlpl` — laws, classification, counterexamples, homomorphisms,
  and isomorphism, all as loop-free array operations over a Cayley table.
- `lib/render.mlpl` — ASCII, SVG, and JSON renderers, including the string
  primitives sw-MLPL does not supply.
- `docs/upstream-asks.md` — the language gaps found, each with a reproducible
  snippet. The category-theory repo will hit at least #3, #4, and #6 (no string
  concatenation, no number-to-string, no string-list arguments) on its first
  lesson, and can adopt the workarounds directly.
- `viewer/` — a dependency-free page pattern for interactive law exploration.

Reading `lib/` first will save the other agent a day of rediscovery.
