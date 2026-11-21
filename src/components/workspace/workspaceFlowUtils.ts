import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { WorkspaceNodeLayout, WorkspaceEdge } from '../../types/workspace';
import { RELATION_LABELS } from '../../types/workspace';
import { parseNoteNodeId } from '../../lib/workspace';
import type { CardData, EdgeData } from './workspaceTypes';
import { COLLAPSED_HEIGHT, EXPANDED_MIN_HEIGHT, EXPANDED_MIN_WIDTH } from './workspaceTypes';

/** Слияние узлов при обновлении layout — сохраняем позицию, размер и раскрытие */
export function syncFlowNodes(current: Node[], incoming: Node[]): Node[] {
  const prev = new Map(current.map((n) => [n.id, n]));
  return incoming.map((inc) => {
    const old = prev.get(inc.id);
    if (!old) return { ...inc, dragHandle: '.note-card-drag-handle' };
    const oldData = old.data as CardData;
    return {
      ...inc,
      position: old.position,
      selected: old.selected,
      style: old.style ?? inc.style,
      dragHandle: '.note-card-drag-handle',
      data: { ...(inc.data as CardData), expanded: oldData.expanded, color: oldData.color ?? (inc.data as CardData).color },
    };
  });
}

/** Функция `defaultNodeStyle`. */
export function defaultNodeStyle(layout: WorkspaceNodeLayout): { width: number; height: number } {
  const w = layout.width ?? (layout.kind === 'text' ? 160 : 170);
  const h = layout.height ?? (layout.collapsed === false ? EXPANDED_MIN_HEIGHT : COLLAPSED_HEIGHT);
  if (layout.collapsed === false) {
    return { width: Math.max(w, EXPANDED_MIN_WIDTH), height: Math.max(h, EXPANDED_MIN_HEIGHT) };
  }
  return { width: w, height: h };
}

/** Функция `toFlowNodes`. */
export function toFlowNodes(
  layout: WorkspaceNodeLayout[],
  handlers: Pick<
    CardData,
    | 'onLabelChange'
    | 'onToggleExpand'
    | 'onResizeEnd'
    | 'onSetType'
    | 'onSetColor'
    | 'onLink'
    | 'onLinkedNote'
  >
): Node[] {
  return layout.map((n) => ({
    id: n.id,
    type: 'noteCard',
    position: { x: n.x, y: n.y },
    dragHandle: '.note-card-drag-handle',
    data: {
      label: n.label ?? n.noteId ?? 'Карточка',
      color: n.color,
      noteId: n.noteId,
      entityType: n.entityType,
      expanded: n.collapsed === false,
      pinned: n.pinned,
      ...handlers,
    },
    style: defaultNodeStyle(n),
    draggable: !n.pinned,
  }));
}

/** Функция `toDisplayEdges`. */
export function toDisplayEdges(edges: WorkspaceEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.kind === 'wiki'
      ? undefined
      : (e.label || (e.relationType && e.relationType !== 'related' ? RELATION_LABELS[e.relationType] : undefined)),
    style: {
      stroke: 'var(--accent)',
      strokeWidth: e.kind === 'wiki' ? 1.25 : 2,
      strokeDasharray: e.kind === 'wiki' ? '6 4' : undefined,
      opacity: e.kind === 'wiki' ? 0.55 : 1,
    },
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent)' },
    data: {
      kind: e.kind,
      relationType: e.relationType,
      rawLabel: e.label,
      color: e.color,
    } satisfies EdgeData,
  }));
}

/** Функция `fromFlowNodes`. */
export function fromFlowNodes(nodes: Node[]): WorkspaceNodeLayout[] {
  return nodes.map((n) => {
    const d = n.data as CardData;
    const noteId = d.noteId ?? parseNoteNodeId(n.id) ?? undefined;
    /** Функция `w`. */
    const w = (n.style?.width as number) ?? 160;
    /** Функция `h`. */
    const h = (n.style?.height as number) ?? COLLAPSED_HEIGHT;
    return {
      id: n.id,
      kind: noteId ? 'note' : 'text',
      noteId,
      label: d.label,
      entityType: d.entityType as WorkspaceNodeLayout['entityType'],
      x: n.position.x,
      y: n.position.y,
      width: w,
      height: h,
      color: d.color,
      pinned: d.pinned,
      collapsed: d.expanded ? false : true,
    };
  });
}

/** Функция `fromManualEdges`. */
export function fromManualEdges(edges: Edge[]): WorkspaceEdge[] {
  return edges
    .filter((e) => (e.data as EdgeData | undefined)?.kind === 'manual')
    .map((e) => {
      const data = e.data as EdgeData;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        kind: 'manual' as const,
        color: 'var(--accent)',
        label: data.rawLabel,
        relationType: data.relationType ?? 'related',
      };
    });
}
