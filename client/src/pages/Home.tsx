import { AstDiagram } from "@/components/AstDiagram";
import { StageDiagram } from "@/components/StageDiagram";
import { compileSource, explainStage, fromLiveArtifacts, stageMeta, type ArtifactBundle, type StageId } from "@/lib/compilerArtifacts";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  BadgeCheck,
  Binary,
  BotMessageSquare,
  Braces,
  ChevronDown,
  CircleAlert,
  CirclePlay,
  Code2,
  Copy,
  FileCode2,
  GitCompareArrows,
  Hash,
  Layers2,
  ListTree,
  ScanSearch,
  Sparkles,
  TableProperties,
  TreePine,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const SAMPLES = {
  folding: {
    label: "Constant folding",
    description: "A typed binding becomes a single constant.",
    source: `fn main() -> i32 {
  let x: i32 = 2 * 10;
  let series: [i32] = [x, 4, 6];

  if x > 12 {
    for i in 0..3 { print(series[i]); }
  } else { print(0); }

  return x;
}`,
  },
  arrays: {
    label: "Typed arrays",
    description: "Array literals carry static element types.",
    source: `fn totals() -> i32 {
  let x: i32 = 2 * 10;
  let series: [i32] = [x, 8, 13, 21];
  return x;
}`,
  },
  control: {
    label: "Control flow",
    description: "Branches and loops appear in the same unit.",
    source: `fn inspect() -> i32 {
  let x: i32 = 2 * 10;
  if x > 10 {
    for i in 0..2 { print(i); }
  } else { print(x); }
  return x;
}`,
  },
};

const STAGES: { id: StageId; icon: typeof ScanSearch }[] = [
  { id: "tokens", icon: ScanSearch },
  { id: "ast", icon: TreePine },
  { id: "semantic", icon: TableProperties },
  { id: "ir", icon: ListTree },
  { id: "optimize", icon: GitCompareArrows },
  { id: "machine", icon: Binary },
];

function TokenOutput({ bundle }: { bundle: ArtifactBundle }) {
  return (
    <div className="token-output">
      <div className="output-toolbar"><span>{bundle.tokens.length} tokens emitted</span><span>line : column</span></div>
      <div className="token-grid">
        {bundle.tokens.map((token, index) => (
          <div className={`token-chip ${token.kind}`} key={`${token.location}-${index}`}>
            <div><code>{token.value}</code><span>{token.kind}</span></div>
            <small>{token.location}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function SemanticOutput({ bundle }: { bundle: ArtifactBundle }) {
  return (
    <div className="semantic-output">
      <div className="symbol-cards">
        <div><span>Scope depth</span><strong>02</strong><small>module → function</small></div>
        <div><span>Resolved names</span><strong>{String(bundle.symbols.length).padStart(2, "0")}</strong><small>zero unresolved</small></div>
        <div><span>Type checks</span><strong>06</strong><small>all constraints met</small></div>
      </div>
      <div className="symbol-table-wrap">
        <table className="symbol-table">
          <thead><tr><th>Symbol</th><th>Static type</th><th>Scope</th><th>Role</th></tr></thead>
          <tbody>{bundle.symbols.map(row => <tr key={row.name}><td><code>{row.name}</code></td><td><span className="type-pill">{row.type}</span></td><td>{row.scope}</td><td>{row.usage}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="type-proof"><BadgeCheck size={16} /> <span><strong>Type proof:</strong> the multiplication operands are both <code>i32</code>, so the resulting initializer is safely stored as <code>i32</code>.</span></div>
    </div>
  );
}

function IrOutput({ lines, label }: { lines: ArtifactBundle["irBefore"]; label: string }) {
  return <div className="ir-output"><div className="ir-label">{label}</div>{lines.map(line => <div className="ir-row" key={line.id}><span>{line.id}</span><code>{line.instruction}</code><small>{line.meaning}</small></div>)}</div>;
}

function OptimizationOutput({ bundle }: { bundle: ArtifactBundle }) {
  return (
    <div className="optimization-output">
      <div className="optimization-callout"><Sparkles size={18} /><div><span>constant folding / pass 01</span><strong><code>{bundle.foldedExpression.before}</code> becomes <code>{bundle.foldedExpression.after}</code></strong><p>The expression only contains known integer literals, so it can be evaluated before the program runs.</p></div></div>
      <div className="diff-layout"><IrOutput label="Before optimization" lines={bundle.irBefore} /><div className="diff-arrow"><ArrowRight size={22} /></div><IrOutput label="After optimization" lines={bundle.irAfter} /></div>
    </div>
  );
}

function MachineOutput({ bundle }: { bundle: ArtifactBundle }) {
  return <div className="machine-output"><div className="machine-header"><span>Target: Craft-32 / register ABI</span><button aria-label="Copy generated machine code"><Copy size={14} /> Copy</button></div><pre>{bundle.machine.join("\n")}</pre><div className="machine-footer"><span>04 instructions selected</span><span>0 multiply instructions remain</span></div></div>;
}

export default function Home() {
  const [source, setSource] = useState(() => localStorage.getItem("compilercraft:source") ?? SAMPLES.folding.source);
  const [compiledSource, setCompiledSource] = useState(SAMPLES.folding.source);
  const [sample, setSample] = useState<keyof typeof SAMPLES>("folding");
  const [activeStage, setActiveStage] = useState<StageId>("optimize");
  const [showAssistant, setShowAssistant] = useState(true);
  const [hasUncompiledEdits, setHasUncompiledEdits] = useState(false);
  const [liveArtifacts, setLiveArtifacts] = useState<ArtifactBundle | null>(null);
  const [compilerMode, setCompilerMode] = useState<"local" | "live" | "fallback">("local");
  const compileMutation = trpc.compiler.compile.useMutation();
  const bundle = useMemo(() => compileSource(compiledSource), [compiledSource]);
  const activeBundle = liveArtifacts ?? bundle;
  const stage = stageMeta[activeStage];
  const sourceLines = source.split("\n");

  useEffect(() => {
    localStorage.setItem("compilercraft:source", source);
  }, [source]);

  const selectSample = (key: keyof typeof SAMPLES) => {
    setSample(key);
    setSource(SAMPLES[key].source);
    setHasUncompiledEdits(true);
  };

  const compile = async (nextStage?: StageId) => {
    setCompiledSource(source);
    setHasUncompiledEdits(false);
    if (nextStage) setActiveStage(nextStage);
    try {
      const live = await compileMutation.mutateAsync({ source });
      setLiveArtifacts(fromLiveArtifacts(source, live));
      setCompilerMode("live");
    } catch {
      setLiveArtifacts(null);
      setCompilerMode("fallback");
    }
  };

  const renderOutput = () => {
    if (activeStage === "tokens") return <TokenOutput bundle={activeBundle} />;
    if (activeStage === "ast") return <AstDiagram tree={activeBundle.ast} />;
    if (activeStage === "semantic") return <SemanticOutput bundle={activeBundle} />;
    if (activeStage === "ir") return <IrOutput label="Three-address IR / pre-optimization" lines={activeBundle.irBefore} />;
    if (activeStage === "optimize") return <OptimizationOutput bundle={activeBundle} />;
    return <MachineOutput bundle={activeBundle} />;
  };

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <a className="brand" href="#studio" aria-label="CompilerCraft home"><span className="brand-mark">C</span><span>CompilerCraft</span></a>
        <nav><a className="active" href="#studio">Studio</a><a href="#language">Language</a><a href="#notes">Field notes</a></nav>
        <div className="header-actions"><span className={`status-dot ${compilerMode === "fallback" ? "fallback" : ""}`} /> <span>{compilerMode === "live" ? "Axum live" : "Rust target"}</span><button className="header-button" disabled={compileMutation.isPending} onClick={() => void compile("machine")}><CirclePlay size={15} /> {compileMutation.isPending ? "Building" : "Run build"}</button></div>
      </header>

      <main id="studio">
        <section className="cover-intro">
          <div className="intro-index">Vol. 01 <span /> Compiler construction</div>
          <div className="intro-body">
            <p className="intro-kicker">A visual study in language design</p>
            <h1>Every compiler<br /><em>is a way of seeing.</em></h1>
            <div className="intro-side"><p>Write a small language. Watch it acquire structure, constraints, and finally a machine-ready form.</p><a href="#workspace">Enter the workbench <ArrowRight size={15} /></a></div>
          </div>
          <div className="pipeline-legend"><span>Source</span><i /> <span>Lexer</span><i /> <span>Syntax</span><i /> <span>Meaning</span><i /> <span>IR</span><i /> <span>Target</span></div>
        </section>

        <section className="workspace" id="workspace">
          <aside className="workspace-rail">
            <div className="rail-heading"><span>Workspace</span><button aria-label="Workspace options"><ChevronDown size={14} /></button></div>
            <div className="project-title"><FileCode2 size={17} /><div><strong>orbit.craft</strong><span>local draft saved</span></div></div>
            <div className="rail-section"><p>Specimens</p>{(Object.entries(SAMPLES) as [keyof typeof SAMPLES, typeof SAMPLES.folding][]).map(([key, item]) => <button className={`sample-card ${sample === key ? "selected" : ""}`} key={key} onClick={() => selectSample(key)}><span>{item.label}</span><small>{item.description}</small></button>)}</div>
            <div className="rail-section rail-language" id="language"><p>Language surface</p><div><code>let</code><code>fn</code><code>if / else</code><code>for</code><code>[T]</code><code>i32</code></div></div>
            <div className="rail-note"><Hash size={14} /><p><strong>Craft</strong> is a small statically typed language used to make each compiler decision legible.</p></div>
          </aside>

          <div className="workbench">
            <div className="workbench-topline"><div><span>Working file</span><strong>orbit.craft</strong></div><div className={`compile-state ${hasUncompiledEdits ? "pending" : compilerMode === "fallback" ? "fallback" : ""}`}><i />{hasUncompiledEdits ? "Edits not compiled" : compilerMode === "live" ? "Live Axum artifacts" : compilerMode === "fallback" ? "Preview fallback — API unavailable" : "Artifact set current"}</div></div>
            <div className="stage-strip">
              {STAGES.map(({ id, icon: Icon }) => <button key={id} onClick={() => setActiveStage(id)} className={activeStage === id ? "current" : ""}><span>{stageMeta[id].index}</span><Icon size={15} /><strong>{stageMeta[id].label}</strong></button>)}
            </div>

            <div className="editor-output-grid">
              <section className="source-panel">
                <div className="panel-heading"><div><span>Source</span><strong>craft / typed</strong></div><div className="source-actions"><button aria-label="Format source"><Braces size={15} /></button><button disabled={compileMutation.isPending} onClick={() => void compile()} className="compile-button"><Sparkles size={14} /> {compileMutation.isPending ? "Compiling" : "Compile"}</button></div></div>
                <div className="source-editor"><div className="line-numbers">{sourceLines.map((_, index) => <span key={index}>{String(index + 1).padStart(2, "0")}</span>)}</div><textarea value={source} spellCheck={false} onChange={event => { setSource(event.target.value); setHasUncompiledEdits(true); }} aria-label="Craft language source editor" /></div>
                <div className="editor-foot"><span><i /> static types enabled</span><span>{sourceLines.length} lines</span></div>
              </section>

              <section className="artifact-panel">
                <div className="panel-heading artifact-heading"><div><span>{stage.eyebrow}</span><strong>{stage.title}</strong></div><span className="artifact-no">Artifact {stage.index} / 06</span></div>
                <p className="artifact-description">{stage.description}</p>
                <div className="artifact-body">{activeStage !== "ast" && <StageDiagram stage={activeStage} artifacts={activeBundle} />}{renderOutput()}</div>
              </section>
            </div>

            <div className="diagnostic-row">
              <div className={`diagnostic ${activeBundle.diagnostics[0].level}`}><div>{activeBundle.diagnostics[0].level === "success" ? <BadgeCheck size={17} /> : <CircleAlert size={17} />}</div><p><strong>{activeBundle.diagnostics[0].message}</strong><span>{activeBundle.diagnostics[0].detail}</span></p></div>
              <button className={`assistant-toggle ${showAssistant ? "open" : ""}`} onClick={() => setShowAssistant(value => !value)}><BotMessageSquare size={16} /> Studio assistant <span>{showAssistant ? "Hide" : "Explain"}</span></button>
            </div>
            {showAssistant && <div className="assistant-card" id="notes"><div className="assistant-mark"><BotMessageSquare size={19} /></div><div><span>Readable compiler note</span><strong>{stage.eyebrow}</strong><p>{explainStage(activeStage, activeBundle)}</p></div><button onClick={() => setActiveStage("optimize")}>See the optimization <ArrowRight size={14} /></button></div>}
          </div>
        </section>
      </main>
    </div>
  );
}
