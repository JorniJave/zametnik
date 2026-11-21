import { SelectionMode, type Edge, type Node } from '@xyflow/react';
import { DEFAULT_WORKSPACE_ID } from '../../types/workspace';
import type { WorkspaceBoardState } from './useWorkspaceBoardState';

type HandlerRefs = {
  handleNodesChange: (changes: import('@xyflow/react').NodeChange[]) => void;
  handleEdgesChange: (changes: import('@xyflow/react').EdgeChange[]) => void;
  onConnect: (conn: import('@xyflow/react').Connection) => void;
  onNodeDragStart: () => void;
  onNodeDragStop: () => void;
  handleNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodesDelete: (nodes: Node[]) => void;
  onSelectionChange: (params: { nodes: Node[]; edges: Edge[] }) => void;
};

/** Параметры React Flow для холста карточек */
export function buildWorkspaceCanvasProps(s: WorkspaceBoardState, h: HandlerRefs) {
  return {
    key: s.workspaceId ?? DEFAULT_WORKSPACE_ID,
    nodes: s.nodes,
    edges: s.edges,
    onNodesChange: h.handleNodesChange,
    onEdgesChange: h.handleEdgesChange,
    onConnect: h.onConnect,
    onNodeDragStart: h.onNodeDragStart,
    onNodeDragStop: h.onNodeDragStop,
    onNodesDelete: h.onNodesDelete,
    onSelectionChange: h.onSelectionChange,
    fitView: !s.workspace?.viewport,
    selectionOnDrag: true,
    selectionMode: SelectionMode.Partial,
    panOnDrag: [1] as [number],
    multiSelectionKeyCode: 'Shift' as const,
    zoomActivationKeyCode: null,
    panOnScroll: false,
    deleteKeyCode: ['Backspace', 'Delete'],
    connectionRadius: 36,
    onNodeClick: h.handleNodeClick,
    onEdgeClick: (_: React.MouseEvent, edge: Edge) => {
      s.setSelectedId(null);
      s.setSelectedEdgeId(edge.id);
    },
    onPaneClick: () => {
      s.setSelectedId(null);
      s.setSelectedEdgeId(null);
      s.setCtxMenu(null);
      s.setPaneMenu(null);
      if (s.linkMode) {
        s.setLinkMode(false);
        s.setLinkSourceId(null);
      }
    },
    onNodeContextMenu: (e: MouseEvent | React.MouseEvent, node: Node) => {
      e.preventDefault();
      e.stopPropagation();
      s.setPaneMenu(null);
      s.setCtxMenu({ x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY, nodeId: node.id });
    },
    onPaneContextMenu: (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault();
      s.setCtxMenu(null);
      s.setPaneMenu({ x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY });
    },
    defaultViewport: s.workspace?.viewport,
    onMoveStart: () => {
      s.setCtxMenu(null);
      s.setPaneMenu(null);
    },
    onMoveEnd: (_: unknown, viewport: import('@xyflow/react').Viewport) => {
      s.viewportRef.current = viewport;
      s.saveViewport();
    },
    nodesDraggable: true,
    nodesConnectable: true,
    elementsSelectable: true,
    zoomOnScroll: true,
    proOptions: { hideAttribution: true },
  };
}
