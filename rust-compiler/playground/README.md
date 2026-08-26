# Playground integration contract

The browser playground renders source, diagnostics, tokens, AST, symbol data, IR before and after optimization, and target instructions. Its Rust counterpart exposes the same pipeline through the Axum endpoint below.

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/compile` | `{ "source": "fn main() -> i32 { ... }" }` | `CompileArtifacts` containing all stage artifacts and diagnostics. |
| `GET /health` | none | Service readiness metadata. |

The managed web preview stays Node-based, so the Rust service is intentionally launched separately with `cargo run -p craft-api` in a Rust-capable runtime. This separation keeps the API contract explicit while preserving the interactive frontend preview.
