# CompilerCraft Rust pipeline

This workspace provides the server-side counterpart to the visual studio. The `compiler` crate carries the source-to-target stages, while the `api` crate exposes their serializable artifacts through Axum.

| Area | Responsibility |
| --- | --- |
| `compiler/src/lexer.rs` | Tokenization with source locations. |
| `compiler/src/parser.rs` and `ast.rs` | Recursive-descent parsing and syntax-tree construction. |
| `compiler/src/semantic.rs` | Scoped symbols, static types, and readable diagnostics. |
| `compiler/src/ir.rs` | Three-address intermediate representation. |
| `compiler/src/optimizer.rs` | Constant folding over IR binary instructions. |
| `compiler/src/codegen.rs` | Craft-32 pseudo-machine instruction selection. |
| `compiler/src/runtime.rs` | Runtime-oriented target description. |
| `api/src/main.rs` | Axum `POST /api/compile` and `GET /health` endpoints. |
| `tests/` | LLVM-style source fixture guidance. |

Run `cargo test --workspace` from this directory to validate the compiler stages. Run `cargo run -p craft-api` to expose the service locally. The Node application starts this process automatically for development compilation requests; deployed builds package the release binary beside the Node server. Set `CRAFT_COMPILER_API_URL` to target a separately hosted Axum service instead.
