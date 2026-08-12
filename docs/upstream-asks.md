# Upstream asks: sw-MLPL friction found building visual algebra demos

Every entry is something a lesson in this repository actually needed. None is
speculative. Each has a working bridge, recorded here so the bridge can be
deleted when the language grows.

> **Six of these are blockers, not asks.** This repository is dogfooding
> sw-MLPL, and the missing text surface — no string concatenation, no
> number-to-string, no string length or search, no way to build a string list —
> is a set of deficiencies to be **fixed upstream and then used**, not worked
> around permanently. They are specified for implementation, with acceptance
> tests, in **[docs/mlpl-blockers.md](mlpl-blockers.md)**. Entries #3, #4, #6,
> #7, and #8 below are summaries; that file is authoritative for them.
>
> `probes/text_capabilities.mlpl` reports open vs. closed on every run of
> `just demos`.

The remaining entries (#1, #2, #5) are genuine friction with honest workarounds
and can wait.

Per `AGENTS.md`, this repository does not modify `../sw-mlpl`. This file is the
record; promoting any of it upstream is a separately authorized task.

Baseline: `mlpl-repl 0.20.0`, build `d373584c`. Every claim below was executed
against the binary, not read out of the reference doc — the two disagree in at
least one place (see `docs/mlpl-blockers.md`, "Documentation drift").

A correction to an earlier draft of this file: **`to_number` and `to_int` exist
and work correctly.** Parsing a number *from* a string is not a gap; only the
reverse direction is missing.

---

## 1. No `ge` / `le` comparison builtins

`eq`, `gt`, `lt` exist; `ge` and `le` do not.

**Where it bit:** closure means every entry lies in `0 .. n-1`. The natural
spelling is `ge(t, 0) * lt(t, n)`.

**Workaround** (`lib/algebra.mlpl`, `u:is_closed`):

```mlpl
reduce(:and, flatten((1 - lt(t, 0)) * lt(t, n)))
```

**Severity:** cosmetic, but it costs a reader a beat every time. Two builtins.

---

## 2. Broadcasting is scalar-only; no rank extension

`[1,2,3] + 10` works. `eq(T, hdr)` with `T` of shape `[3,3]` and `hdr` of shape
`[3]` fails with `shape mismatch: 9 vs 3 elements`.

**Where it bit:** the identity test is "row `e` reproduces the header", which
wants to compare an `[n, n]` table against an `[n]` header vector.

**Workaround** (`lib/algebra.mlpl`, `u:header_matrix`): materialize the header
as a full matrix with `table(:u:second, elements, elements)`. Correct, and
`O(n^2)` where `O(n)` would do.

**Severity:** real. NumPy-style trailing-axis broadcast would remove a class of
scaffolding across every array program, not just this repo. Note that this is
a deliberate design choice in sw-MLPL, not an oversight — the ask is to
reconsider it, or to supply a `broadcast_to(a, dims)` builtin so the intent is
at least spelled once.

---

## 3. No string concatenation — **BLOCKER B1**

Strings are a separate value kind and cannot be combined with any operator.
`print` is variadic specifically to avoid needing concatenation.

**Where it bit:** `lib/render.mlpl` emits SVG. Every element of it is built
text.

**Workaround:**

```mlpl
def u:cat(a, b) { decode_bytes(concat(tokenize_bytes(a), tokenize_bytes(b))) }
```

That round-trips through a byte array for every join — correct, `O(len)` per
call, and quadratic across a fold.

**Blocker B1.** Specified with acceptance tests in
[docs/mlpl-blockers.md](mlpl-blockers.md#b1--string-concatenation-blocking-highest-priority).

---

## 4. No number-to-string conversion — **BLOCKER B2**

`to_number` / `to_int` parse strings into numbers. There is no inverse.
`repr(3)` returns `"array[] [3]"` — a diagnostic rendering, not a numeral.

**Workaround:** `to_json` of a scalar happens to be exactly its digits:

```mlpl
def u:num(x) { unwrap(to_json(x)) }
```

This works and is deterministic, but it depends on an encoder's incidental
output format. If `to_json`'s scalar formatting ever changes, every SVG in this
repo changes with it.

**Blocker B2.** Specified with acceptance tests in
[docs/mlpl-blockers.md](mlpl-blockers.md#b2--number--string-blocking).

---

## 5. `svg(t, "heatmap")` cannot teach

The built-in heatmap renders an `MxN` matrix as viridis-colored cells. It draws
no row or column headings, no cell values, and offers no way to highlight a
row, column, or cell.

**Where it bit:** a Cayley table without headings is unreadable, and the
identity lesson *is* the highlight — ring row `e` and column `e` and the
definition explains itself.

**Workaround:** `lib/render.mlpl` emits its own SVG, which is why asks #3 and
#4 exist at all.

**Severity:** medium. Two options, either sufficient:

- an optional `aux` record on `svg(...)` carrying `{row_labels, col_labels,
  cell_text, highlight_rows, highlight_cols}`; or
- a new type name `"table"` with categorical (not sequential) coloring, since a
  Cayley table's entries are element *identities*, not magnitudes — viridis is
  actively misleading here.

The second is the better fix and is a small addition.

---

## 6. A `u:` function cannot take a string list — **BLOCKER B5**

Passing a `string-list` to a user-defined function is rejected:

```
error: unsupported: u:f: argument 'xs' must be an array, Result, string,
record, function reference, or partial
```

A string list inside a **record** is accepted, and `list_get` / `list_len`
work on it normally once unpacked.

**Where it bit:** element names. Every renderer needs them; none can take them.

**Workaround:** the structure record `{title, names, table}` threaded through
`lib/render.mlpl`. This turned out to be reasonable design, so the workaround
is not painful — but it was forced, not chosen.

**Severity:** medium. `string-list` is a first-class value kind and a documented
one; excluding it from the user-function argument domain looks like an
oversight rather than a decision. Everything else on that list is accepted.

---

## 7. No string reduction or fold — **BLOCKER B1/B4**

There is no `reduce` over strings and no `join`. Building text from `n` pieces
means threading an accumulator through recursion by hand.

**Where it bit:** `u:cells_svg` recurses once per cell — `n^2` frames deep — to
build the table's SVG. It works, and it will stop working at some `n`.

**Workaround:** hand-threaded recursion (`lib/render.mlpl`).

**Severity:** medium, and it bounds the repo: see `docs/plan.md`, "What would
make this plan wrong". A `join(string_list, separator)` builtin fixes both this
and the fold half of #3.

---

## 8. Deep `u:` recursion aborts the process instead of erroring — **BLOCKER B6**

With no string fold (#7), an accumulator has to be threaded through recursion.
At a few thousand frames the interpreter dies:

```
thread 'main' has overflowed its stack
fatal runtime error: stack overflow, aborting
```

Reproduce (exit code 134, no MLPL-level diagnostic):

```mlpl
def u:count(i, acc) { if lt(i, 2000) { u:count(i + 1, acc + 1) } else { acc } }
u:count(0, 0)
```

500 frames is fine; 2000 aborts. The exact threshold will vary with frame size
and platform, which is part of the problem — there is no stated limit.

**Where it bit:** the first version of `u:count_substr` in
`tests/test_render.mlpl` walked a ~2.5 KB SVG one byte per frame and took the
whole test process down mid-suite. mlplunit reported it as "structured test
event stream ended with an active test", which is a confusing symptom for a
stack overflow.

**Workaround:** restructure so the recursion is over the small dimension. The
substring counter now recurses over the *needle* (a handful of frames) and uses
`rotate` + element-wise `eq` across the haystack, which is both faster and the
more idiomatic array formulation. That was a better program in the end — but it
was found by crashing, not by a diagnostic.

**Severity:** medium-high as a robustness issue, low as a feature request. A
recursion-depth cap that raises a normal MLPL error naming the function and the
limit would turn an abort into a fixable message. This matters more than usual
here because sw-MLPL's answer to "how do I fold?" is currently "recurse".

---

## Not asks

Recorded so a later session does not re-litigate them:

- **`table(f, a, b)` is exactly right.** The whole Cayley-table representation
  falls out of one existing builtin. This is the language's best moment in the
  repo so far.
- **`gather_rows` + `transpose_axes` express the associativity check
  loop-free.** All `n^3` triples in three lines, no comprehension syntax
  needed. See `u:left_cube` / `u:right_cube`. The brief asked "what is the
  natural array-language formulation of checking a law over `M^3`?" — this is
  the answer, and it is a good one.
- **`grade_up` gives stable first-counterexample extraction for free.** A
  stable ascending argsort over a 0/1 mask puts the lowest-indexed failure at
  position 0, so witnesses are deterministic without a search.
