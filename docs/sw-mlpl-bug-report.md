# sw-MLPL defect report

Filed from `demo-abstract-algebra`, which exists partly to be a forcing
function for the language (see `AGENTS.md`, "the second job").

**Binary under test:** `mlpl-repl 0.20.0`, rebuilt 2026-09-08 from `sw-mlpl@f569defa`.
*(Originally filed against the 2026-09-02 build. **BUG 1 and BUG 2 have since
been fixed upstream and re-verified here.** BUG 3 still reproduces.)*
**Reporting tree:** `demo-abstract-algebra` at `a9ee78f`, whose gate was green
when committed on 2026-08-19 against the previous build.

Every claim below was re-run against that binary before it was written down.
Three previously recorded items are **fixed** and are listed as such; three
still reproduce; one is new and is a **regression**.

## How this differs from the other three documents

| Document | Holds |
|---|---|
| **this file** | **defects — things that behave incorrectly** |
| `docs/mlpl-blockers.md` | capabilities that are *absent* and block dogfooding, specified for implementation |
| `docs/upstream-asks.md` | the full friction record, including minor and closed items |
| `docs/sw-mlpl-work-order.md` | the prioritised handoff, with fix sites |

A missing feature is not a bug and is not here.

---

## BUG 1 — An all-unit shape collapses to rank 0 under scalar broadcasting

**FIXED upstream in `sw-mlpl@7b4545f2` ("scalar-broadcast fix"), re-verified
here 2026-09-07.** Every acceptance case below now passes, and the `reshape`
bridge in `lib/algebra.mlpl` has been deleted. Kept on file because the repro
matrix is the regression test this class of bug needs.

*Originally: new, a regression, severity high.*

### Repro

```mlpl
                    # was          is now
shape([0] * 1)      # []   WRONG   [1]        correct
shape([[0]] * 1)    # []   WRONG   [1, 1]     correct
shape([[[0]]] * 1)  # []   WRONG   [1, 1, 1]  correct
```

An array **every one of whose axes has extent 1** loses all of its axes the
moment a scalar is broadcast against it. Rank is not reduced by one; it goes
straight to 0, at any starting rank.

### It is specific to all-unit shapes

Any axis with extent above 1 is preserved correctly, including shapes that
contain unit axes:

```mlpl
shape([[0, 1]] * 1)          # [1, 2]   correct
shape([[0], [1]] * 1)        # [2, 1]   correct
shape([0, 1] * 1)            # [2]      correct
shape([[0, 1], [1, 0]] * 1)  # [2, 2]   correct
```

### It is specific to scalar broadcasting

Every scalar-broadcast binary operation collapses; nothing else does.

| Expression | Result shape | |
|---|---|---|
| `[[0]] * 1` | `[]` | ✗ |
| `[[0]] + 0` | `[]` | ✗ |
| `[[0]] - 0` | `[]` | ✗ |
| `[[5]] / 1` | `[]` | ✗ |
| `eq([[0]], 0)` | `[]` | ✗ |
| `lt([[0]], 1)` | `[]` | ✗ |
| `[[0]] * [[1]]` | `[1, 1]` | ✓ array ⊗ array is fine |
| `eq([[0]], [[0]])` | `[1, 1]` | ✓ |
| `transpose([[0]])` | `[1, 1]` | ✓ |
| `reshape([[0]], [1, 1])` | `[1, 1]` | ✓ |
| `flatten([[0]])` | `[1]` | ✓ |

One further data point that localised it: a `[1, 1]` array against a **rank-1**
operand dropped to rank 1 rather than to rank 0.

```mlpl
shape([[0]] * [1])   # was [1];  is now [1, 1]
```

So the result was not simply losing every unit axis — it lost them *down to the
rank of the other operand*. With a scalar, the other operand has rank 0, and
everything went. The fix corrected both cases together, which is consistent
with the shape computation on the broadcast path being the single cause.

### Expected

Scalar broadcasting preserves the rank and shape of its array operand exactly.
`[[0]] * 1` must have shape `[1, 1]`, as `[[0, 1]] * 1` already correctly has
shape `[1, 2]`. This is what APL, J, BQN and NumPy all do, and it is what this
interpreter does at every other shape.

### Suspected cause

A shape-normalisation or squeeze step on the scalar-broadcast path that drops
unit axes and does not stop. The `* [1]` result above suggests the result shape
is being computed by aligning against the *other* operand's rank rather than by
taking the array operand's shape unchanged.

Note that `docs/upstream-asks.md` #2 reports the same subsystem being too
**narrow** — broadcasting is scalar-only, with no rank extension, so
`eq([[0, 1], [2, 3]], [0, 1])` is a shape mismatch. That still reproduces. One
path is both too restrictive in one direction and wrong in another; a fixer
should probably look at both together.

### Where it bit

`u:invertible_mask` in `lib/algebra.mlpl`, on the **trivial group** — one
element, its own identity and its own inverse. A legal, ordinary algebraic
object, and the base case of essentially every theorem in the subject.

```
u:classify([[0]])
  error: array error: index 1 out of bounds for axis 1 with size 0
```

The mask arrives as a scalar, so `reduce(:or, mask, 1)` has no axis 1.

`tests/test_algebra_laws.mlpl :: trivial and edge-case orders` exists to cover
order 1 and caught this on the first run after the upgrade.

### Why the severity is high

It is a **silent rank change on a legal value**, not an error. The program keeps
running and fails later, somewhere else, with a message that names neither the
operation nor the value responsible — here, an out-of-bounds axis index two
calls downstream. Any array-oriented program that can reach an all-unit shape
at a boundary is exposed: a one-element set, a single sample, a batch of one, a
1 x 1 minor, the last slice of a reduction.

### Workaround, now removed

A `reshape` back to the promised rank stood at the fix site in
`lib/algebra.mlpl` from 2026-09-07 until the fix landed the same day. It is
**deleted**; `u:invertible_mask` reduces `u:inverse_mask(t)` directly again.

### Acceptance

```mlpl
shape([0] * 1)        # [1]
shape([[0]] * 1)      # [1, 1]
shape([[[0]]] * 1)    # [1, 1, 1]
shape(eq([[0]], 0))   # [1, 1]
```

and `u:classify([[0]])` answers the trivial group's classification rather than
an array error. **All five confirmed passing on 2026-09-07**, with the bridge
removed.

---

## BUG 2 — `run_script` returns a string result's rendering, not the string

**FIXED upstream in `f569defa`, re-verified here 2026-09-08.** A new
`value_raw` field carries the child's actual value: `type_of(r.value_raw)` is
`string` and it begins `<svg ` with no leading quote byte. `value` is unchanged
and still the lossy rendering, so nothing that read it breaks — callers opt in.

*Originally: recorded as `docs/upstream-asks.md` #10, severity medium.*

```mlpl
r = unwrap(run_script("web/magma_rps.mlpl", {source_dir: "."}))
type_of(r.value)              # "string"
str_slice(r.value, 0, 6)      # "\"<svg "   -- leading quote byte
```

`type_of` says `string`, and the value is the quoted, escaped *rendering* of
one. A caller cannot use a returned string without unescaping it by hand, and
in general cannot recover it at all. Records and Results round-trip fine, so
strings are the outlier.

**The same root cause reaches a second boundary.** In the WASM session,
`to_json` answers a Result and `WasmSession.eval` hands back that value's
display form, so JSON arrives wrapped:

```
to_json({pass: 1})   ->   Ok({"pass":1})
```

Both are "the caller received a rendering where the value was meant". That
suggests the defect is in how results are handed across a boundary rather than
in either boundary individually. Recorded from the browser side as
`docs/upstream-asks.md` #20.

---

## BUG 3 — Deep recursion aborts the process instead of erroring

**Still reproduces.** Recorded as `docs/mlpl-blockers.md` B6. Severity: medium
as a robustness defect.

```mlpl
def u:c(i, a) {
  "count"
  if lt(i, 4000) { u:c(i + 1, a + 1) } else { a }
}
u:c(0, 0)
```

```
thread 'main' has overflowed its stack
fatal runtime error: stack overflow, aborting
```

Exit code **134**. No MLPL-level diagnostic, no function name, no line, no
recoverable error. 500 frames is fine; 4000 aborts; the threshold varies with
frame size and is documented nowhere.

This matters more now than when it was filed. The browser course
(`docs/tutorial-plan.md`) runs learner-written MLPL in a WASM session, and a
learner writing an accidental infinite recursion is not an edge case — it is a
Tuesday. In the CLI this kills a script; in the browser it takes down the
session the whole page depends on, with no way to catch it and no message to
show. A depth limit that raises an ordinary MLPL error would fix both.

---

## Re-verified: previously recorded items

Checked against 0.20.0, because the recorded ones were written against an older
build and `AGENTS.md` requires claims be verified against the interpreter.

| Item | Recorded as | Status now |
|---|---|---|
| all-unit shape collapse | *(new)* | **FIXED** in `7b4545f2`, bridge deleted |
| `run_script` string rendering | ask #10 | **FIXED** in `f569defa` (`value_raw`) |
| deep recursion aborts | blocker B6 | **reproduces** |
| string lists cannot be built | blocker B4 | **reproduces** — see below |
| broadcasting is scalar-only | ask #2 | reproduces *(a limitation, not a bug)* |
| no `ge` / `le` builtins | ask #1 | **FIXED** — both exist and answer correctly |
| no string concatenation | blocker B1 | **FIXED**, adopted |
| no number → string | blocker B2 | **FIXED**, adopted |
| `lang-reference.md` shows `"hello " + name` | doc drift | **FIXED** — the example is gone |

**B4 is still open, and nearly wasn't reported as such.** `str_join(["a", "b"],
",")` succeeds, which looks like a fix — but that is a *literal* list, which B4
always allowed. The actual claim still fails at every spelling:

```mlpl
concat(["a"], ["b"])       # error: expected an array value, got a string
list_append(["a"], "b")    # error: undefined
list_concat(["a"], ["b"])  # error: undefined
```

Recorded because it is an easy false positive for the next person who checks.

---

## Suggested order

1. ~~**BUG 1.**~~ **Done** — fixed in `7b4545f2` and verified here the same day.
2. **BUG 3.** Cheap (a depth counter), and it becomes user-facing the moment
   anyone runs learner-written MLPL in a browser. Still reproduces: exit 134,
   no diagnostic.
3. ~~**BUG 2.**~~ **Done** — fixed in `f569defa` via a `value_raw` field.
   Its browser half (ask #20, `eval_with_values` unexported) is still open, and
   `learn/runtime.js` still unwraps `Ok(...)` at the grading boundary.
