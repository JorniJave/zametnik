/**
 * Состояние холста «Базы знаний»: узлы, рёбра, синхронизация с vault.
 * Отделено от обработчиков, чтобы файл не разрастался.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNodesState, useEdgesState, type Node, type Edge, type Viewport } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasHistory } from '../../hooks/useCanvasHistory';
import { getAPI } from '../../lib/api';
import type { WorkspaceNodeLayout, RelationType, EntityType } from '../../types/workspace';
import { DEFAULT_WORKSPACE_ID } from '../../types/workspace';
import {
  parseNoteNodeId,
  mergeWorkspaceNodes,
  wikiEdgesFromGraph,
  mergeEdges,
} from '../../lib/workspace';
import type { CardData, PaneMenuState, NodeMenuState } from './workspaceTypes';
import { COLLAPSED_HEIGHT, EXPANDED_MIN_HEIGHT, EXPANDED_MIN_WIDTH } from './workspaceTypes';
import {
  syncFlowNodes,
  toFlowNodes,
  toDisplayEdges,
  fromFlowNodes,
  fromManualEdges,
} from './workspaceFlowUtils';

/** Функция `useWorkspaceBoardState`. */
export function useWorkspaceBoardState() {
  const notes = useAppStore((s) => s.notes);
  const graph = useAppStore((s) => s.graph);
  const graphFilter = useAppStore((s) => s.graphFilter);
  const setGraphFilter = useAppStore((s) => s.setGraphFilter);
  const workspace = useAppStore((s) => s.workspace);
  const workspaceId = useAppStore((s) => s.workspaceId);
  const workspaceList = useAppStore((s) => s.workspaceList);
  const relations = useAppStore((s) => s.relations);
  const loadWorkspace = useAppStore((s) => s.loadWorkspace);
  const saveWorkspace = useAppStore((s) => s.saveWorkspace);
  const refreshWorkspaceList = useAppStore((s) => s.refreshWorkspaceList);
  const createLinkedNote = useAppStore((s) => s.createLinkedNote);
  const createWorkspace = useAppStore((s) => s.createWorkspace);
  const renameWorkspace = useAppStore((s) => s.renameWorkspace);
  const deleteWorkspace = useAppStore((s) => s.deleteWorkspace);
  const saveRelations = useAppStore((s) => s.saveRelations);
  const linkNotes = useAppStore((s) => s.linkNotes);
  const updateNoteMeta = useAppStore((s) => s.updateNoteMeta);
  const setWorkspaceFocusNoteId = useAppStore((s) => s.setWorkspaceFocusNoteId);
  const workspaceFocusNoteId = useAppStore((s) => s.workspaceFocusNoteId);
  const workspaceDisplayMode = useAppStore((s) => s.workspaceDisplayMode);
  const setWorkspaceDisplayMode = useAppStore((s) => s.setWorkspaceDisplayMode);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBoards, setShowBoards] = useState(true);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkedModalOpen, setLinkedModalOpen] = useState(false);
  const [linkedFromNodeId, setLinkedFromNodeId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<NodeMenuState | null>(null);
  const [paneMenu, setPaneMenu] = useState<PaneMenuState | null>(null);
  const [boardSearch, setBoardSearch] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<RelationType>('related');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');

  const viewportRef = useRef<Viewport | undefined>(undefined);
  const viewportTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveChainRef = useRef(Promise.resolve());
  const persistRef = useRef<(nodes: Node[], edges: Edge[]) => void>(() => undefined);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const labelChangeRef = useRef<(nodeId: string, label: string) => void>(() => undefined);
  const toggleExpandRef = useRef<(nodeId: string) => void>(() => undefined);
  const resizeEndRef = useRef<(nodeId: string, width: number, height: number) => void>(() => undefined);
  const resizeLiveRef = useRef<(nodeId: string, width: number, height: number) => void>(() => undefined);
  const setColorRef = useRef<(nodeId: string, c: string) => void>(() => undefined);
  const layoutSyncKeyRef = useRef('');
  const lastDrillKeyRef = useRef('');
  const paneDropRef = useRef<{ x: number; y: number } | null>(null);

  const nodeHandlers = useMemo(() => ({
    onLabelChange: (nodeId: string, label: string) => labelChangeRef.current(nodeId, label),
    onToggleExpand: (nodeId: string) => toggleExpandRef.current(nodeId),
    onResizeEnd: (nodeId: string, width: number, height: number) =>
      resizeEndRef.current(nodeId, width, height),
    onResize: (nodeId: string, width: number, height: number) =>
      resizeLiveRef.current(nodeId, width, height),
    onSetType: (nodeId: string, t: EntityType) => {
      const noteId = parseNoteNodeId(nodeId);
      if (noteId) void updateNoteMeta(noteId, { entityType: t });
    },
    onSetColor: (nodeId: string, c: string) => setColorRef.current(nodeId, c),
    onLink: (nodeId: string) => {
      setLinkSourceId(nodeId);
      setLinkMode(true);
    },
    onLinkedNote: (nodeId: string) => {
      setLinkedFromNodeId(nodeId);
      setLinkedModalOpen(true);
    },
  }), [updateNoteMeta]);

  const layoutNodes = useMemo(() => {
    if (!workspace) return [];
    return mergeWorkspaceNodes(notes, workspace, showAllNotes);
  }, [notes, workspace, showAllNotes]);

  const nodeIsVisible = useCallback((layout: WorkspaceNodeLayout) => {
    const note = layout.noteId ? notes[layout.noteId] : undefined;
    if (graphFilter === 'tasks' && note?.type !== 'task') return false;
    if (graphFilter === 'projects' && note?.type !== 'project') return false;
    if (graphFilter === 'week' && note && note.type !== 'daily' && note.type !== 'week') return false;
    const q = boardSearch.trim().toLowerCase();
    return !q || (layout.label ?? '').toLowerCase().includes(q);
  }, [boardSearch, graphFilter, notes]);

  const flowNodesInit = useMemo<Node[]>(
    () => toFlowNodes(layoutNodes, nodeHandlers).map((node, index) => ({
      ...node,
      hidden: !nodeIsVisible(layoutNodes[index]),
    })),
    [layoutNodes, nodeHandlers, nodeIsVisible]
  );

  const nodeIdSet = useMemo(() => new Set(layoutNodes.map((n) => n.id)), [layoutNodes]);

  const allEdges = useMemo(() => {
    if (!workspace) return [];
    const wiki = wikiEdgesFromGraph(graph, nodeIdSet);
    return mergeEdges(workspace.edges, wiki, relations, nodeIdSet);
  }, [workspace, graph, relations, nodeIdSet]);

  const [nodes, setNodes] = useNodesState<Node>(flowNodesInit);
  const [edges, setEdges] = useEdgesState<Edge>(toDisplayEdges(allEdges));
  nodesRef.current = nodes;
  edgesRef.current = edges;

  labelChangeRef.current = (nodeId, label) => {
    const next = nodesRef.current.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, label } } : node
    );
    setNodes(next);
    void persistRef.current(next, edgesRef.current);
  };

  toggleExpandRef.current = (nodeId) => {
    setNodes((current) => {
      const target = current.find((n) => n.id === nodeId);
      const data = target?.data as CardData | undefined;
      const willExpand = !data?.expanded;
      const next = current.map((node) => {
        if (node.id !== nodeId) return node;
        const expanded = willExpand;
        /** Функция `currentWidth`. */
        const currentWidth = (node.style?.width as number) ?? 160;
        const style = expanded
          ? {
              width: Math.max(currentWidth, EXPANDED_MIN_WIDTH),
              height: Math.max((node.style?.height as number) ?? 120, EXPANDED_MIN_HEIGHT),
            }
          : { width: currentWidth, height: COLLAPSED_HEIGHT };
        return { ...node, data: { ...node.data, expanded }, style };
      });
      void persistRef.current(next, edgesRef.current);
      if (willExpand) {
        const noteId = parseNoteNodeId(nodeId);
        if (noteId) void getAPI().readNote(noteId);
      }
      return next;
    });
    setSelectedId(nodeId);
  };

  resizeEndRef.current = (nodeId, width, height) => {
    setNodes((current) => {
      const next = current.map((node) =>
        node.id === nodeId ? { ...node, style: { ...node.style, width, height } } : node
      );
      void persistRef.current(next, edgesRef.current);
      return next;
    });
  };

  resizeLiveRef.current = (nodeId, width, height) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId ? { ...node, style: { ...node.style, width, height } } : node
      )
    );
  };

  setColorRef.current = (nodeId, c) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId ? { ...node, data: { ...(node.data as CardData), color: c } } : node
      )
    );
    const noteId = parseNoteNodeId(nodeId);
    if (noteId) void updateNoteMeta(noteId, { color: c });
  };

  const { pushHistory, undo, redo, resetHistory, canUndo, canRedo } = useCanvasHistory(
    nodes,
    edges,
    setNodes,
    setEdges
  );

  useEffect(() => {
    loadWorkspace(DEFAULT_WORKSPACE_ID);
    refreshWorkspaceList();
  }, [loadWorkspace, refreshWorkspaceList]);

  useEffect(() => {
    const key = `${workspaceId}:${layoutNodes.map((n) => `${n.id}:${n.label}:${n.x}:${n.y}`).join('|')}`;
    if (layoutSyncKeyRef.current === key) return;
    layoutSyncKeyRef.current = key;
    setNodes((current) => syncFlowNodes(current, flowNodesInit));
  }, [flowNodesInit, layoutNodes, workspaceId, setNodes]);

  useEffect(() => {
    const visibleIds = new Set(flowNodesInit.filter((n) => !n.hidden).map((n) => n.id));
    setEdges(toDisplayEdges(allEdges).map((edge) => ({
      ...edge,
      hidden: !visibleIds.has(edge.source) || !visibleIds.has(edge.target),
    })));
  }, [allEdges, flowNodesInit, setEdges]);

  useEffect(() => {
    resetHistory();
    setSelectedId(null);
    setSelectedIds([]);
    setSelectedEdgeId(null);
    viewportRef.current = workspace?.viewport;
    layoutSyncKeyRef.current = '';
  }, [resetHistory, workspaceId]);

  const persist = useCallback(
    async (nds: Node[], eds: Edge[], hiddenNoteIds = workspace?.hiddenNoteIds ?? []) => {
      if (!workspace) return;
      const next = {
        ...workspace,
        nodes: fromFlowNodes(nds),
        edges: fromManualEdges(eds),
        hiddenNoteIds,
        viewport: viewportRef.current ?? workspace.viewport,
      };
      setSaveState('saving');
      saveChainRef.current = saveChainRef.current
        .catch(() => undefined)
        .then(() => saveWorkspace(next));
      try {
        await saveChainRef.current;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    },
    [workspace, saveWorkspace]
  );
  persistRef.current = (nextNodes, nextEdges) => void persist(nextNodes, nextEdges);

  const saveViewport = useCallback(() => {
    if (!workspace) return;
    clearTimeout(viewportTimerRef.current);
    viewportTimerRef.current = setTimeout(() => {
      const next = {
        ...workspace,
        nodes: fromFlowNodes(nodesRef.current),
        edges: fromManualEdges(edgesRef.current),
        hiddenNoteIds: workspace.hiddenNoteIds ?? [],
        viewport: viewportRef.current ?? workspace.viewport,
      };
      void saveWorkspace(next);
    }, 600);
  }, [workspace, saveWorkspace]);

  return {
    notes,
    graph,
    graphFilter,
    setGraphFilter,
    workspace,
    workspaceId,
    workspaceList,
    relations,
    loadWorkspace,
    createLinkedNote,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    saveRelations,
    linkNotes,
    updateNoteMeta,
    setWorkspaceFocusNoteId,
    workspaceFocusNoteId,
    workspaceDisplayMode,
    setWorkspaceDisplayMode,
    selectedId,
    setSelectedId,
    selectedIds,
    setSelectedIds,
    showBoards,
    setShowBoards,
    showAllNotes,
    setShowAllNotes,
    pickerOpen,
    setPickerOpen,
    linkSourceId,
    setLinkSourceId,
    linkMode,
    setLinkMode,
    linkedModalOpen,
    setLinkedModalOpen,
    linkedFromNodeId,
    setLinkedFromNodeId,
    ctxMenu,
    setCtxMenu,
    paneMenu,
    setPaneMenu,
    boardSearch,
    setBoardSearch,
    pickerSearch,
    setPickerSearch,
    selectedEdgeId,
    setSelectedEdgeId,
    relationType,
    setRelationType,
    saveState,
    viewportRef,
    nodesRef,
    edgesRef,
    toggleExpandRef,
    lastDrillKeyRef,
    paneDropRef,
    nodeHandlers,
    nodes,
    setNodes,
    edges,
    setEdges,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    persist,
    saveViewport,
  };
}

export type WorkspaceBoardState = ReturnType<typeof useWorkspaceBoardState>;
