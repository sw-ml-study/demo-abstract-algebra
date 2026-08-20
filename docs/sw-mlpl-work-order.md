# sw-MLPL work order

**Audience: an agent working in `sw-mlpl`.** This file is self-contained — you
should not need to read anything else in `demo-abstract-algebra` to act on it.

Everything here was found while building a real downstream program (a visual
abstract-algebra teaching repo) and **every claim was executed**, not read out
of the reference. Where the reference and the binary disagree, this file
follows the binary and says so.

Baseline: `mlpl-repl 0.20.0`, build `d373584c`, verified 2026-08-12 on macOS
(arm64).

---

## Recommended order

Ranked by value per unit of effort, not by severity.

| Order | Item | Kind | Effort | Why first |
|---|---|---|---|---|
| ~~1~~ | ~~[A1](#a1) bare-filename CLI failure~~ | **SHIPPED** | — | Verified fixed; the warning is out of docs/viewing.md |
| ~~2~~ | ~~[B1](#b1) `str_concat` / `str_join`~~ | **SHIPPED** | — | Adopted downstream; bridges deleted |
| ~~3~~ | ~~[B2](#b2) `to_string`~~ | **SHIPPED** | — | Adopted downstream; bridge deleted |
| ~~4~~ | ~~[B5](#b5) string-list as a `u:` argument~~ | **SHIPPED** | — | Adopted; the web demos pass plain lists now |
| 5 | [A4](#a4) document the 6 undocumented `svg()` types | bug | doc only | An undocumented capability is an absent one — this one cost a day |
| 6 | [D1](#d1) blank line separates a comment block | feature | one condition | Removes a `;` wart and most of [A3](#a3)'s reach |
| 7 | [A3](#a3) code renders inside the comment span | bug | small | Visibly wrong rendering |
| 8 | [C1](#c1) labelled categorical grid renderer | feature | medium | Would delete ~400 lines of hand-written SVG downstream |
| 9 | [A2](#a2) recursion aborts the process | bug | medium | Robustness; matters more while [B1](#b1) is open |
| ~~10~~ | ~~[B3](#b3) `str_len` / `str_slice` / `str_find` / `str_split`~~ | **SHIPPED** | — | All four verified live; `str_len` counts characters |
| — | everything else | mixed | — | Has honest workarounds |

**B1 and B2 have shipped** and are adopted downstream — `lib/render.mlpl` now
builds text with `str_join` and `to_string` like ordinary code, and both
bridges are deleted. `str_join` taking the whole fragment list in one call
turned the worst code in that repo into something readable, which was more
than the ask expected.

**Five have now shipped and been adopted downstream:** A1, B1, B2, B3, B5.
B3's four builtins were verified live against the current binary --
`str_len("héllo")` answers 5, so it counts CHARACTERS, and `lib/render.mlpl`'s
`u:text_width_px` has dropped its byte-counting bridge for an exact estimate.
One B3 bridge is still load-bearing: `str_find` answers the first index only,
so `u:count_substr` in `tests/test_render.mlpl` still counts occurrences by
rotating the haystack. What
remains, cheapest first: **A4** (documentation only, and the costliest
omission — six undocumented `svg()` types), then **D1** (one condition in the
statement grouper), then **A3** (the comment-span render bug), then **C1**
(the labelled categorical grid, which would delete most of a 500-line render
library downstream).

---

# Part A — Bugs

Visibly wrong behavior. No design intent supports any of these.

## A1. `mlpl-repl <bare-filename.mlpl>` exits 1 {#a1} — **SHIPPED**

**Symptom.** The invocation `--help` advertises does not work:

```
$ printf 'ok(1)\n' > mini.mlpl
$ mlpl-repl mini.mlpl
--source-dir : No such file or directory (os error 2)
$ echo $?
1
```

Every other spelling is fine:

```
$ mlpl-repl ./mini.mlpl            # Ok(1)
$ mlpl-repl sub/mini.mlpl          # Ok(1)
$ mlpl-repl /abs/path/mini.mlpl    # Ok(1)
$ mlpl-repl --source-dir . mini.mlpl   # Ok(1)
```

**Cause.** `components/cli/crates/mlpl-cli/src/include_script.rs`, `load_script`:

```rust
let root_dir = source_dir
    .map(Path::to_path_buf)
    .or_else(|| path.parent().map(Path::to_path_buf))
    .unwrap_or_else(|| Path::new(".").to_path_buf());
```

For a path with no separator, `Path::parent()` returns `Some("")` — **not**
`None`. So `or_else` yields an empty path, `unwrap_or_else` never fires, and
`FsProvider::new("")` fails. The error names a flag the user never passed,
which is why it is hard to connect to the cause.

**Fix.** Treat an empty parent as absent:

```rust
.or_else(|| {
    path.parent()
        .filter(|p| !p.as_os_str().is_empty())
        .map(Path::to_path_buf)
})
```

**Acceptance.**

```
mlpl-repl mini.mlpl        # Ok(1), exit 0, from the file's own directory
mlpl-repl ./mini.mlpl      # unchanged
mlpl-repl sub/mini.mlpl    # unchanged
```

Worth a regression test for the bare-filename case specifically.

---

## A2. Deep `u:` recursion aborts the process {#a2}

**Symptom.** Ordinary user code kills the interpreter with no MLPL-level
diagnostic:

```mlpl
def u:count(i, acc) { if lt(i, 2000) { u:count(i + 1, acc + 1) } else { acc } }
u:count(0, 0)
```

```
thread 'main' has overflowed its stack
fatal runtime error: stack overflow, aborting
```

Exit code 134. 500 frames is fine; 2000 aborts. The threshold varies with frame
size and is documented nowhere.

**Why it matters more than it looks.** With no string fold (see [B1](#b1)),
sw-MLPL's answer to "how do I build up a value?" is *recurse* — so the language
currently pushes programs toward the construct that crashes it. Downstream, a
substring counter walking a 2.5 KB document one byte per frame took a whole
test process down mid-suite, and the test runner reported it as
`structured test event stream ended with an active test`, which is a badly
misleading symptom.

**Fix.** A recursion-depth cap that raises a normal, catchable MLPL error
naming the function and the limit:

```
error: recursion limit (N frames) exceeded in u:count
```

An abort is never an acceptable response to ordinary user code.

**Acceptance.**

```mlpl
try { u:count(0, 0) } catch e { e.kind }   # a kind, not a dead process
```

Process exits 0 with a caught error rather than 134 with a runtime abort.

---

## A3. A multi-line entry renders its code inside the comment span {#a3}

**Symptom (web playground).** `render_input_line`
(`components/web-render/crates/mlpl-web-render-aux/src/entry.rs`) passes an
entry's **whole input** to `split_inline_comment`
(`components/web-tutorial/crates/mlpl-web-tutorial/src/comment.rs`), which
splits on the first `#` outside a string.

But entries are statement **groups**, not lines, and a full-line comment rides
with the statement after it. So this group:

```mlpl
# build the operation table
t = table(:u:fight, range(3), range(3))
```

splits at index 0: `code` is empty and `comment` becomes
`build the operation table\nt = table(...)`. The statement renders inside the
italic comment span — visually it vanishes into the prose.

`split_inline_comment`'s own doc comment says it splits *a line*. It is being
handed a group.

**Why the built-in catalog never hits it.** Every `lines` entry in
`components/web-demos/crates/mlpl-web-demos/demos.toml` is a single line. It
bites any *file* whose narrative lives in leading comments — including
`docs/apl2-idioms.mlpl`, which `statement_groups.rs` cites as the reason
comments ride with their statement at all.

**Fix.** Split per line inside the group, rendering each line's code and
comment separately.

**Acceptance.** A two-line entry `# note` + `x = 1` renders `# note` as an
italic comment line and `x = 1` as code, not both as comment.

---

## A4. `docs/lang-reference.md` documents 6 of 12 `svg()` types {#a4}

**Symptom.** The reference lists `scatter`, `line`, `bar`, `heatmap`,
`gallery`, `decision_boundary`. The dispatch in
`components/viz/crates/mlpl-viz/src/svg.rs` has **twelve**:

```
scatter  scatter3d  plotly3d  line  bar  heatmap  heatmap_grid
life  waffle  critical_dimensions  gallery  attention_overlay  decision_boundary
```

Undocumented: `life`, `heatmap_grid`, `waffle`, `scatter3d`, `plotly3d`,
`attention_overlay`.

**What it cost.** `svg(frames, "life")` takes a `[T, H, W]` array and emits a
**SMIL-animated** grid. Not finding it in the reference, a downstream repo
hand-wrote ~400 lines of SVG emission *including its own SMIL animation*, and
filed four blockers about missing string primitives that it only needed because
of that hand-rolling. The builtin does the job in one line:

```mlpl
# Frame k marks every cell where a * b = k; a group's frames are each a
# permutation matrix, so a Latin square becomes something you watch.
svg(reshape(transpose(one_hot(flatten(t), n)), [n, n, n]), "life")
```

From a downstream point of view an undocumented capability is an absent one.
**This is the cheapest high-value item in the whole file.**

**Also in the same doc:** the if/else section shows

```mlpl
greeting = if env("USER") { "hello " + name } else { "no user" }
```

That example does not run — `"ab" + "cd"` is `expected an array value, got a
string`. The same file correctly states, 800 lines earlier, that strings cannot
be combined with numeric operators. The example contradicts the rule and
implies concatenation exists.

**Fix.** Document all twelve with their expected shapes; correct or remove the
`+` example.

---

# Part B — The missing text surface

sw-MLPL cannot join two strings or turn a number into one. Any program that
*generates* text — SVG, HTML, labels, reports — hits this immediately.

**What already works, so nobody implements it twice:** `to_number` and
`to_int` parse strings into numbers correctly and are Result-based with good
messages. `equal` compares strings. `tokenize_bytes` / `decode_bytes`
round-trip. The gap is one-directional.

## B1. String concatenation {#b1} — **SHIPPED**

**Symptom.** Both plausible spellings are rejected:

```mlpl
"ab" + "cd"           # error: expected an array value, got a string
concat("ab", "cd")    # error: expected an array value, got a string
```

Nothing in the 184-entry `:builtins` catalog joins two strings.

**Current downstream bridge, to be deleted:**

```mlpl
def u:cat(a, b) { decode_bytes(concat(tokenize_bytes(a), tokenize_bytes(b))) }
```

Correct, and it round-trips the whole string through a byte array on every
join — O(total²) across a fold.

**Proposed.**

```
str_concat(a, b)              -> string
str_join(parts, separator)    -> string    # parts is a string-list
```

`str_join` matters as much as `str_concat`: it is the linear-time fold. It must
be O(total), not O(n²). Exact byte-for-byte joining, Unicode preserved, no
implicit coercion — a number argument is an error, not a silent `to_string`.

**Acceptance.**

```mlpl
str_concat("ab", "cd")            == "abcd"
str_concat("", "x")               == "x"
str_concat("x", "")               == "x"
str_join(["a", "b", "c"], "")     == "abc"
str_join(["a", "b", "c"], ", ")   == "a, b, c"
str_join([], "-")                 == ""
str_join(["only"], "-")           == "only"
str_concat("é", "x")              == "éx"      # 3 bytes, not mangled
```

## B2. Number to string {#b2} — **SHIPPED**

**Symptom.** There is no inverse of `to_number`. The nearest thing is a
diagnostic renderer: `repr(3)` is `"array[] [3]"`.

**Current downstream bridge, to be deleted:**

```mlpl
def u:num(x) { unwrap(to_json(x)) }   # to_json of a scalar IS its numeral
```

This works — `12` → `"12"`, `1.5` → `"1.5"`, `0-3` → `"-3"`, `8/2` → `"4"` —
but it depends on incidental behavior of an **encoder**. `to_json`'s scalar
formatting is not specified as a number-formatting contract, so if it ever
changes, every generated diagram downstream changes with it, silently.

**Proposed.**

```
to_string(x)   -> string    # the honest inverse of to_number
```

Round-trip contract: `to_number(to_string(x))` recovers `x` exactly for every
finite `f64` (shortest round-trip formatting, which `to_json` already does).
Integral values print bare: `to_string(8 / 2)` is `"4"`, not `"4.0"`.

**Deliberately NOT asking for a format spec.** Shortest round-trip is verbose
for computed values (`to_json(64 / 3)` is `"21.333333333333332"`), but that is
correct behavior and already solvable with the existing `round`:

```mlpl
u:num(round(64 / 3 * 100) / 100)     # "21.33"
```

Ship the one-argument form; rounding belongs in a library.

**Acceptance.**

```mlpl
to_string(0)                     == "0"
to_string(12)                    == "12"
to_string(0 - 3)                 == "-3"
to_string(1.5)                   == "1.5"
to_string(8 / 2)                 == "4"
to_number(to_string(sqrt(2)))    == sqrt(2)
```

## B3. Strings have no length, index, or search {#b3}

**Symptom.** Every array accessor rejects strings:

```mlpl
size("abcd")          # expected an array value, got a string
tally("abcd")         # expected an array value, got a string
take("abcd", 0, 1)    # expected an array value, got a string
split("abc")          # expected an array value, got a string
eq("a", "a")          # expected an array value, got a string
```

No substring search, no slice, no case operation, no trim.

**Proposed.**

```
str_len(s)                  -> scalar        # CHARACTERS, not bytes
str_slice(s, start, len)    -> string        # character-indexed
str_find(s, needle)         -> scalar        # first index, -1 if absent
str_split(s, separator)     -> string-list
```

`str_len` counting **characters** is the important half — byte length is
already reachable via `size(tokenize_bytes(s))`, and conflating the two is how
text bugs ship. Today there is no way to get a character count at all:
`size(tokenize_bytes("héllo"))` is **6**, not 5.

**Acceptance.**

```mlpl
str_len("abcd")                       == 4
str_len("héllo")                      == 5      # characters, not the 6 bytes
str_slice("abcdef", 1, 3)             == "bcd"
str_find("<rect/><rect/>", "<rect")   == 0
str_find("abc", "z")                  == 0 - 1
str_split("a,b,c", ",")               == ["a", "b", "c"]
str_split("abc", ",")                 == ["abc"]
```

**What it unblocks.** A semigroup lesson whose natural subject is string
concatenation — the canonical semigroup that is not a monoid until you add
`""`. Currently unwritable in its intended form.

## B4. String lists cannot be built {#b4}

**Symptom.**

```mlpl
concat(["a"], ["b"])   # expected an array value, got a string
concat(["a"], "b")     # expected an array value, got a string
```

`string-list` is a first-class value kind with `list_get` and `list_len`, but
it can only arrive as a **literal**, or from `record_keys`, `parse_json`, or a
tokenizer vocabulary. A program cannot append to one — which also makes
`str_join` (B1) unusable, since nothing can produce its input.

**Proposed.** Either add `list_append(xs, s)` / `list_concat(xs, ys)`, or —
better and smaller — **make `concat` accept string lists**. It is already the
concatenation builtin and the extension is unambiguous.

**Acceptance.**

```mlpl
list_len(list_append(["a"], "b"))    == 2
list_get(list_append(["a"], "b"), 1) == ok("b")
list_len(list_append([], "a"))       == 1
list_concat(["a"], ["b", "c"])       == ["a", "b", "c"]
```

## B5. A `u:` function cannot take a string list {#b5} — **SHIPPED**

**Symptom.**

```mlpl
def u:f(xs) { list_len(xs) }
u:f(["a", "b", "c"])
# error: unsupported: u:f: argument 'xs' must be an array, Result, string,
# record, function reference, or partial
```

The same list passes fine **inside a record**:

```mlpl
def u:g(r) { list_len(r.names) }
u:g({names: ["a", "b", "c"]})       # 3
```

The error message lists `string` as permitted but not `string-list` — and
`string-list` is one of the nine documented value kinds. Every other kind on
that list is accepted. This reads as an oversight in the argument-domain check
rather than a decision.

**Fix.** Accept `string-list` in the `u:` argument domain. No new builtin.

**Acceptance.**

```mlpl
def u:f(xs) { list_len(xs) }
u:f(["a", "b", "c"])   == 3
u:f([])                == 0
```

---

# Part C — Visualization

## C1. A labelled, categorically-coloured grid {#c1}

**Symptom.** `svg(t, "heatmap")` renders an `MxN` matrix as viridis-coloured
cells. It draws no row or column headings, no cell values, and offers no way to
highlight a row, column, or cell. `svg(frames, "life")` animates, but has four separate deficiencies that
together make it unusable for a Cayley table: **no row or column labels**;
**one colour for every live cell** (`> 0.5` is alive, all painted `#a6e3a1`),
so a cell's *value* cannot carry identity; **no caption**, so nothing says
which element a frame is about; and a **fixed `FRAME_SECS = 0.35`**, making a
5-frame loop 1.75s — too fast to read. A reader shown one asked, reasonably,
"what is the pattern supposed to convey?"

**Why both matter together.** A Cayley table's entries are element
**identities**, not magnitudes — viridis is actively misleading for them — and
the teaching moments are highlights: ring the identity element's row and column
and the definition of an identity explains itself.

Downstream this forced ~400 lines of hand-written SVG, which is the entire
reason blockers [B1](#b1) and [B2](#b2) were filed.

**Proposed.** One renderer covers both gaps — a `"table"` type with categorical
colouring, taking labels and highlights through the existing `aux` argument:

```
svg(t, "table", {row_labels, col_labels, cell_text, highlight_rows, highlight_cols})
```

Plus a categorical, labelled, pace-adjustable variant of `life` — a cell's
value selects a palette entry, axes carry labels, each frame carries a caption,
and the frame duration is an argument. The working shape is demonstrated by
`u:frames_svg` in `demo-abstract-algebra/lib/render.mlpl`: the whole labelled
table stays on screen and each frame RINGS the cells it owns, so nothing blinks
out of existence and the pattern is actually legible.

**What it deletes downstream:** most of a 500-line render library.

## C2. `life` renders small boards small {#c2}

Cell size is `clamp(600 / max(h, w), 8, 36)` in
`components/viz/crates/mlpl-viz-marks/src/life.rs`, tuned so a 40x40 Life board
fits 600px. A 3x3 board therefore renders at **132px** — the `MAX_CELL` clamp
binds long before the target edge does.

Algebra tables are always small (orders 2–8), so every such diagram sits in the
range where the clamp makes it tiny.

**Fix.** `MAX_CELL` around 80, or an optional size argument. One constant.

## C3. No graph or network type {#c3}

None of the twelve types draws a node-link diagram.

**Where it bites.** A dominance digraph — the pentagram that makes
Rock-Paper-Scissors-Lizard-Spock memorable — is a directed graph on five nodes.
Downstream it is emitted by hand, and that hand-rolling is about half the demo.

**Proposed.** A `"digraph"` type taking an `[N, N]` adjacency matrix, with node
labels via `aux`, laying nodes on a circle. Adjacency matrices are arrays, so
this is squarely in the language's wheelhouse — and it would also give
`knn_graph` a renderer, which it currently lacks.

---

# Part D — Playground narration

Four findings about how a *pasted or uploaded file* can frame itself. They
matter because companion repositories exist to demonstrate sw-MLPL, and right
now they cannot produce a demo that reads like sw-MLPL's own.

Context that is load-bearing: the editor's Run evaluates a file as balanced
statement **groups** (`statement_groups.rs`) and shows one REPL entry per group.
A demo therefore narrates itself with **comments, not string literals** — a
string statement echoes twice (once as the input line, once as its evaluated
output) while a comment renders once with no output.

## D1. A blank line cannot separate a comment block {#d1}

`group_statements` discards blank lines before any flush logic:

```rust
let trimmed = line.trim();
if trimmed.is_empty() { continue; }     // blank lines vanish
```

So a comment block always rides with the statement after it, however it is
spaced. Measured: zero, one, and three blank lines all produce **one** group.

A blank line is the universal paragraph separator, and a file has no other way
to say "this commentary stands alone".

**Workaround in use downstream:** a bare `;` after the block. It has balanced
brackets so it closes the group, and evaluates to nothing:

```
# block line one
# block line two
;                  ->  group 1: the comment block, empty output
def u:f(x) { x }   ->  group 2: the definition
```

That works, and it is a wart — punctuation standing in for a paragraph break.

**Proposed.** Flush a pending comment-only buffer when a blank line is seen.
One condition in `group_statements`.

**Note it is a behavior change:** files that today merge a comment block into
the following statement would split into two entries. That split is the
improvement, and it makes [A3](#a3) much less reachable. **Best value of the
four items in this part.**

## D2. No block comment syntax {#d2}

`#` starts a line comment to end of line; there is no block form.
`/* ... */` is a parse error; `#* ... *#` is just a line comment with an inert
closer.

Since narration must be comments (above), every paragraph is a run of `#`
lines. Downstream they are framed with asterisk bars to read as blocks:

```mlpl
# **********************************************************************
# * WHAT THIS SHOWS
# *
# * Rock-Paper-Scissors is a MAGMA: a set with one closed binary
# * operation, and nothing else.
# **********************************************************************
```

Legible, but every line carries `# * ` scaffolding, and reflowing a paragraph
means re-prefixing it.

**Proposed.** `#* ... *#`. It fits the existing `#` lexeme and stays
unambiguous with the line form.

## D3. A pasted file cannot declare narration {#d3}

The playground already has the right affordance: `EntryKind::Narration` renders
prose with no `mlpl>` prompt, and the built-in catalog uses it for each demo's
`intro` and `takeaway`.

Only three places create one, and none is reachable from source:

```
mlpl-web-handlers-eval/src/demo.rs      the catalog demo runner (intro/takeaway)
mlpl-web-handlers-upload/src/upload.rs  the upload handler's status lines
mlpl-web-handlers-eval/src/running.rs   the "evaluating..." placeholder
```

So a file pasted or uploaded into the editor can only be narrated by strings
(which echo twice) or comments (italic annotations beside code). Neither looks
like a demo's intro or takeaway, and a reader can see the difference.

**Proposed,** cheapest first:

- promote a **leading** comment block to the intro and a **trailing**
  comment-only group to the takeaway. `statement_groups.rs` already isolates
  the trailing case deliberately and documents it as "a closing summary ...
  emitted for narration" — the intent is there, only the `EntryKind` is
  missing;
- or honour top-level `@intro "..."` / `@takeaway "..."`, harvestable through
  the existing `annotations(...)`;
- or let the upload handler read a companion `.toml` beside the file.

Note this composes with [D2](#d2): whatever marks a block is the natural place
to mark it as narration.

---

# Part E — Minor, with honest workarounds

## E1. No `ge` / `le` builtins

`eq`, `gt`, `lt` exist. "Not below zero" is currently spelled `1 - lt(x, 0)`.
Cosmetic, but it costs a reader a beat every time. Two builtins.

## E2. Broadcasting is scalar-only

`[1,2,3] + 10` works; `eq(T, hdr)` with `T` `[3,3]` and `hdr` `[3]` fails with
`shape mismatch: 9 vs 3 elements`. The workaround is to materialize the vector
as a full matrix — correct, and `O(n²)` where `O(n)` would do.

This appears to be a deliberate design choice rather than an oversight, so the
ask is either to reconsider it, or to supply `broadcast_to(a, dims)` so the
intent is at least spelled once.

## E3. Document that inline SVG needs `width` and `height`

Not a code bug — a trap. The playground renders an SVG result inside
`.svg-output { display: inline-block }`, so an `<svg>` carrying only a
`viewBox` has no intrinsic width, defaults to `100%`, resolves against a
shrink-to-fit parent, and collapses to zero. The reader sees the download arrow
and an empty box.

Every built-in renderer sets both attributes, so this only bites programs that
emit their own SVG — which is exactly what a downstream repo does while
[C1](#c1) and [C3](#c3) are open. It cost a full round of "the demo shows
nothing" here.

Either document the requirement wherever `svg()` output is described, or make
the panel defensive (`.svg-output svg { width: max-content }` or similar).

---

## E4. `run_script` returns a string result's repr, not the string

```mlpl
r = unwrap(run_script("demo.mlpl", {source_dir: "."}))
type_of(r.value)      # "string"
# ...but the first byte is 34 ("), and interior quotes are backslashed
```

`type_of` still says `string`, which makes the wrapping easy to miss. A caller
cannot use a child script's textual output without unescaping it by hand.

Either return the value unmodified, or document `value` as a rendering and add
a raw field beside it. The first is better — Results and record fields already
round-trip fine, so strings are the outlier.

---

# Verifying a fix landed

`demo-abstract-algebra` carries a probe that reports the state of the text
surface. After changing anything in Part B, from that repo:

```sh
just demos            # runs probes/text_capabilities.mlpl among others
```

It prints one line per capability, `OPEN` or `CLOSED`, and names the downstream
bridge each closed item makes deletable. It **reports, it does not gate** — the
repo must keep building against the current interpreter — so a `CLOSED` line is
a to-do for that repo, not a failure for yours.

For Part D, the check that matters is behavioral: load
`demo-abstract-algebra/web/magma_rps.mlpl` into the playground editor and press
Run. It should read as prose block, definitions, prose + picture, prose +
picture, prose — with nothing said twice and no statement rendered inside a
comment span.

---

# Provenance

Every symptom above was reproduced against the binary, and the playground
findings were measured by importing the real `WasmSession` from a served copy
of `pages/` and evaluating these files through a faithful port of
`group_statements`. Where this file names a Rust path, the behavior was read at
that path, not inferred.

Fuller narrative context, with the downstream code each item affects, is in
`docs/upstream-asks.md` and `docs/mlpl-blockers.md` in the same repository.
This file is the actionable subset and is intended to stand alone.
