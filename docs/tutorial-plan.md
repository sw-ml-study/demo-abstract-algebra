# The course: a live, in-browser MLPL tutorial

*The plan for acting on `docs/research3.txt`. It supersedes that brief's
open questions with decisions, and it supersedes the "browser course" framing
of saga step 004.*

`docs/plan.md` remains the authority on **which algebra ships and in what
order**. This document is the authority on **how a learner meets it**.

---

## 1. What is being built, in one paragraph

A tutorial site where the learner reads two sentences, edits **sw-MLPL source**
in a box, presses Run, and has the **real sw-MLPL interpreter** — the same one
in `lib/algebra.mlpl`'s tests, compiled to WebAssembly — execute it in their
browser, render the resulting Cayley table, and grade it **semantically** with a
checker that is itself written in MLPL. SQLZoo teaches SQL by making you write
SQL; this teaches abstract algebra by making you write MLPL. Nothing the learner
types is interpreted by JavaScript, and nothing they are graded on is decided by
JavaScript.

That last sentence is the whole architectural commitment. Everything in §3
exists to keep it true.

---

## 2. Three ideas, kept separate

`docs/research3.txt` ends by naming three orthogonal models. Restating them as
this repository's rules:

| Model | Answers | Applied here |
|---|---|---|
| **Diátaxis** | *What kind of information does this person need?* | Four doors: Tutorial / How-to / Reference / Explanation. §6 |
| **SQLZoo** | *How should a tutorial teach through interaction?* | `explain → predict → edit MLPL → run → inspect → grade → retry`. §4 |
| **sw-MLPL** | *What can the learner actually manipulate?* | An executable, visual, mutable `n x n` array. §3, §5 |

The Lab (`viewer/cayley.html`) is deliberately **not** a Diátaxis quadrant. It
is a tool linked from all four.

---

## 3. The runtime — the decision everything else rests on

The learner writes MLPL. Therefore the page needs an MLPL interpreter. Three
findings from reading the sibling repositories:

1. **The interpreter already compiles to WASM and already exposes what we
   need.** `sw-mlpl/components/wasm/crates/mlpl-wasm` is a plain `cdylib`
   exporting `eval_line(src) -> String` and a `WasmSession` class with
   `new()`, `eval(src) -> String` and `clear()`. A persistent session is
   exactly the right shape: preload `lib/algebra.mlpl`, then eval the
   learner's code, then eval the checker, all in one environment.

2. **The published bundle is not that crate — it is the whole playground
   app.** `mlpl-live/mlpl-web-*.wasm` (8.0 MB) is the Yew/Trunk playground,
   which re-exports those bindings but mounts a UI on `init()`. Confirmed by
   running its glue under Node: `init()` throws `Can't find the global
   Window` before any `eval` is reachable. It cannot be loaded as a library.

3. **`eval()` returns a formatted display string, not a value.** There is a
   richer `eval_with_values` on the Rust side returning `{display, values,
   shape}`, but it carries no `#[wasm_bindgen]` and is absent from the
   published JS glue. So the JS boundary is strings, both ways.

### 3.1 The decision

Build every page against one small JavaScript interface, and give it two
implementations:

```js
// learn/runtime.js -- the ONLY file that knows how MLPL is reached.
export interface MlplRuntime {
  ready(): Promise<void>
  eval(src: string): string     // display text, or "error: ..."
  reset(): void
}
```

**Implementation A — the bridge, available today, zero upstream work.**
Serve the playground bundle from our own origin and load it in a *hidden*
`<iframe>`. `mlpl-live/index.html:13` does `window.wasmBindings = bindings`, so
a same-origin parent can reach `iframe.contentWindow.wasmBindings.WasmSession`
and drive the interpreter directly while the playground's own UI stays hidden.
Costs: an 8 MB download and a mounted app we never look at.

**Implementation B — the target, one upstream build away.**
`wasm-pack build components/wasm/crates/mlpl-wasm --target web` produces a
mountless module exporting `WasmSession` and nothing else. No iframe, no hidden
app, and a fraction of the bytes. This crate **already exists and already
compiles**; it is simply never built or published on its own.

Implementation A is a **temporary bridge** in this repository's established
sense: it is named in `docs/mlpl-blockers.md`, and the step that adopts B
deletes it. See §9.

### 3.2 The spike — run, and passed

Saga A step 1 existed to prove or kill the bridge in a browser before a single
lesson was written. It is `learn/spike/runtime-spike.html`, served by
`scripts/serve-spike`, and it **passes all seven cases in Chrome**:

| # | Case | Result |
|---|---|---|
| 1 | the parent page reaches `WasmSession` through the hidden iframe | bindings available in ~100 ms |
| 2 | a `def` with a docstring, then a call | `u:f(2, 2)` → `1` |
| 3 | the session persists across `eval`s; `table()` builds a Cayley table | `0 1 2 / 1 2 0 / 2 0 1` |
| 4 | `to_json` round-trips a grader record | parsed after unwrapping `Ok(...)` |
| 5 | **all 810 lines of `lib/algebra.mlpl` load as source and classify** | `{group: 1, abelian_group: 1, …}` |
| 6 | an MLPL checker grades a good and a bad submission | witness `{a: 1, b: 2}` — `1 + 2 = 3` escapes |
| 7 | a syntax error is returned, not thrown; `clear()` drops the environment | `error: unexpected token …` |

Case 5 is the one that matters. The library that every lesson and every test in
this repository already depends on runs unmodified in the browser, against a
table the learner built, and answers with the same classification the CLI gives.
There is no second implementation to keep honest.

Case 6 is the grading contract of §4.1, proven end to end — and it found a real
bug in its own checker on the way: `div(i, n)` is float division, so the first
witness came back as index `1.667`. The house idiom is `floor(i / n)`, which
`lib/algebra.mlpl` uses in eleven places. Corrected, the witness is `1 * 2 = 3`,
which is exactly the counterexample the README's closure lesson prints.

Two findings crossed the boundary as asks rather than blockers: `to_json`
answers a **Result**, so its display form arrives wrapped as `Ok({...})` and the
page unwraps it (**ask #20**, the same root cause as #10 met at a second
boundary); and the browser session has no `include`, so the library is fetched
and re-evaluated after every reset (**ask #21**).

The bridge is confirmed, and so is its cost: 8 MB and a mounted application
nobody looks at, before the first exercise. **B7 is the fix**, and
`learn/runtime.js` exists so that adopting it is a one-file swap.

---

## 4. The interaction loop

Six step kinds. Every exercise declares exactly one, and the kind decides what
the page renders.

| Kind | The learner does | Graded on |
|---|---|---|
| **Observe** | presses Run on given code | nothing; advancing is the answer |
| **Predict** | picks a cell's value *before* running | the choice, then the table is revealed |
| **Modify** | repairs supplied MLPL | the property the repair was for |
| **Discover** | supplies a witness (`a`, `b`, `c`) | the witness genuinely failing |
| **Generalize** | rewrites one case as a whole-array check | agreement with the reference over all `n^k` |
| **Challenge** | gets a goal, not instructions | the classifier's verdict |

Predict-before-run is the step SQLZoo cannot do and this repository can, because
the answer is a picture. It is cheap and it is the highest-value kind: it forces
a mental model to exist before it can be corrected.

**A lesson is a sequence of these, never a single one.** The rule of thumb from
the brief holds: one finished `.mlpl` lesson explodes into 4–8 interactions.

### 4.1 Grading is MLPL, and is unit-tested

New `lib/grade.mlpl`. Every checker returns the **same record shape**, and every
failure names a witness rather than returning `0`:

```mlpl
{ pass: 0, why: "not closed", witness: {a: 1, b: 2, value: 3} }
```

The page evaluates `to_json(u:grade_closed(t))` in the session and parses the
result. Planned checkers:

| Checker | Passes when |
|---|---|
| `u:grade_closed(t)` | every entry names a real element |
| `u:grade_rung(t, "group")` | the classifier reaches exactly that rung |
| `u:grade_equals(got, want)` | arrays agree; witness is the first differing index |
| `u:grade_witness(t, a, b, c)` | the learner's triple really does disagree |
| `u:grade_shape(v, want)` | rank and shape match |
| `u:grade_iso(s, u)` | some relabelling carries one table to the other |

This is not a second implementation of anything. `viewer/cayley.html` had to
reimplement the laws in JavaScript and pin itself with
`tests/test_viewer_conformance.mlpl`; **the course does not, because it runs the
real interpreter.** The graders get ordinary MLPL unit tests in
`tests/test_grade.mlpl` — each asserted against a known-good and a known-bad
submission — so the site cannot rot without `just check` going red.

That also generalises the brief's best single suggestion: *a law result is
`Holds` or `Counterexample(...)`, never a Boolean.*

---

## 5. Animation policy — where it adds value, and where it does not

Two rules, stated so a later session does not have to guess.

> **Animate a process, never a pattern.** If the thing to notice is present all
> at once — a Latin square, the identity cross, the escape triangle, the
> agreement cube — it is a static picture with rings, and animating it only
> makes it harder to read. If the thing to notice happens *in an order* — a
> walk, a generation, a collapse, a relabelling, a motion — it animates.

> **An animation is an answer, not a decoration.** It plays after the learner
> commits, as the explanation of what they just got right or wrong. It never
> plays on the prompt, where it would give the answer away and where nobody is
> reading it yet.

Mechanically: SMIL inside the SVG, generated by `lib/render.mlpl`, which is
already how `assets/rps-associativity.svg` and `assets/rpsls-frames.svg` work.
Text in, text out; no encoder, no GIF, no new capability.

### 5.1 What animates, across the complete syllabus

| Concept | The animation | The process it shows |
|---|---|---|
| Associativity fails | two markers walk the two bracketings *(exists)* | a path |
| Element order, cyclic subgroups | `g, g², g³, …` lighting in turn until it closes | a generation |
| Cosets, Lagrange | the table permuting into congruent blocks | a rearrangement |
| Quotient groups | the blocks collapsing into one smaller table | a collapse |
| Isomorphism | one table relabelling into the other, cell by cell | a relabelling |
| Homomorphisms | two routes converging on one cell | a path |
| Cayley's theorem | each row lifting out of the table as a permutation | a lift |
| Dihedral groups | the polygon actually rotating and reflecting | a motion |
| Orbits and stabilizers | a point walking its orbit under repeated action | a walk |
| Generators and relations | a presentation expanding into a full table | a growth |
| Characteristic | `1+1+1…` traced until it reaches zero | a repetition |

### 5.2 What deliberately stays still

The Latin square, the identity cross, the closure escape, the associativity
cube, the commutativity fold, the enumeration bar chart, and the structure
lattice. Each is a shape that is *simultaneously* true; motion would subtract.

The one standing exception is `assets/rpsls-frames.svg`, which shows a pattern
serially — and earns it, because the sliding hook *is* the five-fold symmetry.
It is the test of the rule, not a violation of it.

---

## 6. Diátaxis: where everything lives

```
                    demo-abstract-algebra

     LEARNING              SOLVING            UNDERSTANDING
        |                     |                     |
    learn/                howto/             explanation/
   the course           task recipes          concepts, why
   (this plan)                |                     |
        +--------------------- + --------------------+
                              |
                         reference/
                    definitions, the algebra API

                     viewer/cayley.html
                   the Lab -- linked from all four
```

- **`learn/`** — the course. New. The live demo.
- **`explanation/`** — where most of today's README prose goes. It is good
  prose serving the wrong user need in the wrong place: *why groups produce
  Latin squares*, *Z₄ versus the Klein four-group*, *why associativity matters
  computationally*. Moving it out is what finally lets it go deeper, because it
  can no longer derail a learning path.
- **`howto/`** — the underdeveloped quadrant, and a real gap. *How to test an
  operation for closure. How to find an identity. How to decide whether two
  structures are isomorphic. How to add a lesson.* Same functions as the
  tutorial; opposite obligation.
- **`reference/`** — boring on purpose. Signatures, shapes, return values,
  edge cases, the rung definitions. Findable in twenty seconds, then left.
- **`viewer/cayley.html`** — promoted from a leaf to the Lab, and given two
  links: *open this table in the course editor*, and *send the course's current
  table here*. It keeps its dependency-free, no-build, single-file rule.

The **"why ML people should care"** notes the brief proposed are explanation,
not tutorial. They live in `explanation/`, reached from a one-line link under
the exercise. They never interrupt it.

**The README shrinks to four doors plus developer information.** It is
currently doing ten jobs because none of these destinations existed.

---

## 7. Lesson source: MLPL records, generated to JSON

Do not hand-write forty HTML pages, and do not invent a YAML lesson DSL. Lessons
are **MLPL record literals** — dogfooding the language on its own courseware —
and `scripts/build-learn` runs them to emit `learn/lessons.json`, exactly as
`scripts/build-assets` and `scripts/build-web-demos` already work.
`scripts/check-generated` then keeps the tree from drifting.

```mlpl
{
  id: "closure-02",
  title: "Keep the answers inside",
  kind: "modify",
  prompt: "Every result must name an element of {0, 1, 2}. Repair it.",
  starter: "def u:op(x, y) {\n  \"The operation.\"\n  x + y\n}",
  check: "u:grade_closed(table(:u:op, range(3), range(3)))",
  visual: "cayley",
  animate: "none",
  hints: ["Two cells escape. Which two?", "Shrink the result, do not grow the set."],
  solution: "mod(x + y, 3)",
  concept: "closure",              # -> explanation/closure
  reference: "u:is_closed",        # -> reference/algebra#is_closed
  howto: "test-closure"            # -> howto/test-closure
}
```

Note what the record does **not** contain: prose explaining closure. Per the
brief's own correction, the lesson *links* to explanation rather than embedding
it, which is what stops the tutorial engine from quietly becoming a second
documentation system.

One source, four presentations. The executable truth stays in `lib/`.

---

## 8. Coverage: the complete set

Every lesson in `docs/plan.md` becomes a course module of 4–8 interactions. The
mapping is mechanical, which is what makes the later sagas cheap:

| Stage | `docs/plan.md` | Course modules | Status of the algebra |
|---|---|---|---|
| 1 — one operation | 00–13 | Operations, Closure, RPS, Associativity, Semigroups, Identity, Monoids, Inverses, Groups, Commutativity, Enumeration, Quasigroups, Isomorphism, Homomorphisms | **shipped** |
| 2 — inside a group | 14–18 | Subgroups, Order, Cosets, Lagrange, Normal, Quotient, Kernel & image | 14–15 shipped; 16–18 in the active saga |
| 3 — groups acting | 19–24 | Permutations, Cayley's theorem, Dihedral, Actions, Orbits, Burnside | not started |
| 4 — building new | 25–29 | Products, Order 4, Order 6, Through order 8, Presentations | not started |
| 5 — two operations | 30–35 | Rings, Zero divisors, Fields, `F₄`, Characteristic, Ideals | not started |
| 6 — universal algebra | 36–40 | Signatures, Laws as data, Varieties, Free algebras, The bridge | not started |

**The course does not wait for the algebra.** Stage 1 is finished material
sitting on disk; it is enough for a genuinely complete introductory course
(Sagas B and D), and later stages convert as they ship.

One reordering, taken from the brief and worth honouring: **closure comes before
the word "magma."** *Does every pair produce a member of the set?* is
answerable before any terminology exists. Operation first, name second — which
is also the repository's existing rule that nothing declares what a structure
is.

---

## 9. Upstream: what this asks of sw-MLPL

Recorded here in the plan; written up properly in the step that opens each.

**Blocker B7 — no headless WASM build is published.** `mlpl-wasm` compiles to a
mountless `cdylib` exporting `WasmSession`, but the only published artifact is
the full playground app, which requires a `Window` and mounts a UI. Required: a
versioned `--target web` build of that crate alone, published beside the
playground. Acceptance: `init()` succeeds under Node with no DOM, and
`new WasmSession().eval("1 + 1")` returns `2`. Deletes here: the hidden-iframe
bridge in `learn/runtime.js`, entire.

**Ask #20 — `eval_with_values` is not exposed to JS.** It exists in Rust and
returns `{display, values, shape}`. Without it, a table crosses the boundary as
formatted text or as `to_json`. Not blocking — `to_json` is an honest
workaround — but it would remove a parse from every single Run.

**Ask #21 — no way to preload a source file into a session.** Each session must
re-`eval` the whole of `lib/algebra.mlpl` as a string. It works; it is
re-parsed per reset.

---

## 10. Deployment

- **GitHub Pages**, from a new `.github/workflows/pages.yml`. This repository
  has no `.github/` today; the workflow is part of Saga A.
- **The WASM bundle is never committed.** The workflow fetches it from
  `sw-ml-study/mlpl-live` at a pinned commit (recorded in that repo's
  `build-info.json`) and serves it from our own origin — which is also what
  makes the iframe bridge same-origin and therefore possible at all. Locally,
  `just serve` symlinks `../mlpl-live`. An 8 MB binary does not enter git
  history.
- **`viewer/cayley.html` keeps its no-build, no-dependency rule.** The course is
  a different artifact with a different contract, and the exception is scoped to
  it deliberately rather than by drift.
- Not an Artifact on claude.ai: its CSP allows scripts only from a fixed CDN
  allowlist, and an 8 MB WASM payload has nowhere to come from. The live demo is
  a Pages site.

---

## 11. The sagas

Sequenced. Sagas A and B are the ones to commit to; C through G are shaped, not
finalised, and the brief's advice is explicitly to **stop after B and evaluate**.

### First: re-scope the active saga

`stage-2-inside-a-group` is at step 004, `web-course-progression`, in progress:
*"expose Stage 1 as a browser course… one law per file… demote RPSLS to an
explore node."* That step is three more paste-into-the-playground `.mlpl` files.
This plan is a better answer to the same question, and shipping 004 as written
produces work that Saga A obsoletes in a fortnight.

**Recommendation: re-scope 004 to land this document and run the runtime
spike**, then let steps 005 and 006 finish Stage 2's algebra as planned. The
course needs that algebra either way, and the sagas below start from a proven
runtime instead of a hoped-for one.

---

### Saga A — `learn-runtime`
*The engine. No algebra content, no lessons. Ends with one exercise working
end to end.*

| # | Step | Done when |
|---|---|---|
| 1 | `runtime-spike` — **DONE.** Proved in Chrome that a hidden same-origin iframe of the playground bundle yields a working `WasmSession` to the parent. See §3.2. | `learn/spike/runtime-spike.html`, 7/7. B7, ask #20 and ask #21 written up. |
| 2 | `runtime-interface` — `learn/runtime.js`: the `MlplRuntime` interface, the iframe implementation behind it, session reset, error surfacing. Open blocker B7 in `docs/mlpl-blockers.md` naming this file as the bridge to delete. | `runtime.eval("1 + 1")` returns `2` from a page; B7 written with acceptance tests. |
| 3 | `grade-library` — `lib/grade.mlpl` with the six checkers of §4.1, all returning `{pass, why, witness}`. `tests/test_grade.mlpl` asserts each against a good and a bad submission. Docstrings on every function. | `just tests` green; every checker has both cases. |
| 4 | `lesson-format` — the record schema of §7, `scripts/build-learn`, `learn/lessons.json` emitted from MLPL, wired into `scripts/check-generated`. | A stale `learn/lessons.json` fails `just audit`. |
| 5 | `lesson-runner` — the page: prompt, editor, Run, result, Cayley render, grade, hints, next. Textbook margin and REPL, per the brief's UI sketch. No dashboards, no badges, no progress rings. | One `modify` exercise is completable start to finish. |
| 6 | `pages-deploy` — `.github/workflows/pages.yml`, the pinned bundle fetch, `just serve`, `.gitignore` for the vendored WASM. | The single exercise is live at a public URL. |

### Saga B — `learn-first-path`
*The brief's explicit first milestone: about twelve interactions, then stop and
judge.*

| # | Step | Content |
|---|---|---|
| 1 | `module-operations` | 0.1 run an operation · 0.2 apply it to every pair with `table` · 0.3 read the table. Teaches the interaction model, not algebra. |
| 2 | `module-closure` | 1.1 watch addition escape `{0,1,2}` · 1.2 predict which cells escape · 1.3 repair it · 1.4 *now* the word "magma". |
| 3 | `module-rps` | 2.1 complete `beats` · 2.2 build the table · 2.3 predict rock × scissors · 2.4 ask the classifier. |
| 4 | `module-associativity` | 3.1 pick what associativity claims · 3.2 **find** a counterexample triple · 3.3 watch the two markers walk it — the first animation, and it is an answer · 3.4 generalize to all 27 triples, then the cube. |
| 5 | `evaluate` | Walk the whole path cold. Write down what is tedious, what is condescending, and what actually taught something. **Decide whether to continue.** No new features. |

### Saga C — `diataxis-split`
*Only after B is judged good.* Create `explanation/`, `howto/`, `reference/`;
move the README's prose into `explanation/`; write the how-to recipes that do
not exist yet; shrink the README to four doors; promote `viewer/cayley.html` to
the Lab with links both ways to the course. Ends with `check-docs` green over a
tree that is four times as large.

### Saga D — `learn-stage-1`
The remaining Stage 1 modules — semigroups, identity, monoids, inverses,
groups, commutativity, enumeration, quasigroups, isomorphism, homomorphisms —
at roughly two modules per step. Adds the isomorphism relabelling animation.
Ends with a complete introductory course from "what is an operation" to
"structure-preserving maps".

### Saga E — `learn-earn-the-next-law`
The Challenge mode, and the strongest idea in the brief: the structure lattice
becomes **navigation**. Clicking an edge means *earn this law* — start from a
magma, change as few cells as possible to reach a semigroup, then a monoid, then
a group. The lattice in `assets/structure-lattice.svg` is already checked
against real tables rather than drawn, so it can carry real transitions.

### Saga F — `learn-stage-2`
Subgroups, order, cosets, Lagrange, normal subgroups, quotients, kernel and
image. **The most visual material in the subject**, and where the animation
policy pays: generation, block permutation, and collapse are all processes.
Requires steps 005–006 of the active saga to have shipped.

### Saga G — `learn-stages-3-to-6`
Actions, products, classification, rings and fields, universal algebra. Converts
as `docs/plan.md` ships each lesson. Not planned in detail here; by this point
the per-module recipe is mechanical and the honest unit of planning is one
saga per stage.

---

## 12. What would make this plan wrong

- ~~**If the iframe bridge does not work in a browser and B7 does not land**,
  there is no live demo.~~ **Settled.** The spike passed 7/7; see §3.2. B7
  remains worth fixing for the 8 MB, not for feasibility.
- **If 8 MB is too much to download before the first exercise**, the course
  needs a static first module that teaches without the interpreter, and the
  runtime loads in the background. Survivable; measure it in Saga A step 6.
- **If lesson records in MLPL are more painful to author than JSON**, that is a
  dogfooding finding worth having, and it belongs in `docs/upstream-asks.md`.
  It does not justify abandoning MLPL as the *learner's* language, which is the
  point of the whole exercise.
- **If the evaluation in Saga B step 5 says the guided path is boring**, the
  Lab and Challenge modes (Saga E) may be the real product and the linear
  course the supporting act. That is a legitimate outcome, and it is why the
  brief says to stop and look after twelve interactions.
