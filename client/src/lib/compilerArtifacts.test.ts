import { describe, expect, it } from "vitest";
import { compileSource, explainStage } from "./compilerArtifacts";

const FOLDING_PROGRAM = `fn main() -> i32 {
  let x: i32 = 2 * 10;
  return x;
}`;

describe("compiler artifact model", () => {
  it("exposes a constant-folding before-and-after transform", () => {
    const artifacts = compileSource(FOLDING_PROGRAM);

    expect(artifacts.foldedExpression).toEqual({ before: "2 * 10", after: "20", value: 20 });
    expect(artifacts.irBefore.some(line => line.instruction.includes("mul i32"))).toBe(true);
    expect(artifacts.irAfter.some(line => line.instruction.includes("const i32 20"))).toBe(true);
    expect(artifacts.machine.join("\n")).toContain("mov r0, #20");
  });

  it("creates inspectable lexical and semantic artifacts", () => {
    const artifacts = compileSource(FOLDING_PROGRAM);

    expect(artifacts.tokens.find(token => token.value === "let")?.kind).toBe("keyword");
    expect(artifacts.tokens.find(token => token.value === "i32")?.kind).toBe("type");
    expect(artifacts.symbols).toContainEqual(expect.objectContaining({ name: "x", type: "i32" }));
    expect(explainStage("semantic", artifacts)).toContain("symbol table");
  });

  it("reports an actionable type diagnostic for an invalid typed binding", () => {
    const artifacts = compileSource(`fn main() -> i32 { let x: i32 = "twenty"; return 0; }`);

    expect(artifacts.diagnostics[0]?.level).toBe("error");
    expect(artifacts.diagnostics[0]?.message).toContain("Type mismatch");
  });
});
