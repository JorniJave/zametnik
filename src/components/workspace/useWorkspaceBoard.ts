import { useEffect, useRef } from 'react';
import { noteNodeId } from '../../lib/workspace';
import { useWorkspaceBoardState } from './useWorkspaceBoardState';
import { useWorkspaceBoardHandlers } from './useWorkspaceBoardHandlers';

/** Сборка состояния и обработчиков «Базы знаний» */
export function useWorkspaceBoard() {
  const state = useWorkspaceBoardState();
  const handlers = useWorkspaceBoardHandlers(state);
  const addNoteRef = useRef(handlers.addNoteToBoard);
  addNoteRef.current = handlers.addNoteToBoard;

  useEffect(() => {
    if (state.workspaceDisplayMode !== 'cards' || !state.workspaceFocusNoteId || !state.workspace) {
      if (state.workspaceDisplayMode === 'orbit') state.lastDrillKeyRef.current = '';
      return;
    }
    const drillKey = `${state.workspace.id}:${state.workspaceFocusNoteId}`;
    if (state.lastDrillKeyRef.current === drillKey) return;
    state.lastDrillKeyRef.current = drillKey;
    const nodeId = noteNodeId(state.workspaceFocusNoteId);
    const onBoard = state.nodesRef.current.some((node) => node.id === nodeId);
    /** Функция `hidden`. */
    const hidden = (state.workspace.hiddenNoteIds ?? []).includes(state.workspaceFocusNoteId);
    if (!onBoard || hidden) addNoteRef.current(state.workspaceFocusNoteId);
    else state.setSelectedId(nodeId);
  }, [state.workspaceDisplayMode, state.workspaceFocusNoteId, state.workspace?.id]);

  return {
    notes: state.notes,
    workspace: state.workspace,
    workspaceId: state.workspaceId,
    workspaceList: state.workspaceList,
    workspaceFocusNoteId: state.workspaceFocusNoteId,
    workspaceDisplayMode: state.workspaceDisplayMode,
    nodes: state.nodes,
    edges: state.edges,
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    showBoards: state.showBoards,
    setShowBoards: state.setShowBoards,
    showAllNotes: state.showAllNotes,
    setShowAllNotes: state.setShowAllNotes,
    graphFilter: state.graphFilter,
    setGraphFilter: state.setGraphFilter,
    boardSearch: state.boardSearch,
    setBoardSearch: state.setBoardSearch,
    relationType: state.relationType,
    setRelationType: state.setRelationType,
    linkMode: state.linkMode,
    setLinkMode: state.setLinkMode,
    linkSourceId: state.linkSourceId,
    setLinkSourceId: state.setLinkSourceId,
    saveState: state.saveState,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    ctxMenu: state.ctxMenu,
    paneMenu: state.paneMenu,
    pickerOpen: state.pickerOpen,
    pickerSearch: state.pickerSearch,
    setPickerSearch: state.setPickerSearch,
    linkedModalOpen: state.linkedModalOpen,
    linkedFromNodeId: state.linkedFromNodeId,
    setLinkedModalOpen: state.setLinkedModalOpen,
    setLinkedFromNodeId: state.setLinkedFromNodeId,
    setPickerOpen: state.setPickerOpen,
    setWorkspaceDisplayMode: state.setWorkspaceDisplayMode,
    createLinkedNote: state.createLinkedNote,
    loadWorkspace: state.loadWorkspace,
    ...handlers,
  };
}
