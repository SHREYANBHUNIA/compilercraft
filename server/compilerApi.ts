import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type AxumCompileArtifacts = {
  tokens: Array<{ kind: string; lexeme: string; line: number; column: number }>;
  ast: unknown | null;
  semantic: {
    symbols: Array<{ name: string; type_name: string; scope: string; role: string }>;
    diagnostics: Array<{ severity: string; message: string; line: number; column: number; note?: string | null }>;
  } | null;
  ir_before: { functions: Array<{ name: string; instructions: unknown[] }> } | null;
  ir_after: { functions: Array<{ name: string; instructions: unknown[] }> } | null;
  machine: { target: string; instructions: string[] } | null;
  diagnostics: Array<{ severity: string; message: string; line: number; column: number; note?: string | null }>;
};

let compilerStarting: Promise<string> | null = null;

function configuredBaseUrl() {
  return process.env.CRAFT_COMPILER_API_URL?.replace(/\/$/, "") ?? "";
}

async function waitForCompiler(baseUrl: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return baseUrl;
    } catch {
      // The Rust process is still starting; retry below.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("The Rust compiler API did not become ready within 30 seconds.");
}

async function compilerBaseUrl() {
  const externalUrl = configuredBaseUrl();
  if (externalUrl) return externalUrl;

  if (!compilerStarting) {
    compilerStarting = (async () => {
      const baseUrl = "http://127.0.0.1:4100";
      const binaryPath = resolve(process.cwd(), "dist", "craft-api");
      const isProduction = process.env.NODE_ENV === "production";
      const command = isProduction && existsSync(binaryPath) ? binaryPath : "cargo";
      const args = command === "cargo" ? ["run", "--quiet", "-p", "craft-api"] : [];
      const cwd = command === "cargo" ? resolve(process.cwd(), "rust-compiler") : process.cwd();

      const child = spawn(command, args, { cwd, stdio: ["ignore", "ignore", "pipe"] });
      child.once("error", error => {
        console.error("[Compiler API] Failed to start Rust compiler:", error.message);
      });
      child.stderr.on("data", chunk => {
        console.error("[Compiler API]", String(chunk).trim());
      });
      return waitForCompiler(baseUrl);
    })().catch(error => {
      compilerStarting = null;
      throw error;
    });
  }

  return compilerStarting;
}

export async function requestLiveCompilation(source: string): Promise<AxumCompileArtifacts> {
  const baseUrl = await compilerBaseUrl();
  const response = await fetch(`${baseUrl}/api/compile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source }),
  });

  const payload = await response.json() as AxumCompileArtifacts;
  if (!response.ok && response.status !== 422) {
    throw new Error("The Rust compiler API could not complete the request.");
  }
  return payload;
}
