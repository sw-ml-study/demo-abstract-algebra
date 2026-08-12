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

## 9. `mlpl-repl <bare-filename.mlpl>` fails with exit 1

The most natural invocation a newcomer types does not work:

```
$ mlpl-repl mini.mlpl              # mini.mlpl contains just: ok(1)
--source-dir : No such file or directory (os error 2)
$ echo $?
1
```

Every other spelling of the same run is fine:

```
$ mlpl-repl ./mini.mlpl            # Ok(1)
$ mlpl-repl sub/dir/mini.mlpl      # Ok(1)
$ mlpl-repl /abs/path/mini.mlpl    # Ok(1)
$ mlpl-repl --source-dir . mini.mlpl   # Ok(1)
```

**Diagnosis:** the default sandbox root is documented as "the script's own
directory" and is presumably computed as the path's parent. For a bare
filename that parent is the empty string, and the empty path is then opened
and fails. The message names a flag the user never passed, which makes it hard
to connect to the cause.

**Where it bit:** verifying that the generated `web/*.mlpl` entries run
standalone. Nothing in this repository is blocked — every script here is
invoked through `scripts/select-mlpl` with an explicit `--source-dir` — but
`docs/viewing.md` has to warn readers about it, which is a bad first
impression for a language whose `--help` shows exactly this form:

```
mlpl-repl <script.mlpl> [-- ARGS]      Run a script (positional path)
```

**Severity:** low impact here, high impact on first contact. Fix is to treat an
empty parent as `.`.

---

## 10. `run_script` returns a string result's REPR, not the string

`run_script(path, opts)` answers `ok({status, value, ...})`. When the child
script's final value is a string, `value` carries the quoted, escaped
*rendering* rather than the string itself:

```mlpl
r = unwrap(run_script("web/rps_cayley_web.mlpl", {source_dir: "."}))
type_of(r.value)                         # "string"
# first bytes are 34 60 115 118 103 ...  -->  "  <  s  v  g
```

So `r.value` begins with a `"` byte and every interior quote is backslashed.
`type_of` still says `string`, which makes the wrapping easy to miss.

**Where it bit:** `tests/test_web_entries.mlpl` runs each generated Web UI
bundle and asserts the result begins with `<svg` — the exact predicate the
playground uses to decide whether to draw an SVG widget. The check failed
against a value that *was* an SVG.

**Workaround:** skip a leading quote byte before comparing. That is correct for
the prefix test but cannot recover an escaped string in general — a child
script's textual output is not reliably retrievable by its caller.

**Severity:** medium. `run_script` is the composition primitive for programs
that orchestrate other programs, and a caller cannot use a returned string
without unescaping it by hand. Either return the value unmodified, or document
`value` as a rendering and add a raw field beside it. The first is better; the
Result and record fields already round-trip fine, so strings are the outlier.

---

## 11. `docs/lang-reference.md` documents 6 of the 12 `svg()` types

The reference lists `scatter`, `line`, `bar`, `heatmap`, `gallery`, and
`decision_boundary`. The dispatch in
`components/viz/crates/mlpl-viz/src/svg.rs` has **twelve**:

```
scatter  scatter3d  plotly3d  line  bar  heatmap  heatmap_grid
life  waffle  critical_dimensions  gallery  attention_overlay  decision_boundary
```

`life`, `heatmap_grid`, `waffle`, `scatter3d`, `plotly3d`, and
`attention_overlay` are undocumented.

**Why it cost real work:** `svg(frames, "life")` takes a `[T, H, W]` array and
emits a **SMIL-animated** grid — exactly the capability this repository needed.
Not finding it in the reference, this repo hand-wrote ~400 lines of SVG
emission, including its own SMIL, and paid for it with blockers B1–B4 (no
string concatenation, no number-to-string). A one-line builtin was there the
whole time:

```mlpl
svg(reshape(transpose(one_hot(flatten(t), n)), [n, n, n]), "life")
```

That renders an animated Cayley table — one frame per element — with no
hand-written SVG at all. It is now `demos/web/latin_square.mlpl`, five
statements long.

**Severity:** high, and it is a documentation fix rather than a code change.
An undocumented capability is, from a downstream repo's point of view, an
absent one. Listing all twelve in the reference (with shapes) would have saved
this repository a day and made blockers B1–B4 far less urgent.

---

## 12. `svg(_, "life")` is binary, so it cannot carry element identity

`render_life` marks a cell alive when its value is `> 0.5` and paints every
live cell the same green. That is right for Game of Life and it is the only
reason the animated Cayley table above needs the `one_hot` trick: identity has
to be moved from the cell VALUE onto a frame AXIS.

The trick is genuinely nice — a group's frames are each a permutation matrix,
so the Latin square becomes something you watch rather than read — but it is a
workaround. A categorical variant, where cell value selects a color from a
palette, would render a Cayley table directly as one frame.

**Related:** ask #5 wants headings and cell text on `heatmap`. The two together
describe one missing renderer: a labelled, categorically-colored grid. That
single addition would delete most of `lib/render.mlpl`.

**Severity:** medium. The workaround works and teaches something.

---

## 13. `svg(_, "life")` renders small boards small

Cell size is `clamp(600 / max(h, w), 8, 36)`, tuned so a 40x40 Life board fits
in 600px. A 3x3 board therefore renders at 132px — the cap binds long before
the target edge does.

Algebra tables are always small: orders 2 through 8. Every diagram this
repository would draw with `life` sits in the range where the clamp makes it
tiny.

**Severity:** low. A `MAX_CELL` of ~80, or an optional size argument, fixes it.
Noted because the fix is one constant and the current default is wrong for
every use in this repo.

---

## 14. `svg()` has no graph or network type

The twelve types cover points, lines, bars, grids, images, and attention. None
draws a node-link diagram.

**Where it bit:** the dominance digraph — the pentagram that makes
Rock-Paper-Scissors-Lizard-Spock memorable — is a directed graph on five nodes.
`demos/web/rpsls_pentagon.mlpl` emits it by hand, and that hand-rolling is
about half the demo's length.

A `"digraph"` type taking an `[N, N]` adjacency matrix (plus optional node
labels via `aux`) and laying nodes out on a circle would cover it, and would
also serve `knn_graph`, which already returns an edge list and currently has no
renderer.

**Severity:** medium. Adjacency matrices are arrays, so this is squarely in the
language's wheelhouse.

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
