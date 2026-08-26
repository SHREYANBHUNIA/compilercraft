import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { AstNode } from "@/lib/compilerArtifacts";

const NODE_COLORS: Record<AstNode["kind"], string> = {
  root: "#26231d",
  function: "#a95138",
  statement: "#c1883b",
  expression: "#51745e",
  literal: "#6f695e",
};

export function AstDiagram({ tree }: { tree: AstNode }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<AstNode>(tree);

  useEffect(() => {
    setSelected(tree);
  }, [tree]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();

    const root = d3.hierarchy<AstNode>(tree, node => node.children);
    d3.tree<AstNode>().nodeSize([92, 175])(root);
    const nodes = root.descendants();
    const links = root.links();
    const xValues = nodes.map(node => node.x ?? 0);
    const xMin = Math.min(...xValues) - 58;
    const xMax = Math.max(...xValues) + 58;
    const yMax = Math.max(...nodes.map(node => node.y ?? 0)) + 175;
    svg.attr("viewBox", `${-32} ${xMin} ${yMax + 64} ${xMax - xMin + 110}`);

    const layer = svg.append("g");
    layer
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", link => {
        const sourceX = link.source.x ?? 0;
        const sourceY = link.source.y ?? 0;
        const targetX = link.target.x ?? 0;
        const targetY = link.target.y ?? 0;
        const mid = (sourceY + targetY) / 2;
        return `M${sourceY},${sourceX}C${mid},${sourceX} ${mid},${targetX} ${targetY},${targetX}`;
      })
      .attr("fill", "none")
      .attr("stroke", "#cfc5b6")
      .attr("stroke-width", 1.2);

    const node = layer
      .selectAll("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", item => `translate(${item.y ?? 0},${item.x ?? 0})`)
      .style("cursor", "pointer")
      .on("click", (_event, item) => setSelected(item.data));

    node
      .append("circle")
      .attr("r", item => (item.data.id === selected.id ? 17 : 13))
      .attr("fill", item => NODE_COLORS[item.data.kind])
      .attr("stroke", "#f8f4eb")
      .attr("stroke-width", item => (item.data.id === selected.id ? 5 : 3));

    node
      .append("text")
      .attr("x", 21)
      .attr("dy", ".35em")
      .attr("fill", "#2a2721")
      .attr("font-family", "DM Mono, monospace")
      .attr("font-size", 10.5)
      .attr("font-weight", item => (item.data.id === selected.id ? 700 : 500))
      .text(item => item.data.label);
  }, [tree, selected]);

  return (
    <div className="ast-figure">
      <div className="diagram-hint">Select a node to inspect its role</div>
      <svg ref={svgRef} className="ast-svg" aria-label="Interactive abstract syntax tree" />
      <div className="selected-node-note">
        <span>Selected node</span>
        <strong>{selected.label}</strong>
        <p>{selected.detail}</p>
      </div>
    </div>
  );
}
