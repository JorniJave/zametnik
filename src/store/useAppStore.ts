import { create } from 'zustand';
import type {
  NoteContent,
  Backlink,
  GraphData,
  CanvasData,
  VaultSettings,
  NoteMeta,
  WorkspaceData,
  TypedRelation,
} from '../types';
import type { EntityType } from '../types/workspace';
import { DEFAULT_WORKSPACE_ID } from '../types/workspace';
import { getAPI } from '../lib/api';
import {
  formatDate,
  getWeekDays,
  getWeekLabel,
  getWeekStart,
  titleToId,
} from '../lib/parser';
import { createId, mergeTasks, tasksFromNotes, computeTaskStatus } from '../lib/planning';
import { toggleTaskLineInNote, buildGraph, getBacklinks, getLocalGraph } from '../lib/parser';
import { ensureUuid } from '../lib/frontmatter';
import { defaultWorkspace, mergeCanvasesIntoWorkspace, placeNodeNear } from '../lib/workspace';
import { buildLinkedNoteContent, applyWikiLink, removeWikiLink, noteMetaPatch } from '../lib/noteCommands';
import type { CreateLinkedNoteOptions } from '../lib/noteCommands';
import { contentHash, logObjectChange } from '../lib/syncBridge';
import type { PlanningData, ScheduleTemplate, StructuredTask } from '../types/planning';
import { EMPTY_PLANNING } from '../types/planning';

export type ViewMode =
  | 'today'
  | 'calendar'
  | 'tasks'
  | 'schedules'
  | 'workspace'
  | 'notes'
  | 'graph'
  | 'canvas'
  | 'settings';

/** Режим «Базы знаний»: сначала кружки связей, потом карточки на холсте */
export type WorkspaceDisplayMode = 'orbit' | 'cards';

interface AppState {
  initialized: boolean;
  loading: boolean;
  vaultPath: string | null;
  notes: Record<string, NoteMeta>;
  graph: GraphData;
  settings: VaultSettings | null;
  planning: PlanningData;
  activeNoteId: string | null;
  activeNote: NoteContent | null;
  backlinks: Backlink[];
  localGraph: GraphData;
  viewMode: ViewMode;
  sidebarSection: 'week' | 'tree' | 'search';
  searchQuery: string;
  searchResults: NoteMeta[];
  graphFilter: 'all' | 'tasks' | 'projects' | 'week';
  activeCanvasId: string | null;
  activeCanvas: CanvasData | null;
  canvasList: { id: string; title: string }[];
  workspaceId: string | null;
  workspace: WorkspaceData | null;
  workspaceList: { id: string; title: string }[];
  relations: TypedRelation[];
  saveStatus: 'saved' | 'saving' | 'unsaved';
  rightPanelOpen: boolean;
  workspaceFocusNoteId: string | null;
  workspaceDisplayMode: WorkspaceDisplayMode;

  init: () => Promise<void>;
  openVault: (createDefault?: boolean) => Promise<void>;
  refreshVault: () => Promise<void>;
  openNote: (id: string) => Promise<void>;
  saveActiveNote: (content: string) => Promise<void>;
  ingestSavedNote: (saved: NoteContent) => void;
  createNote: (title: string, folder?: string) => Promise<void>;
  openToday: () => Promise<void>;
  openWeek: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (q: string) => Promise<void>;
  setGraphFilter: (f: AppState['graphFilter']) => void;
  loadCanvas: (id: string) => Promise<void>;
  refreshCanvasList: () => Promise<void>;
  createCanvas: (title: string) => Promise<string>;
  saveCanvas: (canvas: CanvasData) => Promise<void>;
  loadWorkspace: (id: string) => Promise<void>;
  refreshWorkspaceList: () => Promise<void>;
  saveWorkspace: (workspace: WorkspaceData) => Promise<void>;
  createWorkspace: (title: string) => Promise<string>;
  renameWorkspace: (title: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  saveRelations: (relations: TypedRelation[]) => Promise<void>;
  openWorkspaceNote: (id: string) => Promise<void>;
  createLinkedNote: (
    fromNoteId: string,
    title: string,
    opts?: CreateLinkedNoteOptions & { sourceNodeId?: string }
  ) => Promise<void>;
  linkNotes: (sourceId: string, targetId: string) => Promise<void>;
  unlinkNotes: (sourceId: string, targetId: string) => Promise<void>;
  updateNoteMeta: (
    noteId: string,
    patch: { entityType?: EntityType; color?: string; title?: string }
  ) => Promise<void>;
  saveWorkspaceLayout: (nodes: WorkspaceData['nodes'], edges?: WorkspaceData['edges']) => Promise<void>;
  setNoteEntityType: (noteId: string, entityType: EntityType) => Promise<void>;
  updateSettings: (s: Partial<VaultSettings>) => Promise<void>;
  setRightPanelOpen: (open: boolean) => void;
  setWorkspaceFocusNoteId: (id: string | null) => void;
  setWorkspaceDisplayMode: (mode: WorkspaceDisplayMode) => void;
  savePlanning: (data: PlanningData) => Promise<void>;
  saveSchedules: (schedules: ScheduleTemplate[]) => Promise<void>;
  saveCombos: (combos: import('../types/planning').ScheduleCombo[]) => Promise<void>;
  addTask: (partial: Partial<StructuredTask> & { title: string }) => Promise<void>;
  updateTask: (id: string, partial: Partial<StructuredTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  hideGraphNote: (id: string) => Promise<void>;
}

/** Функция `structuredTasksOnly`. */
function structuredTasksOnly(tasks: StructuredTask[]): StructuredTask[] {
  return tasks.filter((t) => !t.noteId);
}

/** Функция `persistPlanning`. */
async function persistPlanning(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
  data: PlanningData
) {
  const api = getAPI();
  const toSave = { ...data, tasks: structuredTasksOnly(data.tasks) };
  const saved = await api.savePlanning(toSave);
  const fromNotes = tasksFromNotes(get().notes);
  set({ planning: { ...saved, tasks: mergeTasks(saved.tasks, fromNotes) } });
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  loading: false,
  vaultPath: null,
  notes: {},
  graph: { nodes: [], links: [] },
  settings: null,
  planning: { ...EMPTY_PLANNING },
  activeNoteId: null,
  activeNote: null,
  backlinks: [],
  localGraph: { nodes: [], links: [] },
  viewMode: 'today',
  sidebarSection: 'tree',
  searchQuery: '',
  searchResults: [],
  graphFilter: 'all',
  activeCanvasId: null,
  activeCanvas: null,
  canvasList: [],
  workspaceId: null,
  workspace: null,
  workspaceList: [],
  relations: [],
  saveStatus: 'saved',
  rightPanelOpen: true,
  workspaceFocusNoteId: null,
  workspaceDisplayMode: 'orbit',

  init: async () => {
    const api = getAPI();
    set({ loading: true });
    try {
      let path = await api.getVaultPath();
      const isElectron = typeof window !== 'undefined' && Boolean(window.zametnik);
      if (!path && isElectron) {
        path = await api.createDefaultVault();
      }
      if (path) {
        const vault = await api.loadVault();
        const fromNotes = tasksFromNotes(vault.notes);
        set({
          vaultPath: path,
          notes: vault.notes,
          graph: vault.graph,
          settings: vault.settings,
          planning: {
            ...vault.planning,
            tasks: mergeTasks(vault.planning.tasks, fromNotes),
          },
          viewMode: 'today',
        });
        document.documentElement.classList.toggle('dark', vault.settings.theme === 'dark');
        document.body.classList.toggle('dark', vault.settings.theme === 'dark');
        if (vault.settings.launchAtLogin) {
          await api.setLaunchAtLogin(true);
        }
        const today = formatDate(new Date());
        const note = await api.ensureDailyNote(today);
        set({ activeNoteId: note.id, saveStatus: 'saved' });
        get().ingestSavedNote(note);
        set({ initialized: true, loading: false });
      } else {
        set({ initialized: true, loading: false });
      }
    } catch (err) {
      console.error('init failed', err);
      set({ initialized: true, loading: false });
    }
  },

  openVault: async (createDefault = false) => {
    const api = getAPI();
    set({ loading: true });
    const path = createDefault ? await api.createDefaultVault() : await api.selectVault();
    if (!path) {
      set({ loading: false });
      return;
    }
    const vault = await api.loadVault();
    const fromNotes = tasksFromNotes(vault.notes);
    set({
      vaultPath: path,
      notes: vault.notes,
      graph: vault.graph,
      settings: vault.settings,
      planning: {
        ...vault.planning,
        tasks: mergeTasks(vault.planning.tasks, fromNotes),
      },
      loading: false,
      viewMode: 'today',
    });
    await get().openToday();
  },

  refreshVault: async () => {
    const api = getAPI();
    const vault = await api.loadVault();
    const fromNotes = tasksFromNotes(vault.notes);
    set({
      notes: vault.notes,
      graph: vault.graph,
      planning: {
        ...vault.planning,
        tasks: mergeTasks(vault.planning.tasks, fromNotes),
      },
    });
    const { activeNoteId } = get();
    if (activeNoteId) {
      const note = await api.readNote(activeNoteId);
      const backlinks = await api.getBacklinks(activeNoteId);
      const localGraph = await api.getLocalGraph(activeNoteId, 1);
      set({ activeNote: note, backlinks, localGraph });
    }
  },

  openNote: async (id: string) => {
    const api = getAPI();
    let note = await api.readNote(id);
    if (!note) {
      const title = Object.values(get().notes).find((n) => n.id === id)?.title ?? id;
      note = await api.createNote(title);
      await get().refreshVault();
    }
    const backlinks = await api.getBacklinks(id);
    const localGraph = await api.getLocalGraph(id, 1);
    set({
      activeNoteId: id,
      activeNote: note,
      backlinks,
      localGraph,
      saveStatus: 'saved',
    });
  },

  saveActiveNote: async (content: string) => {
    const { activeNoteId } = get();
    if (!activeNoteId) return;
    set({ saveStatus: 'saving' });
    const api = getAPI();
    const withUuid = ensureUuid(content);
    const saved = await api.saveNote(activeNoteId, withUuid);
    get().ingestSavedNote(saved);
  },

  ingestSavedNote: (saved) => {
    const state = get();
    const notes = { ...state.notes, [saved.meta.id]: saved.meta };
    const planning = {
      ...state.planning,
      tasks: mergeTasks(structuredTasksOnly(state.planning.tasks), tasksFromNotes(notes)),
    };
    const same = state.activeNoteId === saved.id;
    set({
      notes,
      graph: buildGraph(notes),
      planning,
      activeNote: same ? saved : state.activeNote,
      backlinks: same ? getBacklinks(saved.id, notes) : state.backlinks,
      localGraph: same ? getLocalGraph(saved.id, notes, 1) : state.localGraph,
      saveStatus: 'saved',
    });
  },

  createNote: async (title: string, folder?: string) => {
    const api = getAPI();
    const note = await api.createNote(title, folder);
    await get().refreshVault();
    await get().openNote(note.id);
  },

  openToday: async () => {
    const api = getAPI();
    const today = formatDate(new Date());
    const note = await api.ensureDailyNote(today);
    set({ activeNoteId: note.id, viewMode: 'today', saveStatus: 'saved' });
    get().ingestSavedNote(note);
  },

  openWeek: async () => {
    const api = getAPI();
    const today = new Date();
    const weekStartsOn = get().settings?.weekStartsOn ?? 1;
    const start = getWeekStart(today, weekStartsOn);
    const days = getWeekDays(start).map(formatDate);
    const weekLabel = getWeekLabel(today, weekStartsOn);
    const note = await api.ensureWeekNote(weekLabel, days);
    await get().refreshVault();
    await get().openNote(note.id);
  },

  setViewMode: (mode) => {
    if (mode === 'graph' || mode === 'canvas') {
      set({ viewMode: 'workspace' });
      if (!get().workspace) void get().loadWorkspace(DEFAULT_WORKSPACE_ID);
      return;
    }
    set({ viewMode: mode });
  },

  setSearchQuery: async (q) => {
    set({ searchQuery: q });
    if (!q.trim()) {
      set({ searchResults: [] });
      return;
    }
    const api = getAPI();
    const results = await api.searchNotes(q);
    set({ searchResults: results });
  },

  setGraphFilter: (f) => set({ graphFilter: f }),

  loadCanvas: async (id: string) => {
    const api = getAPI();
    let canvas = await api.readCanvas(id);
    if (!canvas && id === 'week-plan') {
      canvas = {
        id: 'week-plan',
        title: 'План недели',
        nodes: [],
        edges: [],
      };
    }
    const list = await api.listCanvases();
    set({ activeCanvasId: id, activeCanvas: canvas, canvasList: list, viewMode: 'canvas' });
  },

  refreshCanvasList: async () => {
    const api = getAPI();
    const list = await api.listCanvases();
    set({ canvasList: list });
  },

  createCanvas: async (title: string) => {
    const api = getAPI();
    const safe = title.trim() || 'Новая доска';
    const baseId = titleToId(safe).replace(/\s+/g, '-') || `canvas-${Date.now()}`;
    let id = baseId;
    const existing = await api.listCanvases();
    let n = 1;
    while (existing.some((c) => c.id === id)) {
      id = `${baseId}-${n++}`;
    }
    const canvas: CanvasData = { id, title: safe, nodes: [], edges: [] };
    await api.saveCanvas(canvas);
    const list = await api.listCanvases();
    set({ canvasList: list, activeCanvasId: id, activeCanvas: canvas, viewMode: 'canvas' });
    return id;
  },

  saveCanvas: async (canvas: CanvasData) => {
    const api = getAPI();
    await api.saveCanvas(canvas);
    logObjectChange(canvas.id, 'canvas', 'upsert', contentHash(JSON.stringify(canvas)));
    const list = await api.listCanvases();
    set({ activeCanvas: canvas, canvasList: list });
  },

  loadWorkspace: async (id: string) => {
    const api = getAPI();
    let ws = await api.readWorkspace(id);
    const canvasList = await api.listCanvases();
    /** Функция `canvases`. */
    const canvases = (
      await Promise.all(canvasList.map((c) => api.readCanvas(c.id)))
    ).filter((c): c is NonNullable<typeof c> => Boolean(c));

    if (!ws && id === DEFAULT_WORKSPACE_ID) {
      ws = mergeCanvasesIntoWorkspace(canvases, null);
      await api.saveWorkspace(ws);
    } else if (ws && id === DEFAULT_WORKSPACE_ID && canvases.length > 0 && ws.nodes.length === 0) {
      ws = mergeCanvasesIntoWorkspace(canvases, ws);
      await api.saveWorkspace(ws);
    } else if (!ws) {
      /** Функция `fallbackId`. */
      const fallbackId = (await api.listWorkspaces())[0]?.id ?? DEFAULT_WORKSPACE_ID;
      if (fallbackId !== id) {
        await get().loadWorkspace(fallbackId);
        return;
      }
      ws = defaultWorkspace();
      await api.saveWorkspace(ws);
    }

    const list = await api.listWorkspaces();
    const relations = await api.loadRelations();
    set({
      workspaceId: id,
      workspace: ws,
      workspaceList: list.length ? list : ws ? [{ id: ws.id, title: ws.title }] : [],
      relations,
      viewMode: 'workspace',
    });
  },

  refreshWorkspaceList: async () => {
    const api = getAPI();
    const list = await api.listWorkspaces();
    set({ workspaceList: list });
  },

  saveWorkspace: async (workspace: WorkspaceData) => {
    const api = getAPI();
    set({ workspace });
    await api.saveWorkspace(workspace);
    logObjectChange(workspace.id, 'workspace', 'upsert', contentHash(JSON.stringify(workspace)));
    const list = await api.listWorkspaces();
    set({ workspace, workspaceList: list });
  },

  createWorkspace: async (title) => {
    const safeTitle = title.trim() || 'Новая доска';
    const id = `workspace-${Date.now()}`;
    const workspace: WorkspaceData = { ...defaultWorkspace(safeTitle), id };
    await get().saveWorkspace(workspace);
    set({ workspaceId: id, workspace, viewMode: 'workspace' });
    return id;
  },

  renameWorkspace: async (title) => {
    const { workspace } = get();
    const safeTitle = title.trim();
    if (!workspace || !safeTitle) return;
    await get().saveWorkspace({ ...workspace, title: safeTitle });
  },

  deleteWorkspace: async (id) => {
    if (id === DEFAULT_WORKSPACE_ID) return;
    const api = getAPI();
    await api.deleteWorkspace(id);
    await get().loadWorkspace(DEFAULT_WORKSPACE_ID);
  },

  saveRelations: async (relations) => {
    const api = getAPI();
    await api.saveRelations(relations);
    set({ relations });
  },

  openWorkspaceNote: async (id: string) => {
    const api = getAPI();
    const note = await api.readNote(id);
    if (!note) return;
    const backlinks = await api.getBacklinks(id);
    const localGraph = await api.getLocalGraph(id, 1);
    set({ activeNoteId: id, activeNote: note, backlinks, localGraph, saveStatus: 'saved' });
  },

  createLinkedNote: async (fromNoteId, title, opts) => {
    const api = getAPI();
    const source = await api.readNote(fromNoteId);
    if (!source) return;
    const body = buildLinkedNoteContent(title, source.title, opts);
    const created = await api.createNote(title, opts?.folder, body);
    const linked = applyWikiLink(source.content, title);
    await api.saveNote(fromNoteId, linked);
    logObjectChange(created.id, 'note', 'upsert', contentHash(body));

    const { workspace, workspaceId } = get();
    if (workspace && opts?.sourceNodeId) {
      const nodes = placeNodeNear(
        workspace.nodes,
        opts.sourceNodeId,
        created.id,
        title,
        opts.entityType
      );
      await get().saveWorkspaceLayout(nodes);
    }

    await get().refreshVault();
    await get().loadWorkspace(workspaceId ?? DEFAULT_WORKSPACE_ID);
  },

  linkNotes: async (sourceId, targetId) => {
    const api = getAPI();
    const source = await api.readNote(sourceId);
    const target = get().notes[targetId];
    if (!source || !target) return;
    const linked = applyWikiLink(source.content, target.title);
    await api.saveNote(sourceId, linked);
    await get().refreshVault();
  },

  unlinkNotes: async (sourceId, targetId) => {
    const api = getAPI();
    const source = await api.readNote(sourceId);
    const target = get().notes[targetId];
    if (!source || !target) return;
    const unlinked = removeWikiLink(source.content, target.title);
    await api.saveNote(sourceId, unlinked);
    await get().refreshVault();
  },

  updateNoteMeta: async (noteId, patch) => {
    const api = getAPI();
    const note = await api.readNote(noteId);
    if (!note) return;
    let content = note.content;
    if (patch.entityType !== undefined || patch.color !== undefined) {
      content = noteMetaPatch(content, {
        entityType: patch.entityType,
        color: patch.color,
      });
    }
    if (patch.title && patch.title !== note.title) {
      const lines = content.split('\n');
      if (lines[0]?.startsWith('# ')) lines[0] = `# ${patch.title}`;
      content = lines.join('\n');
    }
    await api.saveNote(noteId, content);
    await get().refreshVault();
  },

  saveWorkspaceLayout: async (nodes, edges) => {
    const { workspace } = get();
    if (!workspace) return;
    const next: WorkspaceData = {
      ...workspace,
      nodes,
      edges: edges ?? workspace.edges,
    };
    await get().saveWorkspace(next);
  },

  setNoteEntityType: async (noteId, entityType) => {
    await get().updateNoteMeta(noteId, { entityType });
  },

  updateSettings: async (partial) => {
    const api = getAPI();
    const settings = await api.saveSettings(partial);
    set({ settings });
    if (partial.theme) {
      document.documentElement.classList.toggle('dark', partial.theme === 'dark');
      document.body.classList.toggle('dark', partial.theme === 'dark');
    }
    if (partial.launchAtLogin !== undefined) {
      await api.setLaunchAtLogin(partial.launchAtLogin);
    }
  },

  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setWorkspaceFocusNoteId: (id) => set({ workspaceFocusNoteId: id }),
  setWorkspaceDisplayMode: (mode) => set({ workspaceDisplayMode: mode }),

  savePlanning: async (data) => {
    await persistPlanning(set, get, data);
  },

  saveSchedules: async (schedules) => {
    const { planning } = get();
    await persistPlanning(set, get, { ...planning, schedules });
  },

  saveCombos: async (combos) => {
    const { planning } = get();
    await persistPlanning(set, get, { ...planning, combos });
  },

  addTask: async (partial) => {
    const { planning } = get();
    const today = formatDate(new Date());
    const now = Date.now();
    const dueDate = partial.dueDate;
    const task: StructuredTask = {
      id: createId(),
      title: partial.title,
      done: false,
      status: partial.status ?? computeTaskStatus({ done: false, dueDate }, today),
      dueDate,
      dueTime: partial.dueTime,
      priority: partial.priority ?? 'normal',
      project: partial.project,
      tags: partial.tags ?? [],
      noteId: partial.noteId,
      reminderMinutes: partial.reminderMinutes,
      createdAt: now,
      updatedAt: now,
    };
    await persistPlanning(set, get, { ...planning, tasks: [...planning.tasks, task] });
  },

  toggleTask: async (id) => {
    const { planning } = get();
    const task = planning.tasks.find((t) => t.id === id);
    if (!task) return;

    if (task.noteId) {
      const api = getAPI();
      const note = await api.readNote(task.noteId);
      if (!note) return;
      const line = Number(id.split(':').pop());
      if (Number.isNaN(line)) return;
      await api.saveNote(task.noteId, toggleTaskLineInNote(note.content, line));
      await get().refreshVault();
      return;
    }

    const today = formatDate(new Date());
    const tasks = planning.tasks.map((t) => {
      if (t.id !== id) return t;
      const done = !t.done;
      return {
        ...t,
        done,
        status: done ? ('done' as const) : computeTaskStatus({ ...t, done: false }, today),
        updatedAt: Date.now(),
      };
    });
    await persistPlanning(set, get, { ...planning, tasks });
  },

  updateTask: async (id, partial) => {
    const { planning } = get();
    const today = formatDate(new Date());
    const tasks = planning.tasks.map((t) => {
      if (t.id !== id || t.noteId) return t;
      const next = { ...t, ...partial, updatedAt: Date.now() };
      if (partial.dueDate !== undefined || partial.done !== undefined) {
        next.status = computeTaskStatus(next, today);
      }
      return next;
    });
    await persistPlanning(set, get, { ...planning, tasks });
  },

  deleteTask: async (id) => {
    const { planning } = get();
    const task = planning.tasks.find((t) => t.id === id);
    if (!task || task.noteId) return;
    const tasks = planning.tasks.filter((t) => t.id !== id);
    await persistPlanning(set, get, { ...planning, tasks });
  },

  deleteNote: async (id) => {
    const api = getAPI();
    await api.deleteNote(id);
    const notes = { ...get().notes };
    delete notes[id];
    const state = get();
    const planning = {
      ...state.planning,
      tasks: mergeTasks(
        structuredTasksOnly(state.planning.tasks.filter((task) => task.noteId !== id)),
        tasksFromNotes(notes)
      ),
    };
    set({
      notes,
      graph: buildGraph(notes),
      planning,
      activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
      activeNote: state.activeNoteId === id ? null : state.activeNote,
      workspaceFocusNoteId: state.workspaceFocusNoteId === id ? null : state.workspaceFocusNoteId,
    });
    await get().hideGraphNote(id);
  },

  hideGraphNote: async (id) => {
    let workspace = get().workspace;
    if (!workspace) {
      await get().loadWorkspace(DEFAULT_WORKSPACE_ID);
      workspace = get().workspace;
    }
    if (!workspace) return;
    const hiddenNoteIds = Array.from(new Set([...(workspace.hiddenNoteIds ?? []), id]));
    await get().saveWorkspace({ ...workspace, hiddenNoteIds });
    if (get().workspaceFocusNoteId === id) set({ workspaceFocusNoteId: null });
  },
}));

export { titleToId };
