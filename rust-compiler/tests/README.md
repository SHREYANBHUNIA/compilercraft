# LLVM-style compiler fixtures

The `lit.cfg.py` configuration reserves a familiar compiler-test layout: source fixtures carry `RUN:` commands and expected output is asserted through `FileCheck` directives. The included constant-folding fixture documents the expected optimized value for `2 * 10`.

Use `cargo test --workspace` for executable Rust unit and integration tests. To exercise fixture tests in a full LLVM tooling environment, install `lit` and `FileCheck`, then run `llvm-lit tests` from `rust-compiler/` after wiring the CLI adapter used by `%craftc`.
