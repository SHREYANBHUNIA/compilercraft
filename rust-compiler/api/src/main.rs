use axum::{extract::State, http::StatusCode, routing::{get, post}, Json, Router}; use craft_compiler::{CompileArtifacts, Compiler}; use serde::{Deserialize, Serialize}; use std::sync::Arc;
#[derive(Clone, Default)] struct ApiState;
#[derive(Debug, Deserialize)] struct CompileRequest { source: String }
#[derive(Debug, Serialize)] struct Health { service: &'static str, status: &'static str }
#[tokio::main] async fn main() { let app = Router::new().route("/health", get(health)).route("/api/compile", post(compile)).with_state(Arc::new(ApiState)); let listener = tokio::net::TcpListener::bind("0.0.0.0:4100").await.expect("bind compiler API"); axum::serve(listener, app).await.expect("serve compiler API"); }
async fn health() -> Json<Health> { Json(Health { service: "craft-compiler", status: "ready" }) }
async fn compile(State(_state): State<Arc<ApiState>>, Json(request): Json<CompileRequest>) -> (StatusCode, Json<CompileArtifacts>) { let artifacts = Compiler::compile(&request.source); let status = if artifacts.diagnostics.iter().any(|diagnostic| diagnostic.is_error()) { StatusCode::UNPROCESSABLE_ENTITY } else { StatusCode::OK }; (status, Json(artifacts)) }

