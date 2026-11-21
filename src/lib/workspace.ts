import type { CanvasData, GraphData, NoteMeta } from '../types';
import type {
  WorkspaceData,
  WorkspaceEdge,
  WorkspaceNodeLayout,
  TypedRelation,
  EntityType,
} from '../types/workspace';
import { DEFAULT_WORKSPACE_ID } from '../types/workspace';

/** Функция `noteNodeId`. */
export function noteNodeId(noteId: string): string {
  return `note-${noteId}`;
}

/** Функция `parseNoteNodeId`. */
export function parseNoteNodeId(nodeId: string): string | null {
  return nodeId.startsWith('note-') ? nodeId.slice(5) : null;
}

/** Функция `defaultWorkspace`. */
export function defaultWorkspace(title = 'База знаний'): WorkspaceData {
  return {
    id: DEFAULT_WORKSPACE_ID,
    title,
    schemaVersion: 1,
    nodes: [],
    edges: [],
    hiddenNoteIds: [],
  };
}

/** Функция `migrateCanvasToWorkspace`. */
export function migrateCanvasToWorkspace(canvas: CanvasData): WorkspaceData {
  const idMap = new Map<string, string>();
  const nodes: WorkspaceNodeLayout[] = canvas.nodes.map((n) => {
    const id = n.noteId ? noteNodeId(n.noteId) : `${canvas.id}-${n.id}`;
    idMap.set(n.id, id);
    return {
      id,
      kind: n.noteId ? 'note' : 'text',
      noteId: n.noteId,
      label: n.label,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      color: n.color,
    };
  });
  const edges: WorkspaceEdge[] = canvas.edges.map((e) => ({
    id: e.id,
    source: idMap.get(e.source) ?? e.source,
    target: idMap.get(e.target) ?? e.target,
    kind: 'manual',
    color: e.color,
    label: e.label,
    relationType: 'related',
  }));
  return {
    id: canvas.id === 'week-plan' ? DEFAULT_WORKSPACE_ID : canvas.id,
    title: canvas.id === 'week-plan' ? 'База знаний' : canvas.title,
    schemaVersion: 1,
    nodes,
    edges,
  };
}

/** Функция `mergeCanvasesIntoWorkspace`. */
export function mergeCanvasesIntoWorkspace(
  canvases: CanvasData[],
  existing: WorkspaceData | null
): WorkspaceData {
  const base = existing ?? defaultWorkspace();
  const ws: WorkspaceData = {
    ...base,
    nodes: [...base.nodes],
    edges: [...base.edges],
    hiddenNoteIds: [...(base.hiddenNoteIds ?? [])],
  };
  const nodeIds = new Set(ws.nodes.map((n) => n.id));
  const edgeIds = new Set(ws.edges.map((e) => e.id));

  for (const canvas of canvases) {
    const migrated = migrateCanvasToWorkspace(canvas);
    for (const n of migrated.nodes) {
      if (!nodeIds.has(n.id)) {
        ws.nodes.push(n);
        nodeIds.add(n.id);
      }
    }
    for (const e of migrated.edges) {
      if (!edgeIds.has(e.id)) {
        ws.edges.push(e);
        edgeIds.add(e.id);
      }
    }
  }
  return ws;
}

/** Функция `placeNodeNear`. */
export function placeNodeNear(
  layout: WorkspaceNodeLayout[],
  sourceNodeId: string,
  newNoteId: string,
  label: string,
  entityType?: EntityType
): WorkspaceNodeLayout[] {
  const source = layout.find((n) => n.id === sourceNodeId || n.noteId === sourceNodeId);
  /** Функция `x`. */
  const x = (source?.x ?? 120) + 200;
  /** Функция `y`. */
  const y = (source?.y ?? 120) + 40;
  const node: WorkspaceNodeLayout = {
    id: noteNodeId(newNoteId),
    kind: 'note',
    noteId: newNoteId,
    label,
    entityType,
    x,
    y,
    width: entityType === 'person' ? 100 : 170,
    height: entityType === 'person' ? 100 : 72,
  };
  return [...layout.filter((n) => n.id !== node.id), node];
}

/** Функция `autoPlaceNote`. */
export function autoPlaceNote(
  note: NoteMeta,
  index: number,
  existing: WorkspaceNodeLayout[]
): WorkspaceNodeLayout {
  const id = noteNodeId(note.id);
  const found = existing.find((n) => n.id === id);
  if (found) return found;
  const col = index % 6;
  const row = Math.floor(index / 6);
  return {
    id,
    kind: 'note',
    noteId: note.id,
    label: note.title,
    entityType: note.entityType ?? note.type,
    x: 80 + col * 200,
    y: 80 + row * 120,
    width: note.entityType === 'person' ? 100 : 170,
    height: note.entityType === 'person' ? 100 : 72,
    color: note.color,
  };
}

/** Функция `mergeWorkspaceNodes`. */
export function mergeWorkspaceNodes(
  notes: Record<string, NoteMeta>,
  workspace: WorkspaceData,
  showAll: boolean
): WorkspaceNodeLayout[] {
  const hidden = new Set(workspace.hiddenNoteIds ?? []);
  const byId = new Map(workspace.nodes.map((n) => [n.id, n]));
  const result: WorkspaceNodeLayout[] = [];
  const shouldAutoPopulate = workspace.nodes.length === 0 && hidden.size === 0;

  for (const saved of workspace.nodes) {
    if (saved.kind !== 'note' || !saved.noteId || hidden.has(saved.noteId)) continue;
    const note = notes[saved.noteId];
    if (!note) continue;
    result.push({
      ...saved,
      label: saved.label ?? note.title,
      entityType: note.entityType ?? saved.entityType ?? note.type,
      color: note.color ?? saved.color,
    });
  }

  const noteList = Object.values(notes).filter((n) => n.type !== 'daily' || showAll);

  noteList.forEach((note, i) => {
    if (hidden.has(note.id)) return;
    const id = noteNodeId(note.id);
    const saved = byId.get(id);
    if (!saved && (showAll || shouldAutoPopulate)) {
      result.push(autoPlaceNote(note, i, workspace.nodes));
    }
  });

  for (const n of workspace.nodes) {
    if (n.kind === 'text' && !result.some((r) => r.id === n.id)) {
      result.push(n);
    }
  }
  return result;
}

/** Функция `wikiEdgesFromGraph`. */
export function wikiEdgesFromGraph(
  graph: GraphData,
  nodeIds: Set<string>
): WorkspaceEdge[] {
  return graph.links
    .filter((l) => nodeIds.has(noteNodeId(l.source)) && nodeIds.has(noteNodeId(l.target)))
    .map((l) => ({
      id: `wiki-${l.source}-${l.target}`,
      source: noteNodeId(l.source),
      target: noteNodeId(l.target),
      kind: 'wiki' as const,
      relationType: l.relationType ?? 'related',
    }));
}

/** Функция `mergeEdges`. */
export function mergeEdges(
  manual: WorkspaceEdge[],
  wiki: WorkspaceEdge[],
  relations: TypedRelation[],
  nodeIds: Set<string>
): WorkspaceEdge[] {
  const typed = relations
    .filter((r) => nodeIds.has(noteNodeId(r.sourceId)) && nodeIds.has(noteNodeId(r.targetId)))
    .map(
      (r): WorkspaceEdge => ({
        id: r.id,
        source: noteNodeId(r.sourceId),
        target: noteNodeId(r.targetId),
        kind: 'typed',
        relationType: r.relationType,
        label: r.label,
        color: undefined,
      })
    );
  const persisted = manual.filter((e) => e.kind === 'manual');
  const overridingPairs = new Set([...persisted, ...typed].map((e) => `${e.source}->${e.target}`));
  const ids = new Set(persisted.map((e) => e.id));
  const typedUnique = typed.filter((e) => !ids.has(e.id));
  typedUnique.forEach((e) => ids.add(e.id));
  const wikiFiltered = wiki.filter(
    (e) => !overridingPairs.has(`${e.source}->${e.target}`) && !ids.has(e.id)
  );
  return [...persisted, ...typedUnique, ...wikiFiltered];
}

/** Все типы заметок рисуются одним акцентом. Аргументы сохранены для существующих вызовов. */
export function entityColor(type?: EntityType, fallback?: string): string {
  void type;
  void fallback;
  return 'var(--accent)';
}

/** Функция `workspaceFromFlow`. */
export function workspaceFromFlow(
  workspace: WorkspaceData,
  nodes: WorkspaceNodeLayout[]
): WorkspaceData {
  return { ...workspace, nodes };
}
