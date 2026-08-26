import { afterEach, describe, expect, it, vi } from "vitest";
import { requestLiveCompilation } from "./compilerApi";

const apiResponse = {
  tokens: [], ast: null, semantic: null, ir_before: null, ir_after: null, machine: null, diagnostics: [],
};

describe("Rust compiler API bridge", () => {
  afterEach(() => {
    delete process.env.CRAFT_COMPILER_API_URL;
    vi.unstubAllGlobals();
  });

  it("posts source to a configured Axum API endpoint", async () => {
    process.env.CRAFT_COMPILER_API_URL = "https://compiler.example.test/";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(apiResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestLiveCompilation("fn main() -> i32 { return 0; }")).resolves.toEqual(apiResponse);
    expect(fetchMock).toHaveBeenCalledWith("https://compiler.example.test/api/compile", expect.objectContaining({ method: "POST" }));
  });
});
