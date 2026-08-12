# Terminology: words that mean different things in different branches

The brief that seeded this repository names a specific frustration: mathematical
words collide across branches, and most textbooks do not say which meaning they
are using. This repository treats disambiguation as a feature.

Every lesson header carries three lines:

```
Meaning here:        the definition in force in this lesson
Also called:         synonyms and older names, with their source branch
Not to be confused:  the collision, named explicitly
```

This file is the register. It speaks from **abstract algebra**. The
category-theory repository keeps its own and may contradict this one — that is
the point, so long as both say where they are standing.

---

## groupoid

- **Here (older algebra literature):** a synonym for **magma** — a set with a
  closed binary operation and nothing else. Bourbaki and mid-century texts use
  it this way.
- **Category theory:** a category in which every morphism is invertible. Not
  remotely the same object.
- **This repo's practice:** say *magma*. Mention *groupoid* once, in lesson 01,
  with the collision flagged.

## product

- **Here:** the result of the binary operation, `a * b`. Also the direct
  product of two groups: `G x H` with componentwise operation.
- **Category theory:** an object with projection morphisms satisfying a
  universal property. The group direct product *is* the categorical product in
  the category of groups, which is why the words agree here — but the
  categorical definition says nothing about elements.
- **Array programming:** outer product, inner product, `reduce_mul`. sw-MLPL's
  `table(f, a, b)` is the outer product and builds our Cayley tables.

## kernel

- **Here:** for a homomorphism `f : G -> H`, the elements of `G` that `f` sends
  to `H`'s identity. Measures how far `f` is from injective.
- **Linear algebra:** null space — the same idea, specialized.
- **Machine learning:** a kernel function (SVMs), or a convolution kernel, or a
  GPU kernel. Three further unrelated senses, all live in sw-MLPL's own
  vocabulary.

## image

- **Here:** the set of values a homomorphism actually reaches.
- **ML / this interpreter:** a `[B, C, H, W]` pixel tensor. `svg(x, "gallery")`
  means the second one.

## order

- **Here, of a structure:** how many elements it has. `u:order(t)` returns this.
- **Here, of an element:** the smallest `k > 0` with `a^k = e`. A different
  number about a different thing, same word, same branch. Lesson 08 needs both
  and must say which each time.
- **Everywhere else:** ordering, sorting, sequence.

## identity

- **Here:** the element `e` with `e * x = x * e = x`. A *member of the set*.
- **Category theory / functional programming:** the identity *function*,
  `id(x) = x`. A member of a set of functions.
- These coincide exactly when the structure's elements are functions under
  composition — which is lesson 09's symmetric group, and is worth pointing out
  there rather than assuming.

## algebra

- **Here:** the subject. Also, technically, "an algebra over a field" — a
  specific structure, not used in this repo.
- **Category theory:** an algebra for a functor / for a monad.
- **Relational databases, linear algebra, computer algebra:** three more.
- **This repo's practice:** "abstract algebra" in full, or name the specific
  structure.

## monoid

- Genuinely stable across branches: associative operation with a two-sided
  identity. Same object in algebra, in category theory (a one-object category),
  and in functional programming (`mempty` / `mappend`).
- Worth saying so. Not every word is a trap, and claiming otherwise is its own
  kind of confusion.

## table

- **Here:** the Cayley table — the `n x n` array of `a * b`.
- **APL/BQN/sw-MLPL:** `table(f, a, b)`, the outer-product operator.
- These meet: `table(:u:op, elements, elements)` builds the Cayley table. The
  pun is exact and is the reason lesson 01 is one line long.

## magma

- **Here:** the structure.
- **Geology:** molten rock. Included because the brief raises it, and because
  it is the harmless kind of collision — nobody is confused for long. Not every
  ambiguity deserves a paragraph, and pretending otherwise buries the ones that
  do.
