import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

/** Центрирует выбранный узел после перехода из графа-кружков */
export function FitSelectedNode({ nodeId }: { nodeId: string | null }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!nodeId) return;
    const timer = window.setTimeout(() => {
      void fitView({ nodes: [{ id: nodeId }], padding: 0.45, duration: 350 });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [nodeId, fitView]);

  return null;
}
