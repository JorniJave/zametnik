import { useCallback, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';

const MAX_HISTORY = 50;

/** Функция `cloneState`. */
function cloneState(nodes: Node[], edges: Edge[]) {
  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: { ...node.data },
      style: node.style ? { ...node.style } : undefined,
    })),
    edges: edges.map((edge) => ({
      ...edge,
      data: edge.data ? { ...edge.data } : undefined,
      style: edge.style ? { ...edge.style } : undefined,
    })),
  };
}

/** Функция `useCanvasHistory`. */
export function useCanvasHistory(
  nodes: Node[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
) {
  const past = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const future = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  const resetHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    syncFlags();
  }, [syncFlags]);

  const pushHistory = useCallback((snapshotNodes = nodes, snapshotEdges = edges) => {
    past.current.push(cloneState(snapshotNodes, snapshotEdges));
    if (past.current.length > MAX_HISTORY) past.current.shift();
    future.current = [];
    syncFlags();
  }, [nodes, edges, syncFlags]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return null;
    future.current.push(cloneState(nodes, edges));
    setNodes(prev.nodes);
    setEdges(prev.edges);
    syncFlags();
    return prev;
  }, [nodes, edges, setNodes, setEdges, syncFlags]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return null;
    past.current.push(cloneState(nodes, edges));
    setNodes(next.nodes);
    setEdges(next.edges);
    syncFlags();
    return next;
  }, [nodes, edges, setNodes, setEdges, syncFlags]);

  return { pushHistory, undo, redo, resetHistory, canUndo, canRedo };
}
