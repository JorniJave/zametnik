/** Действия на холсте: карточки, связи, меню. */
import { useCallback, useMemo } from 'react';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { getAPI } from '../../lib/api';
import type { LinkedNoteFormData } from '../LinkedNoteModal';
import type { RelationType } from '../../types/workspace';
import { RELATION_LABELS, DEFAULT_WORKSPACE_ID } from '../../types/workspace';
import { noteNodeId, parseNoteNodeId } from '../../lib/workspace';
import type { CardData, EdgeData, PaneMenuAction } from './workspaceTypes';
import { COLLAPSED_HEIGHT } from './workspaceTypes';
import type { WorkspaceBoardState } from './useWorkspaceBoardState';
import { buildWorkspaceCanvasProps } from './buildWorkspaceCanvasProps';

/** Функция `useWorkspaceBoardHandlers`. */
export function useWorkspaceBoardHandlers(s: WorkspaceBoardState) {
  /** Функция `openEditorForNode`. */
  const openEditorForNode = (nodeId: string) => {
    s.toggleExpandRef.current(nodeId);
  };

  /** Функция `defaultDropPosition`. */
  const defaultDropPosition = () => ({
    x: 120 + s.nodes.length * 28,
    y: 120 + s.nodes.length * 20,
  });

  /** Функция `takeDropPosition`. */
  const takeDropPosition = () => {
    const pos = s.paneDropRef.current ?? defaultDropPosition();
    s.paneDropRef.current = null;
    return pos;
  };

  /** Функция `addNoteToBoard`. */
  const addNoteToBoard = (noteId: string, at?: { x: number; y: number }) => {
    const note = s.notes[noteId];
    if (!note || !s.workspace) return;
    const id = noteNodeId(noteId);
    const position = at ?? takeDropPosition();
    if (s.nodes.some((n) => n.id === id)) {
      /** Функция `hidden`. */
      const hidden = (s.workspace.hiddenNoteIds ?? []).filter((item) => item !== noteId);
      const next = s.nodes.map((node) =>
        node.id === id ? { ...node, position, hidden: false, selected: true } : { ...node, selected: false }
      );
      s.setNodes(next);
      void s.persist(next, s.edges, hidden);
      s.setSelectedId(id);
      s.setSelectedIds([id]);
      s.setWorkspaceFocusNoteId(noteId);
      s.setWorkspaceDisplayMode('cards');
      return;
    }
    const newNode: Node = {
      id,
      type: 'noteCard',
      position,
      selected: true,
      dragHandle: '.note-card-drag-handle',
      data: {
        label: note.title,
        noteId,
        entityType: note.entityType ?? note.type,
        color: note.color,
        ...s.nodeHandlers,
      },
    };
    const next = [...s.nodes.map((node) => ({ ...node, selected: false })), newNode];
    s.setNodes(next);
    s.pushHistory();
    /** Функция `hidden`. */
    const hidden = (s.workspace.hiddenNoteIds ?? []).filter((item) => item !== noteId);
    void s.persist(next, s.edges, hidden);
    s.setPickerOpen(false);
    s.setSelectedId(id);
    s.setSelectedIds([id]);
    s.setWorkspaceFocusNoteId(noteId);
    s.setWorkspaceDisplayMode('cards');
  };

  /** Функция `drillIntoNote`. */
  const drillIntoNote = (noteId: string) => {
    s.setWorkspaceDisplayMode('cards');
    s.setWorkspaceFocusNoteId(noteId);
    addNoteToBoard(noteId);
  };

  /** Функция `backToOrbit`. */
  const backToOrbit = () => {
    s.setWorkspaceDisplayMode('orbit');
    s.setCtxMenu(null);
    s.setPaneMenu(null);
  };

  /** Функция `focusOrbNode`. */
  const focusOrbNode = (noteId: string) => {
    s.setWorkspaceFocusNoteId(noteId || null);
  };

  /** Функция `handleOrbPaneContextMenu`. */
  const handleOrbPaneContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    s.setCtxMenu(null);
    s.setPaneMenu({ x: event.clientX, y: event.clientY });
  };

  /** Функция `addTextCard`. */
  const addTextCard = (at?: { x: number; y: number }) => {
    const position = at ?? takeDropPosition();
    const id = `text-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'noteCard',
      position,
      selected: true,
      dragHandle: '.note-card-drag-handle',
      data: { label: 'Новая карточка', ...s.nodeHandlers },
      style: { width: 150, height: COLLAPSED_HEIGHT },
    };
    const next = [...s.nodes.map((node) => ({ ...node, selected: false })), newNode];
    s.setNodes(next);
    s.pushHistory();
    void s.persist(next, s.edges);
    s.setSelectedId(id);
    s.setSelectedIds([id]);
    s.setWorkspaceDisplayMode('cards');
  };

  /** Функция `createNoteOnBoard`. */
  const createNoteOnBoard = async () => {
    const title = window.prompt('Название новой заметки');
    if (!title?.trim()) return;
    const pos = takeDropPosition();
    s.setWorkspaceDisplayMode('cards');
    const note = await getAPI().createNote(title.trim());
    await useAppStore.getState().refreshVault();
    addNoteToBoard(note.id, pos);
  };

  /** Функция `removeNodesFromBoard`. */
  const removeNodesFromBoard = (nodeIds: string[]) => {
    if (!nodeIds.length || !s.workspace) return;
    const idSet = new Set(nodeIds);
    const next = s.nodesRef.current.filter((n) => !idSet.has(n.id));
    const nextEdges = s.edgesRef.current.filter((e) => !idSet.has(e.source) && !idSet.has(e.target));
    s.setNodes(next);
    s.setEdges(nextEdges);
    s.pushHistory();
    if (s.selectedId && idSet.has(s.selectedId)) s.setSelectedId(null);
    s.setSelectedIds((prev) => prev.filter((id) => !idSet.has(id)));
    const removedNoteIds = nodeIds
      .map((nodeId) => parseNoteNodeId(nodeId))
      .filter((id): id is string => Boolean(id));
    const hidden = removedNoteIds.length
      ? Array.from(new Set([...(s.workspace.hiddenNoteIds ?? []), ...removedNoteIds]))
      : s.workspace.hiddenNoteIds;
    void s.persist(next, nextEdges, hidden);
  };

  const onConnect = useCallback(
    async (conn: Connection) => {
      const src = conn.source!;
      const tgt = conn.target!;
      const srcNote = parseNoteNodeId(src);
      const tgtNote = parseNoteNodeId(tgt);
      s.pushHistory();
      if (srcNote && tgtNote) {
        const nextRelations = [...s.relations, {
          id: `relation-${Date.now()}`,
          sourceId: srcNote,
          targetId: tgtNote,
          relationType: s.relationType,
        }];
        await s.saveRelations(nextRelations);
        return;
      }
      s.setEdges((eds) => {
        const next = addEdge(
          {
            ...conn,
            id: `manual-${src}-${tgt}-${Date.now()}`,
            label: RELATION_LABELS[s.relationType],
            style: { stroke: 'var(--accent)', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent)' },
            data: { kind: 'manual', relationType: s.relationType, color: 'var(--accent)' } satisfies EdgeData,
          },
          eds
        );
        void s.persist(s.nodes, next);
        return next;
      });
    },
    [s]
  );

  const onNodeDragStart = useCallback(() => {
    s.pushHistory();
  }, [s]);

  const onNodeDragStop = useCallback(() => {
    void s.persist(s.nodesRef.current, s.edgesRef.current);
  }, [s]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const removes = changes.filter((change) => change.type === 'remove');
    if (removes.length) {
      s.pushHistory();
      s.setNodes((current) => applyNodeChanges(changes, current));
      return;
    }
    s.setNodes((current) => applyNodeChanges(changes, current));
  }, [s]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    const removableIds = new Set(
      changes.filter((change) => change.type === 'remove').map((change) => change.id)
    );
    const typedIds = new Set(
      s.edges.filter((edge) => removableIds.has(edge.id) && (edge.data as EdgeData | undefined)?.kind === 'typed')
        .map((edge) => edge.id)
    );
    if (removableIds.size) s.pushHistory();
    if (typedIds.size) void s.saveRelations(s.relations.filter((relation) => !typedIds.has(relation.id)));
    for (const edge of s.edges) {
      if (!removableIds.has(edge.id) || (edge.data as EdgeData | undefined)?.kind !== 'wiki') continue;
      const source = parseNoteNodeId(edge.source);
      const target = parseNoteNodeId(edge.target);
      if (source && target) void useAppStore.getState().unlinkNotes(source, target);
    }
    s.setEdges((current) => {
      const next = applyEdgeChanges(changes, current);
      if (removableIds.size) void s.persist(s.nodes, next);
      return next;
    });
  }, [s]);

  const noteOptions = useMemo(() => {
    const q = s.pickerSearch.toLowerCase().trim();
    return Object.values(s.notes)
      .filter((n) => !q || n.title.toLowerCase().includes(q))
      .sort((a, b) => b.modified - a.modified)
      .slice(0, 100);
  }, [s.notes, s.pickerSearch]);

  /** Функция `removeFromBoard`. */
  const removeFromBoard = (nodeId: string) => {
    removeNodesFromBoard([nodeId]);
  };

  /** Функция `togglePinned`. */
  const togglePinned = (nodeId: string) => {
    s.pushHistory();
    const next = s.nodes.map((node) => {
      if (node.id !== nodeId) return node;
      const data = node.data as CardData;
      const pinned = !data.pinned;
      return { ...node, draggable: !pinned, data: { ...data, pinned } };
    });
    s.setNodes(next);
    void s.persist(next, s.edges);
  };

  /** Функция `handleNodeClick`. */
  const handleNodeClick = async (_: React.MouseEvent, node: Node) => {
    if (s.linkMode && s.linkSourceId) {
      const src = parseNoteNodeId(s.linkSourceId);
      const tgt = parseNoteNodeId(node.id);
      if (src && tgt && src !== tgt) {
        await s.linkNotes(src, tgt);
        s.setLinkMode(false);
        s.setLinkSourceId(null);
        await s.loadWorkspace(s.workspaceId ?? DEFAULT_WORKSPACE_ID);
      } else {
        s.setLinkMode(false);
        s.setLinkSourceId(null);
      }
      return;
    }
    s.setSelectedId(node.id);
    s.setSelectedIds([node.id]);
    s.setCtxMenu(null);
    s.setPaneMenu(null);
    const noteId = parseNoteNodeId(node.id);
    s.setWorkspaceFocusNoteId(noteId ?? null);
  };

  /** Функция `handleContextAction`. */
  const handleContextAction = async (action: string) => {
    if (!s.ctxMenu) return;
    const nodeId = s.ctxMenu.nodeId;
    const noteId = parseNoteNodeId(nodeId);
    s.setCtxMenu(null);
    if (action === 'open' && noteId) openEditorForNode(nodeId);
    else if (action === 'link-new' && noteId) {
      s.setLinkedFromNodeId(nodeId);
      s.setLinkedModalOpen(true);
    } else if (action === 'link-existing' && noteId) {
      s.setLinkSourceId(nodeId);
      s.setLinkMode(true);
    } else if (action === 'text-card') addTextCard();
    else if (action === 'person' && noteId) await s.updateNoteMeta(noteId, { entityType: 'person' });
    else if (action === 'pin') togglePinned(nodeId);
    else if (action === 'delete') removeFromBoard(nodeId);
  };

  /** Функция `handlePaneMenuAction`. */
  const handlePaneMenuAction = (action: PaneMenuAction) => {
    s.setPaneMenu(null);
    if (s.workspaceDisplayMode === 'orbit') {
      if (action === 'add-note') {
        s.setPickerOpen(true);
        return;
      }
      if (action === 'new-note') return;
    }
    if (action === 'text-card') addTextCard();
    else if (action === 'new-note') void createNoteOnBoard();
    else s.setPickerOpen(true);
  };

  /** Функция `handleLinkPick`. */
  const handleLinkPick = async (targetId: string) => {
    if (s.workspaceDisplayMode === 'orbit') {
      const focus = s.workspaceFocusNoteId;
      if (focus && focus !== targetId) await s.linkNotes(focus, targetId);
      s.setLinkSourceId(null);
      s.setPickerOpen(false);
      s.setWorkspaceFocusNoteId(focus && focus !== targetId ? focus : targetId);
      return;
    }
    if (s.linkSourceId) {
      const src = parseNoteNodeId(s.linkSourceId);
      if (src) await s.linkNotes(src, targetId);
      s.setLinkSourceId(null);
      s.setPickerOpen(false);
      await s.loadWorkspace(s.workspaceId ?? DEFAULT_WORKSPACE_ID);
    } else {
      s.setWorkspaceDisplayMode('cards');
      addNoteToBoard(targetId);
    }
  };

  const onNodesDelete = useCallback((deleted: Node[]) => {
    removeNodesFromBoard(deleted.map((n) => n.id));
  }, [s]);

  const onSelectionChange = useCallback(({ nodes: picked }: { nodes: Node[] }) => {
    const ids = picked.map((n) => n.id);
    s.setSelectedIds((prev) => {
      if (ids.length === prev.length && ids.every((id, i) => id === prev[i])) return prev;
      return ids;
    });
    s.setSelectedId((prev) => {
      const next = ids.length === 1 ? ids[0] : ids.length > 1 ? ids[0] : null;
      return prev === next ? prev : next;
    });
  }, [s.setSelectedIds, s.setSelectedId]);

  const updatePaneFlowPosition = useCallback((flowX: number, flowY: number) => {
    s.paneDropRef.current = { x: flowX, y: flowY };
  }, [s.paneDropRef]);

  /** Функция `syncTypedRelationsFromEdges`. */
  const syncTypedRelationsFromEdges = (snapshotEdges: Edge[]) => {
    const visibleTypedIds = new Set(
      s.edges.filter((edge) => (edge.data as EdgeData | undefined)?.kind === 'typed').map((edge) => edge.id)
    );
    const restored = snapshotEdges
      .filter((edge) => (edge.data as EdgeData | undefined)?.kind === 'typed')
      .map((edge) => {
        const data = edge.data as EdgeData;
        return {
          id: edge.id,
          sourceId: parseNoteNodeId(edge.source) ?? edge.source,
          targetId: parseNoteNodeId(edge.target) ?? edge.target,
          relationType: data.relationType ?? 'related',
          label: data.rawLabel,
          color: data.color,
        };
      });
    const restoredIds = new Set(restored.map((relation) => relation.id));
    const unaffected = s.relations.filter(
      (relation) => !visibleTypedIds.has(relation.id) && !restoredIds.has(relation.id)
    );
    void s.saveRelations([...unaffected, ...restored]);
  };

  /** Функция `handleUndo`. */
  const handleUndo = () => {
    const snapshot = s.undo();
    if (snapshot) {
      syncTypedRelationsFromEdges(snapshot.edges);
      void s.persist(snapshot.nodes, snapshot.edges);
    }
  };

  /** Функция `handleRedo`. */
  const handleRedo = () => {
    const snapshot = s.redo();
    if (snapshot) {
      syncTypedRelationsFromEdges(snapshot.edges);
      void s.persist(snapshot.nodes, snapshot.edges);
    }
  };

  const selectedEdge = s.edges.find((edge) => edge.id === s.selectedEdgeId);

  /** Функция `updateSelectedEdge`. */
  const updateSelectedEdge = async (patch: { relationType?: RelationType; label?: string; color?: string }) => {
    if (!selectedEdge) return;
    const data = selectedEdge.data as EdgeData | undefined;
    if (data?.kind === 'wiki') return;
    s.pushHistory();
    if (data?.kind === 'typed') {
      await s.saveRelations(s.relations.map((relation) => relation.id === selectedEdge.id ? {
        ...relation,
        relationType: patch.relationType ?? relation.relationType,
        label: patch.label ?? relation.label,
        color: patch.color ?? relation.color,
      } : relation));
      return;
    }
    const next = s.edges.map((edge) => {
      if (edge.id !== selectedEdge.id) return edge;
      const nextData = {
        kind: 'manual' as const,
        relationType: patch.relationType ?? data?.relationType ?? 'related',
        rawLabel: patch.label ?? data?.rawLabel,
        color: 'var(--accent)',
      } satisfies EdgeData;
      return {
        ...edge,
        label: nextData.rawLabel || RELATION_LABELS[nextData.relationType ?? 'related'],
        style: { ...edge.style, stroke: nextData.color },
        markerEnd: { type: MarkerType.ArrowClosed, color: nextData.color },
        animated: nextData.relationType === 'depends_on',
        data: nextData,
      };
    });
    s.setEdges(next);
    await s.persist(s.nodes, next);
  };

  /** Функция `removeSelectedEdge`. */
  const removeSelectedEdge = async () => {
    if (!selectedEdge) return;
    s.pushHistory();
    /** Функция `kind`. */
    const kind = (selectedEdge.data as EdgeData | undefined)?.kind;
    if (kind === 'typed') {
      await s.saveRelations(s.relations.filter((relation) => relation.id !== selectedEdge.id));
    } else if (kind === 'wiki') {
      const source = parseNoteNodeId(selectedEdge.source);
      const target = parseNoteNodeId(selectedEdge.target);
      if (source && target) await useAppStore.getState().unlinkNotes(source, target);
    } else {
      const next = s.edges.filter((edge) => edge.id !== selectedEdge.id);
      s.setEdges(next);
      await s.persist(s.nodes, next);
    }
    s.setSelectedEdgeId(null);
  };

  /** Функция `createBoard`. */
  const createBoard = async () => {
    const title = window.prompt('Название новой доски');
    if (title?.trim()) await s.createWorkspace(title);
  };

  /** Функция `renameBoard`. */
  const renameBoard = async () => {
    const title = window.prompt('Новое название доски', s.workspace?.title);
    if (title?.trim()) await s.renameWorkspace(title);
  };

  /** Функция `removeBoard`. */
  const removeBoard = async () => {
    if (!s.workspace || s.workspace.id === DEFAULT_WORKSPACE_ID) return;
    if (window.confirm(`Удалить доску «${s.workspace.title}»? Заметки останутся в хранилище.`)) {
      await s.deleteWorkspace(s.workspace.id);
    }
  };

  /** Функция `handleFocusOrbNode`. */
  const handleFocusOrbNode = (noteId: string) => {
    s.setSelectedId(noteNodeId(noteId));
    s.setWorkspaceFocusNoteId(noteId);
  };

  /** Функция `closePicker`. */
  const closePicker = () => {
    s.setPickerOpen(false);
    s.setLinkSourceId(null);
  };

  /** Функция `closeLinkedModal`. */
  const closeLinkedModal = () => {
    s.setLinkedModalOpen(false);
    s.setLinkedFromNodeId(null);
  };

  /** Функция `handleLinkedSubmit`. */
  const handleLinkedSubmit = async (data: LinkedNoteFormData) => {
    const fromId = s.linkedFromNodeId ? parseNoteNodeId(s.linkedFromNodeId) : null;
    if (!fromId) return;
    await s.persist(s.nodes, s.edges);
    await s.createLinkedNote(fromId, data.title, {
      entityType: data.entityType,
      initialBody: data.body || undefined,
      sourceNodeId: s.linkedFromNodeId ?? undefined,
    });
  };

  /** Функция `closeMenus`. */
  const closeMenus = () => {
    s.setCtxMenu(null);
    s.setPaneMenu(null);
  };

  const canvasProps = buildWorkspaceCanvasProps(s, {
    handleNodesChange,
    handleEdgesChange,
    onConnect,
    onNodeDragStart,
    onNodeDragStop,
    handleNodeClick,
    onNodesDelete,
    onSelectionChange,
  });

  return {
    noteOptions,
    selectedEdge,
    canvasProps,
    addNoteToBoard,
    addTextCard,
    drillIntoNote,
    backToOrbit,
    focusOrbNode,
    handleOrbPaneContextMenu,
    updatePaneFlowPosition,
    removeNodesFromBoard,
    closeMenus,
    handleUndo,
    handleRedo,
    handleContextAction,
    handlePaneMenuAction,
    handleLinkPick,
    updateSelectedEdge,
    removeSelectedEdge,
    createBoard,
    renameBoard,
    removeBoard,
    handleFocusOrbNode,
    closePicker,
    closeLinkedModal,
    handleLinkedSubmit,
    persist: s.persist,
  };
}
