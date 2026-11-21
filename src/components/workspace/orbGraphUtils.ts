import type { GraphData, NoteMeta } from '../../types';
import { connectedNodeIds } from '../../lib/graphHighlight';
import { accentHex, inkHex, mutedHex } from '../../lib/palette';

export type OrbNode = {
  id: string;
  name: string;
  val: number;
  color: string;
  dim: boolean;
  orphan: boolean;
  x?: number;
  y?: number;
};

export type OrbLink = { source: string; target: string; orphan: boolean };

/** Вся сеть. Выбранный узел и его соседи остаются яркими. */
export function buildOrbGraphData(
  graph: GraphData,
  notes: Record<string, NoteMeta>,
  focusNoteId: string | null,
  positions?: Map<string, { x: number; y: number }>
): { nodes: OrbNode[]; links: OrbLink[] } {
  const highlight = connectedNodeIds(graph, focusNoteId);
  const accent = accentHex();
  const muted = mutedHex();
  const nodes: OrbNode[] = graph.nodes.map((node) => {
    const known = Boolean(notes[node.id]);
    const dim = Boolean(highlight && !highlight.has(node.id));
    const saved = positions?.get(node.id);
    return {
      id: node.id,
      name: notes[node.id]?.title ?? node.title,
      val: node.id === focusNoteId ? 18 : 6,
      color: dim ? muted : accent,
      dim,
      orphan: !known,
      x: saved?.x,
      y: saved?.y,
    };
  });

  const links = graph.links.map((link) => ({
    source: String(link.source),
    target: String(link.target),
    orphan: !notes[String(link.source)] || !notes[String(link.target)],
  }));

  return { nodes, links };
}

/** Круг и подпись. Приглушённые подписи пропускаются, пока граф мелкий. */
export function paintOrbNode(
  node: { x?: number; y?: number; name: string; color: string; val: number; dim?: boolean },
  ctx: CanvasRenderingContext2D,
  globalScale: number
): void {
  if (node.x == null || node.y == null) return;
  const r = node.val;
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
  ctx.fillStyle = node.color;
  ctx.globalAlpha = node.dim ? 0.35 : 1;
  ctx.fill();
  ctx.strokeStyle = inkHex();
  ctx.lineWidth = 1.2 / globalScale;
  ctx.stroke();
  if (!node.dim || globalScale > 1.4) {
    const label = node.name.length > 22 ? `${node.name.slice(0, 20)}…` : node.name;
    ctx.font = `${12 / globalScale}px system-ui, sans-serif`;
    ctx.fillStyle = inkHex();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, node.x, node.y + r + 3 / globalScale);
  }
  ctx.globalAlpha = 1;
}
