import type { ZametnikAPI } from '../types';
import {
  parseNote,
  buildGraph,
  getBacklinks,
  getLocalGraph,
  normalizeTitle,
  titleToId,
  formatDate,
  getWeekDays,
  getWeekLabel,
  DAILY_TEMPLATE,
  applyTemplate,
} from './parser';
import type {
  NoteContent,
  NoteMeta,
  VaultSettings,
  CanvasData,
  WorkspaceData,
  TypedRelation,
} from '../types';
import { EMPTY_PLANNING } from '../types/planning';
import type { PlanningData } from '../types/planning';

const LS_VAULT = 'zametnik-vault';
const LS_NOTES = 'zametnik-notes';
const LS_PLANNING = 'zametnik-planning';
const LS_CANVASES = 'zametnik-canvases';
const LS_WORKSPACES = 'zametnik-workspaces';
const LS_RELATIONS = 'zametnik-relations';

/** Функция `loadBrowserCanvases`. */
function loadBrowserCanvases(): Record<string, CanvasData> {
  try {
    return JSON.parse(localStorage.getItem(LS_CANVASES) ?? '{}');
  } catch {
    return {};
  }
}

/** Функция `saveBrowserCanvases`. */
function saveBrowserCanvases(data: Record<string, CanvasData>) {
  localStorage.setItem(LS_CANVASES, JSON.stringify(data));
}

/** Функция `loadBrowserWorkspaces`. */
function loadBrowserWorkspaces(): Record<string, WorkspaceData> {
  try {
    return JSON.parse(localStorage.getItem(LS_WORKSPACES) ?? '{}');
  } catch {
    return {};
  }
}

/** Функция `saveBrowserWorkspaces`. */
function saveBrowserWorkspaces(data: Record<string, WorkspaceData>) {
  localStorage.setItem(LS_WORKSPACES, JSON.stringify(data));
}

/** Функция `loadBrowserRelations`. */
function loadBrowserRelations(): TypedRelation[] {
  try {
    return JSON.parse(localStorage.getItem(LS_RELATIONS) ?? '[]');
  } catch {
    return [];
  }
}

/** Функция `saveBrowserRelations`. */
function saveBrowserRelations(relations: TypedRelation[]) {
  localStorage.setItem(LS_RELATIONS, JSON.stringify(relations));
}

/** Функция `loadBrowserNotes`. */
function loadBrowserNotes(): Record<string, { path: string; content: string; modified: number }> {
  try {
    return JSON.parse(localStorage.getItem(LS_NOTES) ?? '{}');
  } catch {
    return {};
  }
}

/** Функция `saveBrowserNotes`. */
function saveBrowserNotes(data: Record<string, { path: string; content: string; modified: number }>) {
  localStorage.setItem(LS_NOTES, JSON.stringify(data));
}

/** Функция `loadBrowserPlanning`. */
function loadBrowserPlanning(): PlanningData {
  try {
    return { ...EMPTY_PLANNING, ...JSON.parse(localStorage.getItem(LS_PLANNING) ?? '{}') };
  } catch {
    return { ...EMPTY_PLANNING };
  }
}

/** Функция `saveBrowserPlanning`. */
function saveBrowserPlanning(data: PlanningData) {
  localStorage.setItem(LS_PLANNING, JSON.stringify(data));
}

/** Функция `toMeta`. */
function toMeta(path: string, content: string, modified: number): NoteMeta {
  return parseNote(path, content, modified);
}

/** Функция `createBrowserAPI`. */
function createBrowserAPI(): ZametnikAPI {
  let vaultPath = localStorage.getItem(LS_VAULT) ?? 'browser-vault';
  let settings: VaultSettings = {
    vaultPath,
    theme: 'dark',
    dailyNoteTemplate: DAILY_TEMPLATE,
    weekStartsOn: 1,
    autoOpenDaily: true,
    remindersEnabled: true,
    defaultReminderMinutes: 15,
    launchAtLogin: false,
  };

  /** Функция `getNotesMap`. */
  function getNotesMap(): Record<string, NoteMeta> {
    const raw = loadBrowserNotes();
    const notes: Record<string, NoteMeta> = {};
    for (const [id, n] of Object.entries(raw)) {
      notes[id] = toMeta(n.path, n.content, n.modified);
    }
    return notes;
  }

  /** Функция `writeNote`. */
  function writeNote(id: string, path: string, content: string): NoteContent {
    const raw = loadBrowserNotes();
    raw[id] = { path, content, modified: Date.now() };
    saveBrowserNotes(raw);
    const meta = toMeta(path, content, Date.now());
    return { id, path, title: meta.title, content, meta };
  }

  /** Функция `initDemo`. */
  async function initDemo() {
    const today = new Date();
    const monday = new Date(today);
    const day = monday.getDay();
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
    const days = getWeekDays(monday).map(formatDate);
    const weekLabel = getWeekLabel(today);

    writeNote(titleToId(weekLabel), `Недели/${weekLabel}.md`, `# ${weekLabel}\n\n## Дни\n\n${days.map((d) => `- [[${d}]]`).join('\n')}\n\n## Фокус\n\n[[Запуск сайта]]`);
    writeNote(titleToId('Проект Альфа'), 'Проекты/Проект Альфа.md', `# Проект Альфа\n\n- [ ] Презентация\n- [[Иван Иванов]]`);
    writeNote(titleToId('Иван Иванов'), 'Иван Иванов.md', `# Иван Иванов\n\n[[Проект Альфа]]`);
    writeNote(titleToId('Запуск сайта'), 'Проекты/Запуск сайта.md', `# Запуск сайта\n\n- [ ] Лендинг`);
    writeNote(titleToId('Здоровье'), 'Проекты/Здоровье.md', `# Здоровье\n\n- [ ] Пробежка`);
    writeNote(titleToId('Статья про ИИ'), 'Статья про ИИ.md', `# Статья про ИИ\n\n#черновик`);
    writeNote(titleToId('Задача: Купить подарок'), 'Задачи/Задача: Купить подарок.md', `# Задача: Купить подарок\n\n- [ ] Купить`);
    writeNote(titleToId('Покупки'), 'Проекты/Покупки.md', `# Покупки`);

    for (const d of days) {
      const body = applyTemplate(DAILY_TEMPLATE, { date: d, week: weekLabel });
      writeNote(titleToId(d), `${d}.md`, body);
    }

    const todayStr = formatDate(today);
    writeNote(titleToId(todayStr), `${todayStr}.md`, `# ${todayStr}\n\n09:00 — [[Проект Альфа]] с [[Иван Иванов]]\n12:00 — [[Статья про ИИ]]\n- [ ] [[Задача: Купить подарок]]\n\n[[${weekLabel}]]`);

    saveBrowserPlanning({
      schemaVersion: 1,
      tasks: [
        {
          id: crypto.randomUUID(),
          title: 'Подготовить конспект',
          done: false,
          status: 'today',
          dueDate: todayStr,
          priority: 'high',
          project: 'Учёба',
          tags: ['учёба'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      events: [],
      schedules: [
        {
          id: 'school-week',
          title: 'Школа',
          color: '#7c9eff',
          slots: [
            {
              id: 'math',
              weekdays: [1, 2, 3, 4, 5],
              startTime: '09:00',
              endTime: '09:45',
              title: 'Математика',
              description: 'Каб. 204',
            },
          ],
          exceptions: [],
        },
        {
          id: 'sport-week',
          title: 'Спорт',
          color: '#06d6a0',
          slots: [
            {
              id: 'gym',
              weekdays: [1, 3, 5],
              startTime: '18:00',
              endTime: '19:30',
              title: 'Зал',
              description: 'Фитнес-клуб',
            },
          ],
          exceptions: [],
        },
      ],
      combos: [
        {
          id: 'school-sport',
          title: 'Школа + спорт',
          scheduleIds: ['school-week', 'sport-week'],
        },
      ],
      reminders: [],
    });
  }

  return {
    selectVault: async () => {
      vaultPath = 'browser-vault';
      localStorage.setItem(LS_VAULT, vaultPath);
      if (Object.keys(loadBrowserNotes()).length === 0) await initDemo();
      return vaultPath;
    },
    createDefaultVault: async () => {
      vaultPath = 'browser-vault';
      localStorage.setItem(LS_VAULT, vaultPath);
      saveBrowserNotes({});
      await initDemo();
      return vaultPath;
    },
    getVaultPath: async () => vaultPath,
    loadVault: async () => {
      if (Object.keys(loadBrowserNotes()).length === 0) await initDemo();
      const notes = getNotesMap();
      return { notes, graph: buildGraph(notes), settings, planning: loadBrowserPlanning() };
    },
    readNote: async (id) => {
      const raw = loadBrowserNotes()[id];
      if (!raw) return null;
      const meta = toMeta(raw.path, raw.content, raw.modified);
      return { id, path: raw.path, title: meta.title, content: raw.content, meta };
    },
    saveNote: async (id, content) => {
      const raw = loadBrowserNotes()[id];
      const p = raw?.path ?? `${id}.md`;
      return writeNote(id, p, content);
    },
    createNote: async (title, folder, content) => {
      const safe = normalizeTitle(title);
      const id = titleToId(safe);
      const p = folder ? `${folder}/${safe}.md` : `${safe}.md`;
      return writeNote(id, p, content ?? `# ${safe}\n\n`);
    },
    deleteNote: async (id) => {
      const raw = loadBrowserNotes();
      delete raw[id];
      saveBrowserNotes(raw);
    },
    getBacklinks: async (id) => getBacklinks(id, getNotesMap()),
    getLocalGraph: async (id, depth) => getLocalGraph(id, getNotesMap(), depth),
    ensureDailyNote: async (date) => {
      const id = titleToId(date);
      const existing = await createBrowserAPI().readNote(id);
      if (existing) return existing;
      const week = getWeekLabel(new Date(date));
      const body = applyTemplate(DAILY_TEMPLATE, { date, week });
      return writeNote(id, `${date}.md`, body);
    },
    ensureWeekNote: async (weekLabel, days) => {
      const id = titleToId(weekLabel);
      const body = `# ${weekLabel}\n\n${days.map((d) => `- [[${d}]]`).join('\n')}\n`;
      return writeNote(id, `Недели/${weekLabel}.md`, body);
    },
    readCanvas: async (id) => loadBrowserCanvases()[id] ?? null,
    saveCanvas: async (canvas) => {
      const all = loadBrowserCanvases();
      all[canvas.id] = canvas;
      saveBrowserCanvases(all);
    },
    listCanvases: async () =>
      Object.values(loadBrowserCanvases()).map((c) => ({ id: c.id, title: c.title })),
    readWorkspace: async (id) => loadBrowserWorkspaces()[id] ?? null,
    saveWorkspace: async (workspace) => {
      const all = loadBrowserWorkspaces();
      all[workspace.id] = workspace;
      saveBrowserWorkspaces(all);
    },
    deleteWorkspace: async (id) => {
      const all = loadBrowserWorkspaces();
      delete all[id];
      saveBrowserWorkspaces(all);
    },
    listWorkspaces: async () =>
      Object.values(loadBrowserWorkspaces()).map((w) => ({ id: w.id, title: w.title })),
    loadRelations: async () => loadBrowserRelations(),
    saveRelations: async (relations) => {
      saveBrowserRelations(relations);
    },
    searchNotes: async (query) => {
      const q = query.toLowerCase();
      return Object.values(getNotesMap()).filter((n) => n.title.toLowerCase().includes(q));
    },
    getSettings: async () => settings,
    saveSettings: async (partial) => {
      settings = { ...settings, ...partial };
      localStorage.setItem('zametnik-settings', JSON.stringify(settings));
      return settings;
    },
    loadPlanning: async () => loadBrowserPlanning(),
    savePlanning: async (data) => {
      saveBrowserPlanning(data);
      return data;
    },
    pickExcelFile: async () => null,
    readExcelFile: async () => null,
    saveExcelFile: async (defaultName, base64) => {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return defaultName;
    },
    showNotification: async (title, body) => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    },
    setLaunchAtLogin: async () => {},
  };
}

/** Функция `getAPI`. */
export function getAPI(): ZametnikAPI {
  if (typeof window !== 'undefined' && window.zametnik) {
    return window.zametnik;
  }
  return createBrowserAPI();
}
