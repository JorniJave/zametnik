import type { GraphData, NoteMeta } from '../types';
import { getWeekLabel, titleToId } from './parser';

export type GraphFilter = 'all' | 'tasks' | 'projects' | 'week';

/** Оставляет узлы по фильтру графа. «Неделя» — хаб, его дни и их ссылки. */
export function filteredGraph(
  graph: GraphData,
  notes: Record<string, NoteMeta>,
  filter: GraphFilter,
  weekTitle = getWeekLabel(new Date())
): GraphData {
  if (filter === 'all') return graph;

  const keep = new Set<string>();
  if (filter === 'tasks' || filter === 'projects') {
    const type = filter === 'tasks' ? 'task' : 'project';
    for (const node of graph.nodes) {
      if (notes[node.id]?.type === type) keep.add(node.id);
    }
  } else {
    const weekId = titleToId(weekTitle);
    if (notes[weekId]) keep.add(weekId);
    const dayIds = new Set<string>();
    for (const title of notes[weekId]?.links ?? []) dayIds.add(titleToId(title));
    for (const note of Object.values(notes)) {
      if (note.type === 'daily' && note.links.some((link) => titleToId(link) === weekId)) {
        dayIds.add(note.id);
      }
    }
    for (const dayId of dayIds) {
      keep.add(dayId);
      for (const title of notes[dayId]?.links ?? []) keep.add(titleToId(title));
    }
  }

  const nodes = graph.nodes.filter((node) => keep.has(node.id));
  const ids = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    links: graph.links.filter((link) => ids.has(String(link.source)) && ids.has(String(link.target))),
  };
}

function sliceGraph(graph: GraphData, keep: Set<string>): GraphData {
  const nodes = graph.nodes.filter((node) => keep.has(node.id));
  const ids = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    links: graph.links.filter((link) => ids.has(String(link.source)) && ids.has(String(link.target))),
  };
}

/**
 * Домашний экран — темы (проекты и обычные заметки).
 * Выбранный кружок — только он и то, что с ним связано.
 * Поиск ищет по всем названиям.
 */
export function scopeGraph(
  graph: GraphData,
  notes: Record<string, NoteMeta>,
  focusId: string | null,
  hidden: Iterable<string> = [],
  query = ''
): GraphData {
  const hide = new Set(hidden);
  const visibleNodes = graph.nodes.filter((node) => !hide.has(node.id));
  const visible: GraphData = {
    nodes: visibleNodes,
    links: graph.links.filter((link) => !hide.has(String(link.source)) && !hide.has(String(link.target))),
  };
  const q = query.trim().toLowerCase();
  if (q) {
    const keep = new Set(
      visible.nodes
        .filter((node) => (notes[node.id]?.title ?? node.title).toLowerCase().includes(q))
        .map((node) => node.id)
    );
    return sliceGraph(visible, keep);
  }
  if (focusId && visible.nodes.some((node) => node.id === focusId)) {
    const keep = connectedNodeIds(visible, focusId) ?? new Set([focusId]);
    return sliceGraph(visible, keep);
  }
  const hubs = new Set(
    visible.nodes
      .filter((node) => {
        const note = notes[node.id];
        return note?.type === 'project' || note?.type === 'note' || note?.entityType === 'person';
      })
      .map((node) => node.id)
  );
  return sliceGraph(visible, hubs);
}

/** Узлы, связанные с выбранным (включая сам узел). */
export function connectedNodeIds(graph: GraphData, nodeId: string | null): Set<string> | null {
  if (!nodeId) return null;
  const set = new Set<string>([nodeId]);
  for (const link of graph.links) {
    const s = String(link.source);
    const t = String(link.target);
    if (s === nodeId) set.add(t);
    if (t === nodeId) set.add(s);
  }
  return set;
}

/** Подсветка только прямых связей выбранного узла. */
export function isLinkHighlighted(
  link: { source: string | number; target: string | number },
  highlight: Set<string> | null,
  selectedId: string | null
): boolean {
  if (!highlight || !selectedId) return false;
  const s = String(link.source);
  const t = String(link.target);
  return (s === selectedId && highlight.has(t)) || (t === selectedId && highlight.has(s));
}
