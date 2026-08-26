export type StageId = "tokens" | "ast" | "semantic" | "ir" | "optimize" | "machine";

export type Token = {
  kind: "keyword" | "identifier" | "type" | "number" | "operator" | "punctuation";
  value: string;
  location: string;
};

export type AstNode = {
  id: string;
  label: string;
  detail: string;
  kind: "root" | "function" | "statement" | "expression" | "literal";
  children?: AstNode[];
};

export type SymbolRow = {
  name: string;
  type: string;
  scope: string;
  usage: string;
};

export type IrLine = {
  id: string;
  instruction: string;
  meaning: string;
};

export type ArtifactBundle = {
  tokens: Token[];
  ast: AstNode;
  symbols: SymbolRow[];
  irBefore: IrLine[];
  irAfter: IrLine[];
  machine: string[];
  diagnostics: { level: "success" | "warning" | "error"; message: string; detail: string }[];
  foldedExpression: { before: string; after: string; value: number };
  sourceSummary: string;
};

export const stageMeta: Record<StageId, { index: string; label: string; title: string; eyebrow: string; description: string }> = {
  tokens: {
    index: "01",
    label: "Lexer",
    title: "Tokens, precisely separated.",
    eyebrow: "Lexical analysis",
    description: "The source becomes a stable stream of named units, with every boundary made inspectable.",
  },
  ast: {
    index: "02",
    label: "AST",
    title: "A syntax tree with intent.",
    eyebrow: "Parsing & structure",
    description: "Expressions and statements are arranged into a semantic shape instead of a sequence of characters.",
  },
  semantic: {
    index: "03",
    label: "Types",
    title: "Meaning meets constraint.",
    eyebrow: "Semantic analysis",
    description: "Names resolve into symbols, and every expression is checked against the language’s static type system.",
  },
  ir: {
    index: "04",
    label: "IR",
    title: "The program, lowered.",
    eyebrow: "Intermediate representation",
    description: "A small three-address representation makes evaluation order and data flow explicit.",
  },
  optimize: {
    index: "05",
    label: "Optimize",
    title: "Work removed with proof.",
    eyebrow: "Optimization pass",
    description: "Constant expressions are evaluated once at compile time, leaving fewer instructions at runtime.",
  },
  machine: {
    index: "06",
    label: "Machine",
    title: "A final, executable shape.",
    eyebrow: "Code generation",
    description: "The optimized program is selected into compact register-style instructions for the target runtime.",
  },
};

const KEYWORDS = new Set(["fn", "let", "if", "else", "for", "in", "return", "true", "false"]);
const TYPES = new Set(["i32", "bool", "string"]);
const OPERATORS = new Set(["=", "+", "-", "*", "/", "<", ">", "==", "->", ".."]);
const PUNCTUATION = new Set(["(", ")", "{", "}", "[", "]", ":", ",", ";"]);

function classify(value: string): Token["kind"] {
  if (KEYWORDS.has(value)) return "keyword";
  if (TYPES.has(value)) return "type";
  if (/^\d+$/.test(value)) return "number";
  if (OPERATORS.has(value)) return "operator";
  if (PUNCTUATION.has(value)) return "punctuation";
  return "identifier";
}

function scanTokens(source: string): Token[] {
  const tokenPattern = /->|==|\.\.|[A-Za-z_][A-Za-z0-9_]*|\d+|[=+\-*/<>()[\]{}:;,]/g;
  const lines = source.split("\n");
  const tokens: Token[] = [];

  lines.forEach((line, lineIndex) => {
    Array.from(line.matchAll(tokenPattern)).forEach(match => {
      const value = match[0];
      tokens.push({
        value,
        kind: classify(value),
        location: `${String(lineIndex + 1).padStart(2, "0")}:${String((match.index ?? 0) + 1).padStart(2, "0")}`,
      });
    });
  });

  return tokens;
}

export function compileSource(source: string): ArtifactBundle {
  const variable = source.match(/let\s+([A-Za-z_]\w*)/)?.[1] ?? "x";
  const fnName = source.match(/fn\s+([A-Za-z_]\w*)/)?.[1] ?? "main";
  const multiplication = source.match(/(\d+)\s*\*\s*(\d+)/);
  const left = Number(multiplication?.[1] ?? 2);
  const right = Number(multiplication?.[2] ?? 10);
  const folded = left * right;
  const usesArray = /\[[^\]]+\]/.test(source);
  const hasControlFlow = /\b(if|for)\b/.test(source);
  const hasTypeError = /let\s+\w+\s*:\s*i32\s*=\s*"/.test(source);
  const tokens = scanTokens(source);

  const ast: AstNode = {
    id: "program",
    label: "Program",
    detail: "Compilation unit",
    kind: "root",
    children: [
      {
        id: "function",
        label: `Function · ${fnName}`,
        detail: "returns i32",
        kind: "function",
        children: [
          {
            id: "binding",
            label: `Let · ${variable}: i32`,
            detail: "immutable binding",
            kind: "statement",
            children: [
              {
                id: "multiply",
                label: "Binary · *",
                detail: "constant expression",
                kind: "expression",
                children: [
                  { id: "left", label: String(left), detail: "i32 literal", kind: "literal" },
                  { id: "right", label: String(right), detail: "i32 literal", kind: "literal" },
                ],
              },
            ],
          },
          ...(usesArray
            ? [{ id: "array", label: "Array literal", detail: "[i32]", kind: "statement" as const }]
            : []),
          ...(hasControlFlow
            ? [{ id: "control", label: "Control flow", detail: "if / loop branch", kind: "statement" as const }]
            : []),
          { id: "return", label: "Return", detail: variable, kind: "statement" },
        ],
      },
    ],
  };

  const symbols: SymbolRow[] = [
    { name: fnName, type: "fn() → i32", scope: "module", usage: "entry function" },
    { name: variable, type: "i32", scope: fnName, usage: "immutable local" },
    ...(usesArray ? [{ name: "series", type: "[i32]", scope: fnName, usage: "array literal" }] : []),
  ];

  const irBefore: IrLine[] = [
    { id: "b0", instruction: `fn @${fnName}() -> i32 {`, meaning: "open function" },
    { id: "b1", instruction: `  %t0 = const i32 ${left}`, meaning: "materialize left operand" },
    { id: "b2", instruction: `  %t1 = const i32 ${right}`, meaning: "materialize right operand" },
    { id: "b3", instruction: "  %t2 = mul i32 %t0, %t1", meaning: "evaluate multiplication" },
    { id: "b4", instruction: `  store i32 %t2, @${variable}`, meaning: "bind local value" },
    { id: "b5", instruction: `  ret i32 %t2`, meaning: "return local value" },
    { id: "b6", instruction: "}", meaning: "close function" },
  ];

  const irAfter: IrLine[] = [
    { id: "a0", instruction: `fn @${fnName}() -> i32 {`, meaning: "open function" },
    { id: "a1", instruction: `  %t0 = const i32 ${folded}`, meaning: "folded at compile time" },
    { id: "a2", instruction: `  store i32 %t0, @${variable}`, meaning: "bind simplified value" },
    { id: "a3", instruction: "  ret i32 %t0", meaning: "return simplified value" },
    { id: "a4", instruction: "}", meaning: "close function" },
  ];

  return {
    tokens,
    ast,
    symbols,
    irBefore,
    irAfter,
    machine: [
      `.globl ${fnName}`,
      `${fnName}:`,
      `  mov r0, #${folded}      ; ${left} × ${right}, folded`,
      `  str r0, [sp, #-4]      ; ${variable}: i32`,
      "  bx  lr                 ; return r0",
    ],
    diagnostics: hasTypeError
      ? [{ level: "error", message: "Type mismatch in local binding.", detail: "This binding declares i32, but its initializer is a string literal. Choose a matching static type or replace the value." }]
      : [{ level: "success", message: "Pipeline completed without errors.", detail: `${tokens.length} tokens, ${symbols.length} symbols, and one constant-folding opportunity were inspected.` }],
    foldedExpression: { before: `${left} * ${right}`, after: String(folded), value: folded },
    sourceSummary: `Function ${fnName} with a typed ${variable} binding${usesArray ? ", array data" : ""}${hasControlFlow ? ", and control flow" : ""}.`,
  };
}

export function explainStage(stage: StageId, bundle: ArtifactBundle): string {
  if (stage === "optimize") {
    return `The optimizer can prove that ${bundle.foldedExpression.before} always evaluates to ${bundle.foldedExpression.after}. It replaces the multiply instruction with a single constant, so the runtime has less work to do.`;
  }
  if (stage === "semantic") {
    return `The symbol table records what each name means. Here, the local binding is an i32, so later stages can select integer operations without guessing.`;
  }
  if (stage === "ast") {
    return "The tree keeps structural relationships visible: the multiplication belongs to the initializer, which belongs to a typed local binding inside the function.";
  }
  if (stage === "tokens") {
    return "The lexer does not understand program meaning yet. It only establishes trustworthy pieces—keywords, names, operators, types, and punctuation—for the parser.";
  }
  if (stage === "ir") {
    return "The IR makes data flow explicit. Temporaries such as %t0 and %t2 allow optimization passes to reason about values without source-level syntax getting in the way.";
  }
  return "Code generation selects a compact instruction sequence after the program has passed semantic checks and optimization. The comment preserves the reason behind the immediate value.";
}
