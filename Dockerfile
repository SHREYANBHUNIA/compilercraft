FROM rust:1-slim AS rust-builder
WORKDIR /src
COPY rust-compiler ./rust-compiler
WORKDIR /src/rust-compiler
RUN cargo build --release -p craft-api

FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm install -g corepack@latest && corepack pnpm install && corepack pnpm run build
COPY --from=rust-builder /src/rust-compiler/target/release/craft-api ./dist/craft-api
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
