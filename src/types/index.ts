import type { EntityType, RelationType, WorkspaceData, TypedRelation } from './workspace';

export type { EntityType, RelationType, WorkspaceData, WorkspaceNodeLayout, WorkspaceEdge, TypedRelation } from './workspace';

export interface NoteMeta {
  id: string;
  path: string;
  title: string;
  type: 'daily' | 'task' | 'project' | 'note' | 'week' | 'canvas';
  entityType?: EntityType;
  uuid?: string;
  color?: string;
  links: string[];
  tasks: TaskItem[];
  tags: string[];
  modified: number;
}

export interface TaskItem {
  text: string;
  done: boolean;
  line: number;
}

export interface Backlink {
  sourceId: string;
  sourceTitle: string;
  sourcePath: string;
  context: string;
}

export interface GraphNode {
  id: string;
  title: string;
  type: NoteMeta['type'];
  val?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  relationType?: RelationType;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface CanvasNode {
  id: string;
  type: 'note' | 'text' | 'group';
  noteId?: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  label?: string;
}

export interface CanvasData {
  id: string;
  title: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface VaultSettings {
  vaultPath: string;
  theme: 'dark' | 'light';
  dailyNoteTemplate: string;
  weekStartsOn: 0 | 1;
  autoOpenDaily: boolean;
  remindersEnabled: boolean;
  defaultReminderMinutes: number;
  launchAtLogin: boolean;
}

import type { PlanningData } from './planning';

export interface VaultState {
  notes: Record<string, NoteMeta>;
  graph: GraphData;
  settings: VaultSettings;
  planning: PlanningData;
}

export interface NoteContent {
  id: string;
  path: string;
  title: string;
  content: string;
  meta: NoteMeta;
}

export interface ZametnikAPI {
  selectVault: () => Promise<string | null>;
  createDefaultVault: () => Promise<string>;
  getVaultPath: () => Promise<string | null>;
  loadVault: () => Promise<VaultState>;
  readNote: (id: string) => Promise<NoteContent | null>;
  saveNote: (id: string, content: string) => Promise<NoteContent>;
  createNote: (title: string, folder?: string, content?: string) => Promise<NoteContent>;
  deleteNote: (id: string) => Promise<void>;
  getBacklinks: (id: string) => Promise<Backlink[]>;
  getLocalGraph: (id: string, depth?: number) => Promise<GraphData>;
  ensureDailyNote: (date: string) => Promise<NoteContent>;
  ensureWeekNote: (weekLabel: string, days: string[]) => Promise<NoteContent>;
  readCanvas: (id: string) => Promise<CanvasData | null>;
  saveCanvas: (canvas: CanvasData) => Promise<void>;
  listCanvases: () => Promise<{ id: string; title: string }[]>;
  searchNotes: (query: string) => Promise<NoteMeta[]>;
  getSettings: () => Promise<VaultSettings>;
  saveSettings: (settings: Partial<VaultSettings>) => Promise<VaultSettings>;
  loadPlanning: () => Promise<PlanningData>;
  savePlanning: (data: PlanningData) => Promise<PlanningData>;
  pickExcelFile: () => Promise<string | null>;
  readExcelFile: () => Promise<string | null>;
  saveExcelFile: (defaultName: string, base64: string) => Promise<string | null>;
  showNotification: (title: string, body: string) => Promise<void>;
  setLaunchAtLogin: (enabled: boolean) => Promise<void>;
  readWorkspace: (id: string) => Promise<WorkspaceData | null>;
  saveWorkspace: (workspace: WorkspaceData) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  listWorkspaces: () => Promise<{ id: string; title: string }[]>;
  loadRelations: () => Promise<TypedRelation[]>;
  saveRelations: (relations: TypedRelation[]) => Promise<void>;
}

declare global {
  interface Window {
    zametnik: ZametnikAPI;
  }
}

export type { PlanningData, StructuredTask, CalendarEvent, ScheduleTemplate, ScheduleSlot, ScheduleCombo, ReminderItem } from './planning';
