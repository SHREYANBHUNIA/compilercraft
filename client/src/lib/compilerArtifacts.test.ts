import { describe, expect, it } from "vitest";
import { compileSource, explainStage, fromLiveArtifacts } from "./compilerArtifacts";

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

  it("maps Rust API artifacts into inspectable playground artifacts", () => {
    const artifacts = fromLiveArtifacts(FOLDING_PROGRAM, {
      tokens: [{ kind: "Let", lexeme: "let", line: 2, column: 3 }],
      ast: { functions: [{ name: "main", return_type: "I32", body: [] }] },
      semantic: { symbols: [{ name: "x", type_name: "i32", scope: "main", role: "local binding" }], diagnostics: [] },
      ir_before: { functions: [{ name: "main", instructions: [{ Binary: { destination: "%t0", operator: "mul", left: { Constant: 2 }, right: { Constant: 10 } } }] }] },
      ir_after: { functions: [{ name: "main", instructions: [{ Constant: { destination: "%t0", value: 20 } }] }] },
      machine: { target: "Craft-32", instructions: ["mov %t0, #20"] },
      diagnostics: [],
    });

    expect(artifacts.tokens[0]).toMatchObject({ value: "let", kind: "keyword" });
    expect(artifacts.symbols).toContainEqual(expect.objectContaining({ name: "x", type: "i32" }));
    expect(artifacts.irAfter[0]?.instruction).toContain("20");
    expect(artifacts.machine).toContain("mov %t0, #20");
  });
});
