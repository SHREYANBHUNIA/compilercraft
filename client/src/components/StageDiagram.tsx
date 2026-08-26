import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { ArtifactBundle, StageId } from "@/lib/compilerArtifacts";

type DiagramNode = { id: string; label: string; tone: "ink" | "rust" | "green" | "gold" | "muted" };

const tone = { ink: "#29251e", rust: "#a95138", green: "#51745e", gold: "#bd863c", muted: "#9c9488" };

function nodesFor(stage: Exclude<StageId, "ast">, artifacts: ArtifactBundle): DiagramNode[] {
  if (stage === "tokens") return artifacts.tokens.slice(0, 7).map((token, index) => ({ id: `${token.location}-${index}`, label: `${token.value} · ${token.kind}`, tone: token.kind === "keyword" ? "rust" : token.kind === "type" ? "green" : "muted" }));
  if (stage === "semantic") return artifacts.symbols.map((symbol, index) => ({ id: `${symbol.name}-${index}`, label: `${symbol.name}: ${symbol.type}`, tone: index === 0 ? "rust" : "green" }));
  if (stage === "ir") return [{ id: "source", label: "2 · 10", tone: "gold" }, { id: "op", label: "mul", tone: "rust" }, { id: "temp", label: "%t2", tone: "ink" }, { id: "store", label: "@x", tone: "green" }];
  if (stage === "optimize") return [{ id: "before", label: artifacts.foldedExpression.before, tone: "rust" }, { id: "pass", label: "fold", tone: "gold" }, { id: "after", label: artifacts.foldedExpression.after, tone: "green" }];
  return [{ id: "ir", label: "IR", tone: "muted" }, { id: "select", label: "select", tone: "gold" }, { id: "register", label: "r0", tone: "rust" }, { id: "target", label: "Craft-32", tone: "ink" }];
}

export function StageDiagram({ stage, artifacts }: { stage: Exclude<StageId, "ast">; artifacts: ArtifactBundle }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState("");
  const nodes = nodesFor(stage, artifacts);

  useEffect(() => { setSelected(nodes[0]?.label ?? ""); }, [stage, artifacts, nodes]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();
    const width = 620;
    const x = d3.scalePoint().domain(nodes.map(node => node.id)).range([38, width - 38]).padding(.35);

    svg.attr("viewBox", `0 0 ${width} 60`);
    svg.append("path").attr("d", `M38,30H${width - 38}`).attr("stroke", "#d6cdbf").attr("stroke-width", 1);
    svg.selectAll("line.connector").data(nodes.slice(1)).join("line").attr("x1", node => x(nodes[nodes.findIndex(item => item.id === node.id) - 1]?.id) ?? 0).attr("x2", node => x(node.id) ?? 0).attr("y1", 30).attr("y2", 30).attr("stroke", "#bdb3a4").attr("stroke-dasharray", "2 3");

    const group = svg.selectAll("g.trace-node").data(nodes).join("g").attr("class", "trace-node").attr("transform", node => `translate(${x(node.id) ?? 0},30)`).style("cursor", "pointer").on("click", (_event, node) => setSelected(node.label));
    group.append("circle").attr("r", node => node.label === selected ? 9 : 6).attr("fill", node => tone[node.tone]).attr("stroke", "#fbf9f3").attr("stroke-width", node => node.label === selected ? 4 : 2);
    group.append("text").attr("y", -16).attr("text-anchor", "middle").attr("fill", "#746d62").attr("font-family", "DM Mono, monospace").attr("font-size", 8.5).text(node => node.label);
  }, [nodes, selected]);

  return <div className="stage-diagram"><span>Trace</span><svg ref={svgRef} aria-label={`${stage} interactive flow diagram`} /><small>{selected}</small></div>;
}
