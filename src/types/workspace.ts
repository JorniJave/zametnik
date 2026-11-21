import type { NoteMeta } from './index';

export type EntityType = NoteMeta['type'] | 'person';

export type RelationType =
  | 'related'
  | 'part_of'
  | 'depends_on'
  | 'assigned_to'
  | 'blocks'
  | 'repeats';

export interface WorkspaceNodeLayout {
  id: string;
  kind: 'note' | 'text';
  noteId?: string;
  label?: string;
  entityType?: EntityType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  pinned?: boolean;
  collapsed?: boolean;
}

export interface WorkspaceEdge {
  id: string;
  source: string;
  target: string;
  kind: 'wiki' | 'manual' | 'typed';
  relationType?: RelationType;
  color?: string;
  label?: string;
}

export interface WorkspaceData {
  id: string;
  title: string;
  schemaVersion: number;
  nodes: WorkspaceNodeLayout[];
  edges: WorkspaceEdge[];
  hiddenNoteIds?: string[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface TypedRelation {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  label?: string;
  color?: string;
}

export const RELATION_LABELS: Record<RelationType, string> = {
  related: 'Связано с',
  part_of: 'Часть проекта',
  depends_on: 'Зависит от',
  assigned_to: 'Назначено на',
  blocks: 'Блокирует',
  repeats: 'Повторяется',
};

export const DEFAULT_WORKSPACE_ID = 'knowledge';
