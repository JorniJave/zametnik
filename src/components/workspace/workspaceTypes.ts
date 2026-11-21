import type { RelationType, WorkspaceEdge } from '../../types/workspace';
import type { EntityType } from '../../types/workspace';

/** Данные узла-карточки на холсте React Flow */
export type CardData = {
  label: string;
  color?: string;
  noteId?: string;
  entityType?: string;
  expanded?: boolean;
  pinned?: boolean;
  onLabelChange?: (nodeId: string, label: string) => void;
  onToggleExpand?: (nodeId: string) => void;
  onResizeEnd?: (nodeId: string, width: number, height: number) => void;
  onResize?: (nodeId: string, width: number, height: number) => void;
  onSetType?: (nodeId: string, type: EntityType) => void;
  onSetColor?: (nodeId: string, color: string) => void;
  onLink?: (nodeId: string) => void;
  onLinkedNote?: (nodeId: string) => void;
};

export type EdgeData = {
  kind: WorkspaceEdge['kind'];
  relationType?: RelationType;
  rawLabel?: string;
  color?: string;
};

export type PaneMenuState = { x: number; y: number; flowX?: number; flowY?: number };

export type PaneMenuAction = 'text-card' | 'add-note' | 'new-note';
export type NodeMenuState = { x: number; y: number; nodeId: string };


export const COLLAPSED_HEIGHT = 44;
export const EXPANDED_MIN_WIDTH = 300;
export const EXPANDED_MIN_HEIGHT = 260;
