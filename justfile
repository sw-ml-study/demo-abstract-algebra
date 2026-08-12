set shell := ["sh", "-cu"]

# Show the repository's task recipes.
default:
    @just --list

# Run every registered lesson demo and render its visual artifacts into out/.
demos:
    ./scripts/run-all

# Run all conformance tests, or pass a file/directory/filter through to mlplunit.
tests *args:
    ./scripts/run-tests {{args}}

# Run tests in TAP format, optionally with a file/directory/filter.
tap *args:
    ./scripts/run-tests --format tap {{args}}

# List native tests discovered by mlplunit.
list-tests:
    ./scripts/run-tests --list

# Audit catalogs, lesson doc headers, and generated-tree freshness.
audit:
    ./scripts/validate-catalog catalog/demos.tsv
    ./scripts/validate-catalog catalog/tests.tsv
    ./scripts/check-docstrings
    ./scripts/check-generated
    ./scripts/check-web-size
    ./scripts/check-narration
    ./scripts/check-web-renders

# Regenerate the standalone, paste-ready Web UI entries in web/.
web:
    ./scripts/build-web-demos

# Regenerate the diagrams the README embeds, in assets/.
assets:
    ./scripts/build-assets

# Rebuild every visual artifact under out/ and report what was written.
render:
    ./scripts/render-all

# Run the complete local validation gate.
check: demos tests audit
