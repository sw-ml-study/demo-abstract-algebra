# sw-MLPL blockers: the missing text surface

**Status: B1, B2 and B5 are CLOSED** — shipped upstream and adopted here, with their bridges deleted. The rest stand.

**Blockers, not preferences.** This repository is dogfooding sw-MLPL.
Every lesson here has to turn an algebraic structure into something a learner
can look at, and that means generating text — SVG, HTML, labels. sw-MLPL
currently cannot concatenate two strings. The bridges in `lib/render.mlpl`
exist so lesson 01 could ship; they are **not the answer**, and this document
specifies what replaces them.

Each blocker below states the verified symptom, why it blocks, the builtin
that fixes it, and exactly what this repository deletes when it lands.

> **To hand upstream:** [docs/sw-mlpl-work-order.md](sw-mlpl-work-order.md) is
> the self-contained work order covering these blockers *and* every other
> finding, with fix sites and a recommended order. This file is the deeper
> treatment of the text surface specifically.

Verified against `mlpl-repl 0.20.0`, build `d373584c`, 2026-08-12. Every claim
here was executed, not read out of `docs/lang-reference.md` — the reference and
the binary disagree in at least one place (see "Documentation drift").

---

## First, what already works

Recorded so no one implements it twice, and because one of these was assumed
missing and is not.

| Capability | Status | Evidence |
|---|---|---|
| **String → number** | **Works.** Not a gap. | `to_number("42")` → `Ok(42)`; `to_int("42")` → `Ok(42)`; `to_number("x")` → `Err(to_number: cannot parse "x" as a number)`. Result-based, with a good message. |
| String equality | Works | `equal("a", "a")` → `1` (total structural equality; `eq` does *not* accept strings) |
| String → bytes → string | Works | `tokenize_bytes("abcd")` → 4 bytes; `decode_bytes([104, 105])` → `"hi"` |
| String literals, string lists | Work | `["a", "b"]`, `list_get`, `list_len` |
| String file I/O | Works | `read_text`, `write_text`, `write_atomic` |
| JSON encode/decode of strings | Works | `to_json` / `parse_json`, exact Unicode |

`to_number` / `to_int` are the *inverse* direction and they are fine. The gap
is one-directional: **numbers cannot become strings, and strings cannot be
combined.**

---

## B1 — String concatenation — **CLOSED, adopted**

### Symptom

Both plausible spellings are rejected:

```mlpl
"ab" + "cd"           # error: expected an array value, got a string
concat("ab", "cd")    # error: expected an array value, got a string
```

`concat` is documented for rank-0/rank-1 arrays only. Nothing in the 184-entry
`:builtins` catalog joins two strings. (The reference doc contains an example
reading `"hello " + name` in its if/else section — that example does not run.
See "Documentation drift".)

### Why it blocks

Generating any text output is composition of fragments. One SVG `<rect>` is
seven fragments. `lib/render.mlpl` builds an entire diagram this way.

### Current bridge (to be deleted)

```mlpl
def u:cat(a, b) { decode_bytes(concat(tokenize_bytes(a), tokenize_bytes(b))) }
```

Correct, and it round-trips the whole string through a byte array on every
join — so building an `n`-fragment document is O(total²) in bytes copied. It
also reads as an obfuscation of the thing it does.

### Required

```
str_concat(a, b)              -> string        # two strings
str_join(parts, separator)    -> string        # a string-list, one pass
```

`str_join` matters as much as `str_concat`: it is the linear-time fold that B4
and B6 both need. `str_join(["a","b","c"], "")` must be O(total), not O(n²).

Semantics: exact byte-for-byte concatenation, Unicode preserved, no implicit
coercion of non-string arguments (a number argument is an error, not a silent
`to_string`). Empty parts and an empty separator are legal.

### Acceptance

```mlpl
str_concat("ab", "cd")              == "abcd"
str_concat("", "x")                 == "x"
str_concat("x", "")                 == "x"
str_join(["a", "b", "c"], "")       == "abc"
str_join(["a", "b", "c"], ", ")     == "a, b, c"
str_join([], "-")                   == ""
str_join(["only"], "-")             == "only"
str_concat("é", "x")                == "éx"        # 3 bytes, not mangled
```

### Deletes here

`u:cat`, `u:cat3`, `u:cat5` in `lib/render.mlpl`, and the "string primitives"
case in `tests/test_render.mlpl`.

---

## B2 — Number → string — **CLOSED, adopted**

### Symptom

There is no inverse of `to_number`. The closest thing is a diagnostic renderer:

```mlpl
repr(3)        # "array[] [3]"   -- a debug rendering, not a numeral
repr("hi")     # "\"hi\""        -- quoted, for diagnostics
```

### Why it blocks

Every SVG coordinate, every cell value, every axis label is a number that has
to become text.

### Current bridge (to be deleted)

```mlpl
def u:num(x) { unwrap(to_json(x)) }     # to_json of a scalar IS its numeral
```

This works — `u:num(12)` → `"12"`, `u:num(1.5)` → `"1.5"`, `u:num(0-3)` →
`"-3"` — but it depends on incidental behavior of an *encoder*. `to_json`'s
scalar formatting is not specified as a number-formatting contract, so if it
ever changes, every diagram in this repository changes with it, silently.
`tests/test_render.mlpl` pins the behavior precisely because nothing else does.

### Required

```
to_string(x)                  -> string        # the honest inverse of to_number
```

Named to pair with `to_number` / `to_int`. Total on scalars.

**Round-trip contract:** `to_number(to_string(x))` must recover `x` exactly for
every finite `f64`. That forces shortest-round-trip formatting, which is what
`to_json` already does.

**Integral values print bare:** `to_string(4)` → `"4"`, not `"4.0"`. Confirmed
that `to_json` already does this, including for computed values —
`to_json(8 / 2)` → `"4"`.

**On precision — deliberately *not* asking for a format spec.** Shortest
round-trip is verbose for computed values: `to_json(64 / 3)` →
`"21.333333333333332"`, a 17-digit SVG coordinate. That is correct behavior,
and it is already solvable with the existing `round`:

```mlpl
u:num(round(64 / 3 * 100) / 100)     # "21.33"
```

So `to_string(x, decimals)` would be *convenient*, not necessary. Ship the
one-argument form; a rounding helper belongs in a library, not the language.

### Acceptance

```mlpl
to_string(0)        == "0"
to_string(12)       == "12"
to_string(0 - 3)    == "-3"
to_string(1.5)      == "1.5"
to_string(8 / 2)    == "4"          # integral result prints bare
to_number(to_string(sqrt(2)))       == sqrt(2)      # exact round trip
```

### Deletes here

`u:num` in `lib/render.mlpl`, and its case in `tests/test_render.mlpl` — which
exists *only* to guard an undocumented dependency.

---

## B3 — Strings have no length, no index, no search — **SHIPPED**

All four builtins are live in the current binary and verified by
`probes/text_capabilities.mlpl`. `str_len` counts CHARACTERS, not bytes:
`str_len("héllo")` answers 5 where the string is 6 bytes. `lib/render.mlpl`'s
`u:text_width_px` has dropped its byte-counting bridge accordingly.

One bridge stays load-bearing: `str_find` answers the FIRST index only, so
counting occurrences still needs the rotate-and-mask formulation in
`u:count_substr` (`tests/test_render.mlpl`). The original report follows.

### Original report *(blocking, now closed)*

### Symptom

Every array accessor rejects strings:

```mlpl
size("abcd")          # error: expected an array value, got a string
tally("abcd")         # error: expected an array value, got a string
take("abcd", 0, 1)    # error: expected an array value, got a string
split("abc")          # error: expected an array value, got a string
eq("a", "a")          # error: expected an array value, got a string
```

There is no substring search, no slice, no case operation, no trim.

### Why it blocks

`tests/test_render.mlpl` has to verify that the generated SVG contains the
right number of `<rect>` and `<text>` elements. With no substring count, that
test tokenizes the document to bytes and does array work on it.

It is also the shape of every future text lesson: the semigroup lesson (05 in
`docs/plan.md`) is *string concatenation as an associative operation* — the
canonical example of a semigroup that is not a monoid until you add `""`. That
lesson is currently unwritable in its natural form.

### Current bridge (to be deleted)

`u:count_substr` in `tests/test_render.mlpl`: tokenize to bytes, rotate the
haystack once per needle byte, AND the per-position equalities, mask the
wrap-around. It is a genuinely nice array formulation — and it is 20 lines to
count a substring.

Note the byte/character trap this forces: `size(tokenize_bytes("héllo"))` is
**6**, not 5. There is currently no way to get a character count at all.

### Required

```
str_len(s)                    -> scalar        # CHARACTERS, not bytes
str_slice(s, start, len)      -> string        # character-indexed
str_find(s, needle)           -> scalar        # first index, -1 if absent
str_split(s, separator)       -> string-list
```

`str_len` counting characters is the important half — byte length is already
reachable via `size(tokenize_bytes(s))`, and conflating the two is how text
bugs get shipped. If both are wanted, name them distinctly.

`str_split` pairs with `str_join` from B1 and gives the string-list producer
that B4 needs.

### Acceptance

```mlpl
str_len("abcd")                 == 4
str_len("héllo")                == 5        # characters, not the 6 bytes
str_slice("abcdef", 1, 3)       == "bcd"
str_find("<rect/><rect/>", "<rect")  == 0
str_find("abc", "z")            == 0 - 1
str_split("a,b,c", ",")         == ["a", "b", "c"]
str_split("abc", ",")           == ["abc"]
str_join(str_split(s, ","), ",") == s        # round trip with B1
```

### Deletes here

`u:count_substr` and `u:match_mask` in `tests/test_render.mlpl` (~20 lines →
`str_count` or a `str_find` loop), and unblocks lesson 05.

---

## B4 — String lists cannot be built *(blocking)*

### Symptom

```mlpl
concat(["a"], ["b"])    # error: expected an array value, got a string
concat(["a"], "b")      # error: expected an array value, got a string
```

`string-list` is a first-class value kind with `list_get` and `list_len`, but
it can only arrive as a **literal**, or out of `record_keys`, `parse_json`, or
a tokenizer vocabulary. A program cannot append to one.

### Why it blocks

The natural way to build a document is to accumulate fragments in a list and
join once — `str_join` (B1) is useless without a way to produce the list.
It also means element names cannot be generated: lesson 10 enumerates 19,683
structures (`docs/plan.md`) and every one of them needs labels.

### Required

```
list_append(xs, s)            -> string-list
list_concat(xs, ys)           -> string-list
```

Or, more in keeping with the language's array heritage: make `concat` accept
string lists, since it is already the concatenation builtin and the extension
is unambiguous. That is the smaller change and the better name.

### Acceptance

```mlpl
list_len(list_append(["a"], "b"))       == 2
list_get(list_append(["a"], "b"), 1)    == ok("b")
list_len(list_append([], "a"))          == 1
list_concat(["a"], ["b", "c"])          == ["a", "b", "c"]
```

---

## B5 — A `u:` function cannot take a string list *(blocking, and looks like a bug)*

### Symptom

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

### Why it blocks

Element names are the one thing every renderer needs and none can accept.
Note the error message itself lists `string` as permitted but not
`string-list` — and `string-list` is one of the nine documented value kinds.
Every other kind on that list is accepted. This reads as an oversight in the
argument-domain check rather than a design decision.

### Current bridge

The structure record `{title, names, table}` threaded through
`lib/render.mlpl`. This turned out to be a reasonable design and will probably
survive the fix — but it was **forced, not chosen**, and the next agent should
not have to rediscover why.

### Required

Accept `string-list` in the `u:` function argument domain, alongside the eight
other value kinds. No new builtin.

### Acceptance

```mlpl
def u:f(xs) { list_len(xs) }
u:f(["a", "b", "c"])    == 3
u:f([])                 == 0
```

---

## B6 — Deep recursion aborts the process *(blocking as a robustness defect)*

### Symptom

```mlpl
def u:count(i, acc) { if lt(i, 2000) { u:count(i + 1, acc + 1) } else { acc } }
u:count(0, 0)
```

```
thread 'main' has overflowed its stack
fatal runtime error: stack overflow, aborting
```

Exit code 134. No MLPL-level diagnostic, no function name, no line. 500 frames
is fine; 2000 aborts. The threshold varies with frame size and is not stated
anywhere.

### Why it blocks

This one compounds B1: with no `str_join`, sw-MLPL's answer to "how do I fold?"
is "recurse" — so the language pushes programs toward the exact construct that
crashes it. The first version of the substring counter in
`tests/test_render.mlpl` walked a 2.5 KB SVG one byte per frame and took the
test process down mid-suite. mlplunit surfaced it as
`structured test event stream ended with an active test`, which is a badly
misleading symptom for a stack overflow.

`u:cells_svg` in `lib/render.mlpl` recurses `n²` deep to emit a table — fine at
order 3, and a hard ceiling somewhere before order 24 (`S_4`).

### Required

A recursion-depth cap that raises a normal, catchable MLPL error naming the
function and the limit:

```
error: recursion limit (N frames) exceeded in u:count
```

An abort is never an acceptable response to ordinary user code. Fixing B1's
`str_join` removes the *pressure* to recurse deeply, but not the defect.

### Acceptance

```mlpl
try { u:count(0, 0) } catch e { e.kind }        # a kind, not a dead process
```

The process exits 0 with a caught error rather than 134 with a runtime abort.

---

## Priority

| | Blocker | Cost to fix | Unblocks |
|---|---|---|---|
| 1 | **B1** `str_concat` / `str_join` | small | all text generation; deletes the byte round-trip |
| 2 | **B2** `to_string` | small | all numeric labels; removes a silent-drift dependency |
| 3 | **B5** string-list arguments | trivial — looks like a one-line domain check | every renderer signature |
| 4 | **B4** string-list construction | small | `str_join`'s input; generated labels |
| ~~5~~ | ~~**B3** `str_len` / `str_slice` / `str_find` / `str_split`~~ | **SHIPPED** | adopted; one bridge stays for occurrence counting |
| 6 | **B6** recursion cap instead of abort | medium | robustness; stops crashing on ordinary code |

**Minimum viable set: B1 + B2 + B5.** Those three make `lib/render.mlpl`
ordinary code instead of a workaround, and they are collectively small. B3 has
since shipped as well; B4 alone is what still holds text lessons back. B6 is a
defect, independently.

## Verifying a fix landed

`probes/text_capabilities.mlpl` in this repository executes each acceptance
block above and reports open vs. closed per blocker. It is registered in
`catalog/demos.tsv` and runs under `just demos`, so the day any of this lands
upstream, one command says so:

```sh
just demos
```

It exits `ok` while blockers remain open — this repository must stay green
against the *current* interpreter — and prints the open list. When all six
close, it says so and the bridges listed above get deleted in the same step.

## Documentation drift

Found while verifying the above; worth an upstream fix on its own.

`docs/lang-reference.md` in `../sw-mlpl` shows this in its if/else section:

```mlpl
greeting = if env("USER") { "hello " + name } else { "no user" }
```

That example does not run — `"ab" + "cd"` is `expected an array value, got a
string`. The same file states correctly, 800 lines earlier, that "Strings
cannot be combined with numeric operators." The example contradicts the rule
and suggests concatenation exists.

## Relationship to `docs/upstream-asks.md`

That file is the full record of sw-MLPL friction found in this repository,
including things that are genuinely minor (`ge`/`le` spelling) and things that
are wins worth keeping (`table`, `gather_rows`, `grade_up`). **This file is the
subset that blocks dogfooding**: the text surface, plus the two defects that
compound it. Items in `upstream-asks.md` that are not here — scalar-only
broadcasting, the `svg()` heatmap's missing headings — are real, have honest
workarounds, and can wait.
