# Interactive viewers

## `cayley.html`

Open it in a browser. No server, no build, no dependencies.

Click any cell to change what that pairing produces. Every law is rechecked as
you edit, so you can build a structure by hand and watch the classifier decide
what it is. Nothing is declared — closed, associative, commutative, identity,
inverses, Latin square and the ladder rung are all read off the table, exactly
as `lib/algebra.mlpl` reads them.

Seven structures to start from, each editable: Rock-Paper-Scissors, `Z3`, `Z4`,
the Klein four-group, `max`, left projection, and a table that is not closed.

### The puzzles

The brief that seeded this repository asked for these, and they are the point
of the page:

- **Make this magma associative.** Start from Rock-Paper-Scissors and edit
  cells until the classifier says `semigroup`. The witness line tells you which
  triple is still wrong.
- **Turn this semigroup into a monoid.** Start from left projection. You need
  one row and one column to echo the headings — which is what an identity *is*,
  and the white ring appears the moment you succeed.
- **Can max become a group?** It has an identity but almost no inverses. Try to
  add them without breaking associativity.

### How the duplication is kept honest

A browser cannot call the interpreter, so the page reimplements the law checks
in JavaScript. That is a real duplication and it is deliberate — live editing is
worth a second implementation. It is pinned two ways:

1. `tests/test_viewer_conformance.mlpl` writes the verdicts `lib/algebra.mlpl`
   produces for all seven structures to `out/viewer-fixtures.json`.
2. `scripts/check-viewer-conformance` diffs the page's embedded `EXPECTED`
   table against those fixtures and **fails the gate** on any drift.

The page also recomputes them on load and reports the result at the bottom, so
a reader can see the agreement without running anything.

**MLPL is authoritative.** If the two ever disagree, the page is wrong. That is
not hypothetical: the check caught a wrong hand-transcription the first time it
ran. A table that is *not closed* can still have an identity — that question
only asks whether some row and column echo the headings, and it does not
require closure.
