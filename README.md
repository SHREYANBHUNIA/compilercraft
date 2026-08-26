# CompilerCraft

CompilerCraft is an editorial visual compiler-construction studio. Its React interface makes tokens, AST structure, static types, IR, constant folding, machine instructions, and diagnostics inspectable, while a Rust/Axum service provides live compilation artifacts.

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Studio | React, TypeScript, D3 | Editable playground and stage visualizations. |
| Application bridge | Express, tRPC | Same-origin API that invokes the compiler service. |
| Compiler | Rust | Lexer, parser, AST, semantic analysis, IR, optimizer, code generator, runtime. |
| Compiler API | Axum | Live `POST /api/compile` artifact and diagnostic responses. |

## Local development

Install Node dependencies with `pnpm install`, then run `pnpm dev`. The first live **Compile** request starts the Rust Axum process from `rust-compiler/` automatically. You can validate both codebases with:

```bash
pnpm check && pnpm test
cd rust-compiler && cargo test --workspace
```

## Deploying from GitHub

This application **cannot run on GitHub Pages**, because it requires a Node server and a Rust Axum compiler service. The repository includes a multi-stage `Dockerfile` that compiles the Rust binary and runs it alongside the Node application in one container.

For a GitHub-connected deployment, create a service on a Docker-capable host such as Render, Railway, Fly.io, Google Cloud Run, or a similar provider. Select this repository, choose the root `Dockerfile`, configure the provider’s required application secrets, and deploy. The provider should route traffic to the container’s `PORT`; do not configure a static site deployment.

After publication, enable repository checks from the GitHub Actions interface or add a workflow using an account token with `workflow` permission. The validation commands are `pnpm check`, `pnpm test`, `pnpm build`, and `cd rust-compiler && cargo test --workspace`.

## Optional external compiler service

The default Docker image runs the Axum binary locally. If the compiler API is hosted separately, set the server-only `CRAFT_COMPILER_API_URL` environment variable to its base URL, such as `https://compiler.example.com`. The bridge then sends live source to that endpoint instead.
