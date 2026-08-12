# Interactive viewers

Planned, not yet built — saga step `004-interactive-viewer`.

`cayley.html` will be a dependency-free single-file page: no CDN, no build
step, no framework. It loads a structure JSON emitted by
`u:write_structure_json` (see `lib/render.mlpl`), draws the Cayley table, and
recomputes every law verdict as the learner edits a cell.

That editing loop is the point. Two puzzles from the source brief:

- *Make this magma associative.* Edit cells until the associativity check
  passes.
- *Turn this semigroup into a monoid.* Now you have to create an identity, and
  the white cross appears when you succeed.

## The duplication, and how it is kept honest

A browser page cannot call the interpreter, so the page re-implements the law
checks in JavaScript. That is a real duplication and it is deliberate: live
editing is worth it.

It is pinned rather than trusted. `tests/test_viewer_conformance.mlpl` writes a
fixture set — structures paired with the verdicts MLPL computes — and the
page's checker must reproduce every one. **The MLPL result is authoritative.**
If the two ever disagree, the page is wrong.
