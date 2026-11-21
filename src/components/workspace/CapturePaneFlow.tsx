import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { PaneMenuState } from './workspaceTypes';

/** Сохраняет координаты холста для ПКМ-меню (только в ref, без setState) */
export function CapturePaneFlow({
  paneMenu,
  onFlowPosition,
}: {
  paneMenu: PaneMenuState | null;
  onFlowPosition: (flowX: number, flowY: number) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const capturedKeyRef = useRef('');

  useEffect(() => {
    if (!paneMenu) {
      capturedKeyRef.current = '';
      return;
    }
    const key = `${paneMenu.x}:${paneMenu.y}`;
    if (capturedKeyRef.current === key) return;
    capturedKeyRef.current = key;
    const flow = screenToFlowPosition({ x: paneMenu.x, y: paneMenu.y });
    onFlowPosition(flow.x, flow.y);
  }, [paneMenu, onFlowPosition, screenToFlowPosition]);

  return null;
}
