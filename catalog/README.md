# Lesson catalog

The catalogs are machine-readable inventories consumed by the runners, with no
package manager and no third-party parser — tab-separated, one row per script.

- `demos.tsv` lists the lessons: self-checking mini-apps that teach one concept
  and produce a visual.
- `tests.tsv` lists `test_*.mlpl` conformance scripts, executed through
  mlplunit in isolated interpreter processes.

Both use the same columns.

| Column | Contract |
|---|---|
| `id` | Stable lowercase identifier using letters, digits, `_`, or `-` |
| `path` | Repository-relative `.mlpl` path under the matching `demos/` or `tests/` tree |
| `lesson` | Lesson directory the row belongs to (`01-magmas`, or `lib` for library tests) |
| `concept` | The algebraic concept demonstrated |
| `explicit_loops` | Non-negative integer: explicit loops in the current script |
| `target_loops` | Non-negative integer: loops remaining after planned language features |
| `visual` | Comma-separated subset of `none`, `ascii`, `svg`, `page` |
| `required_features` | Comma-separated feature IDs, or `current` |
| `status` | `runnable`, `constrained`, or `gated` |

`runnable` and `constrained` rows must name an existing script. A `gated` row
may name its planned location before the script exists, which is how the
twelve-lesson sequence in `docs/plan.md` is queued here ahead of implementation.

The validator rejects duplicate ids and paths, cross-tree paths, malformed
values, missing files for non-gated rows, and a target loop count larger than
the current count.

## On the loop columns

`explicit_loops` is `0` for every lesson so far, and that is the point rather
than an accident: a law over `M^3` is an array predicate, not a triple-nested
iteration. A row that needs a loop must explain it in the script's header
comment and name the combinator that would remove it.
