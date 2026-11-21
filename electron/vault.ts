import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { atomicWriteJson, atomicWriteText } from './atomicFs.js';

export interface PlanningData {
  schemaVersion: number;
  tasks: StructuredTask[];
  events: CalendarEvent[];
  schedules: ScheduleTemplate[];
  combos: ScheduleCombo[];
  reminders: ReminderItem[];
}

export interface StructuredTask {
  id: string;
  title: string;
  done: boolean;
  status: 'inbox' | 'today' | 'scheduled' | 'done';
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'normal' | 'high';
  project?: string;
  tags: string[];
  noteId?: string;
  reminderMinutes?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  description?: string;
  color?: string;
  scheduleSlotId?: string;
  scheduleId?: string;
}

export interface ScheduleSlot {
  id: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  title: string;
  sortOrder?: number;
  /** @deprecated use description */
  location?: string;
  description?: string;
  teacher?: string;
  color?: string;
}

export interface ScheduleException {
  date: string;
  slotId: string;
  cancelled?: boolean;
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
}

export interface ScheduleTemplate {
  id: string;
  title: string;
  validFrom?: string;
  validTo?: string;
  slots: ScheduleSlot[];
  exceptions: ScheduleException[];
  color?: string;
}

export interface ScheduleCombo {
  id: string;
  title: string;
  scheduleIds: string[];
}

export interface ReminderItem {
  id: string;
  targetId: string;
  targetType: 'task' | 'event';
  title: string;
  fireAt: number;
  snoozedUntil?: number;
  dismissed?: boolean;
}

const EMPTY_PLANNING: PlanningData = {
  schemaVersion: 1,
  tasks: [],
  events: [],
  schedules: [],
  combos: [],
  reminders: [],
};

export interface TaskItem {
  text: string;
  done: boolean;
  line: number;
}

export interface NoteMeta {
  id: string;
  path: string;
  title: string;
  type: 'daily' | 'task' | 'project' | 'note' | 'week' | 'canvas';
  entityType?: 'daily' | 'task' | 'project' | 'note' | 'week' | 'canvas' | 'person';
  uuid?: string;
  color?: string;
  links: string[];
  tasks: TaskItem[];
  tags: string[];
  modified: number;
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

export interface WorkspaceData {
  id: string;
  title: string;
  schemaVersion: number;
  nodes: {
    id: string;
    kind: 'note' | 'text';
    noteId?: string;
    label?: string;
    entityType?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
    pinned?: boolean;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    kind: 'wiki' | 'manual' | 'typed';
    relationType?: string;
    color?: string;
    label?: string;
  }[];
  hiddenNoteIds?: string[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface TypedRelation {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  label?: string;
  color?: string;
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

const WIKI_LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const TASK_LINE = /^(\s*[-*+]\s+)\[([ xX])\]\s+(.+)$/;
const TAG = /#([\w\u0400-\u04FF-]+)/g;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DEFAULT_TEMPLATE = `# {{date}}

Коротко, как прошёл день.

## Заметки

`;

/** Функция `normalizeTitle`. */
function normalizeTitle(title: string): string {
  return title.trim().replace(/[\\/:*?"<>|]/g, '-');
}

/** Функция `titleToId`. */
function titleToId(title: string): string {
  return normalizeTitle(title).toLowerCase();
}

/** Функция `detectNoteType`. */
function detectNoteType(title: string, filePath: string, content: string): NoteMeta['type'] {
  if (DATE_PATTERN.test(title)) return 'daily';
  if (filePath.includes('Canvas/') || filePath.endsWith('.canvas.json')) return 'canvas';
  if (filePath.includes('Недели/') || title.toLowerCase().includes('неделя')) return 'week';
  if (filePath.includes('Проекты/')) return 'project';
  if (filePath.includes('Задачи/') || title.toLowerCase().startsWith('задача')) return 'task';
  if (content.includes('- [ ]') || content.includes('- [x]')) return 'task';
  return 'note';
}

/** Функция `extractWikiLinks`. */
function extractWikiLinks(content: string): string[] {
  const links = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKI_LINK.source, 'g');
  while ((match = re.exec(content)) !== null) {
    links.add(normalizeTitle(match[1]));
  }
  return [...links];
}

/** Функция `extractTags`. */
function extractTags(content: string): string[] {
  const tags = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(TAG.source, 'g');
  while ((match = re.exec(content)) !== null) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}

/** Функция `extractTasks`. */
function extractTasks(content: string): TaskItem[] {
  const lines = content.split('\n');
  const tasks: TaskItem[] = [];
  lines.forEach((line, index) => {
    const m = line.match(TASK_LINE);
    if (m) tasks.push({ text: m[3].trim(), done: m[2].toLowerCase() === 'x', line: index });
  });
  return tasks;
}

/** Функция `parseNote`. */
function parseNote(filePath: string, content: string, modified: number): NoteMeta {
  const fileName = path.basename(filePath, '.md');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  let body = content;
  let fmType: string | undefined;
  let uuid: string | undefined;
  let color: string | undefined;
  if (fmMatch) {
    body = content.slice(fmMatch[0].length);
    for (const line of fmMatch[1].split('\n')) {
      const m = line.match(/^(\w+):\s*(.+)$/);
      if (!m) continue;
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (m[1] === 'type') fmType = val;
      if (m[1] === 'uuid') uuid = val;
      if (m[1] === 'color') color = val;
    }
  }
  const detected = detectNoteType(fileName, filePath, body);
  return {
    id: titleToId(fileName),
    path: filePath,
    title: fileName,
    type: detected,
    entityType: fmType === 'person' ? 'person' : detected,
    uuid,
    color,
    links: extractWikiLinks(body),
    tasks: extractTasks(body),
    tags: extractTags(body),
    modified,
  };
}

/** Функция `buildGraph`. */
function buildGraph(notes: Record<string, NoteMeta>): GraphData {
  const nodes: GraphNode[] = Object.values(notes).map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    val: Math.max(1, n.links.length + n.tasks.length),
  }));

  const links: GraphLink[] = [];
  const nodeIds = new Set(Object.keys(notes));

  for (const note of Object.values(notes)) {
    for (const linkTitle of note.links) {
      const targetId = titleToId(linkTitle);
      if (!nodes.find((n) => n.id === targetId)) {
        nodes.push({ id: targetId, title: linkTitle, type: 'note', val: 1 });
      }
      if (nodeIds.has(targetId) || true) {
        links.push({ source: note.id, target: targetId });
      }
    }
  }

  return { nodes, links };
}

/** Функция `getBacklinksFor`. */
function getBacklinksFor(targetId: string, notes: Record<string, NoteMeta>): Backlink[] {
  return Object.values(notes)
    .filter((n) => n.id !== targetId && n.links.some((l) => titleToId(l) === targetId))
    .map((n) => ({
      sourceId: n.id,
      sourceTitle: n.title,
      sourcePath: n.path,
      context: `Упоминания: связано с заметкой «${n.title}»`,
    }));
}

/** Функция `getLocalGraphFor`. */
function getLocalGraphFor(
  centerId: string,
  notes: Record<string, NoteMeta>,
  depth = 1
): GraphData {
  const visited = new Set<string>([centerId]);
  const queue: { id: string; d: number }[] = [{ id: centerId, d: 0 }];

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    const note = notes[id];
    if (!note || d >= depth) continue;

    for (const linkTitle of note.links) {
      const tid = titleToId(linkTitle);
      if (!visited.has(tid)) {
        visited.add(tid);
        queue.push({ id: tid, d: d + 1 });
      }
    }

    for (const other of Object.values(notes)) {
      if (other.links.some((l) => titleToId(l) === id) && !visited.has(other.id) && d + 1 <= depth) {
        visited.add(other.id);
        queue.push({ id: other.id, d: d + 1 });
      }
    }
  }

  const full = buildGraph(notes);
  const nodes = full.nodes.filter((n) => visited.has(n.id));
  const ids = new Set(nodes.map((n) => n.id));

  if (!nodes.find((n) => n.id === centerId)) {
    const c = notes[centerId];
    nodes.push({ id: centerId, title: c?.title ?? centerId, type: c?.type ?? 'note', val: 3 });
    ids.add(centerId);
  }

  return {
    nodes,
    links: full.links.filter((l) => ids.has(l.source) && ids.has(l.target)),
  };
}

/** Функция `walkDir`. */
async function walkDir(dir: string, files: string[] = []): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = await fs.stat(full);
    if (stat.isDirectory() && entry !== '.zametnik') {
      await walkDir(full, files);
    } else if (entry.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

export class VaultManager {
  private vaultPath = '';
  private notes: Record<string, NoteMeta> = {};
  private pathById: Record<string, string> = {};
  private settings: VaultSettings = {
    vaultPath: '',
    theme: 'dark',
    dailyNoteTemplate: DEFAULT_TEMPLATE,
    weekStartsOn: 1,
    autoOpenDaily: true,
    remindersEnabled: true,
    defaultReminderMinutes: 15,
    launchAtLogin: false,
  };

  /** Функция `handler`. */
  private configPath(): string {
    return path.join(app.getPath('userData'), 'zametnik-config.json');
  }

  /** Функция `handler`. */
  private planningPath(): string {
    return path.join(this.vaultPath, '.zametnik', 'planning.json');
  }

  /** Функция `loadPlanning`. */
  async loadPlanning(): Promise<PlanningData> {
    if (!this.vaultPath) return { ...EMPTY_PLANNING };
    try {
      const raw = await fs.readFile(this.planningPath(), 'utf-8');
      const data = JSON.parse(raw) as PlanningData;
      return { ...EMPTY_PLANNING, ...data };
    } catch {
      return { ...EMPTY_PLANNING };
    }
  }

  /** Функция `savePlanning`. */
  async savePlanning(data: PlanningData): Promise<PlanningData> {
    if (!this.vaultPath) return data;
    await atomicWriteJson(this.planningPath(), data);
    return data;
  }

  /** Функция `loadConfig`. */
  async loadConfig(): Promise<void> {
    try {
      const raw = await fs.readFile(this.configPath(), 'utf-8');
      const cfg = JSON.parse(raw);
      if (cfg.vaultPath) this.vaultPath = cfg.vaultPath;
      if (cfg.settings) this.settings = { ...this.settings, ...cfg.settings, vaultPath: this.vaultPath };
    } catch {
      /* first run */
    }
  }

  /** Функция `saveConfig`. */
  async saveConfig(): Promise<void> {
    await atomicWriteJson(this.configPath(), {
      vaultPath: this.vaultPath,
      settings: this.settings,
    });
  }

  /** Функция `getVaultPath`. */
  async getVaultPath(): Promise<string | null> {
    await this.loadConfig();
    return this.vaultPath || null;
  }

  /** Функция `setVaultPath`. */
  async setVaultPath(p: string): Promise<void> {
    this.vaultPath = p;
    this.settings.vaultPath = p;
    await fs.mkdir(p, { recursive: true });
    await fs.mkdir(path.join(p, 'Проекты'), { recursive: true });
    await fs.mkdir(path.join(p, 'Задачи'), { recursive: true });
    await fs.mkdir(path.join(p, 'Недели'), { recursive: true });
    await fs.mkdir(path.join(p, 'Canvas'), { recursive: true });
    await fs.mkdir(path.join(p, '.zametnik'), { recursive: true });
    await this.saveConfig();
    await this.indexVault();
  }

  /** Функция `getSettings`. */
  async getSettings(): Promise<VaultSettings> {
    await this.loadConfig();
    return { ...this.settings, vaultPath: this.vaultPath };
  }

  /** Функция `saveSettings`. */
  async saveSettings(partial: Partial<VaultSettings>): Promise<VaultSettings> {
    this.settings = { ...this.settings, ...partial };
    await this.saveConfig();
    return this.getSettings();
  }

  /** Функция `indexVault`. */
  async indexVault(): Promise<void> {
    if (!this.vaultPath) return;
    this.notes = {};
    this.pathById = {};
    const files = await walkDir(this.vaultPath);
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const stat = await fs.stat(file);
      const meta = parseNote(file, content, stat.mtimeMs);
      this.notes[meta.id] = meta;
      this.pathById[meta.id] = file;
    }
  }

  /** Функция `loadVault`. */
  async loadVault(): Promise<VaultState> {
    await this.loadConfig();
    if (this.vaultPath) await this.indexVault();
    return {
      notes: this.notes,
      graph: buildGraph(this.notes),
      settings: await this.getSettings(),
      planning: await this.loadPlanning(),
    };
  }

  /** Функция `readNote`. */
  async readNote(id: string): Promise<NoteContent | null> {
    const filePath = this.pathById[id];
    if (!filePath) return null;
    const content = await fs.readFile(filePath, 'utf-8');
    const stat = await fs.stat(filePath);
    const meta = parseNote(filePath, content, stat.mtimeMs);
    this.notes[id] = meta;
    return { id, path: filePath, title: meta.title, content, meta };
  }

  /** Функция `saveNote`. */
  async saveNote(id: string, content: string): Promise<NoteContent> {
    let filePath = this.pathById[id];
    if (!filePath) {
      filePath = path.join(this.vaultPath, `${this.notes[id]?.title ?? id}.md`);
      this.pathById[id] = filePath;
    }
    await atomicWriteText(filePath, content);
    const stat = await fs.stat(filePath);
    const meta = parseNote(filePath, content, stat.mtimeMs);
    this.notes[id] = meta;
    return { id, path: filePath, title: meta.title, content, meta };
  }

  /** Функция `createNote`. */
  async createNote(title: string, folder?: string, content = ''): Promise<NoteContent> {
    const safe = normalizeTitle(title);
    const rel = folder ? path.join(folder, `${safe}.md`) : `${safe}.md`;
    const filePath = path.join(this.vaultPath, rel);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const body = content || `# ${safe}\n\n`;
    await atomicWriteText(filePath, body);
    const id = titleToId(safe);
    this.pathById[id] = filePath;
    const stat = await fs.stat(filePath);
    const meta = parseNote(filePath, body, stat.mtimeMs);
    this.notes[id] = meta;
    return { id, path: filePath, title: safe, content: body, meta };
  }

  /** Функция `deleteNote`. */
  async deleteNote(id: string): Promise<void> {
    const filePath = this.pathById[id];
    if (filePath) {
      await fs.unlink(filePath);
      delete this.notes[id];
      delete this.pathById[id];
    }
  }

  /** Функция `getBacklinks`. */
  getBacklinks(id: string): Backlink[] {
    return getBacklinksFor(id, this.notes);
  }

  /** Функция `getLocalGraph`. */
  getLocalGraph(id: string, depth = 1): GraphData {
    return getLocalGraphFor(id, this.notes, depth);
  }

  /** Функция `ensureDailyNote`. */
  async ensureDailyNote(date: string): Promise<NoteContent> {
    const id = titleToId(date);
    const existing = await this.readNote(id);
    if (existing) return existing;

    const weekLabel = this.getWeekLabelFromDate(date);
    const tpl = this.settings.dailyNoteTemplate || DEFAULT_TEMPLATE;
    const body = tpl.replace(/\{\{date\}\}/g, date).replace(/\{\{week\}\}/g, weekLabel);
    const filePath = path.join(this.vaultPath, `${date}.md`);
    await atomicWriteText(filePath, body);
    this.pathById[id] = filePath;
    const stat = await fs.stat(filePath);
    const meta = parseNote(filePath, body, stat.mtimeMs);
    this.notes[id] = meta;
    return { id, path: filePath, title: date, content: body, meta };
  }

  /** Функция `handler`. */
  private getWeekLabelFromDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    const weekNum = this.getISOWeek(monday);
    return `Неделя ${weekNum} - ${monday.getFullYear()}`;
  }

  /** Функция `handler`. */
  private getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /** Функция `ensureWeekNote`. */
  async ensureWeekNote(weekLabel: string, days: string[]): Promise<NoteContent> {
    const id = titleToId(weekLabel);
    const existing = await this.readNote(id);
    if (existing) return existing;

    const dayLinks = days.map((d) => `- [[${d}]]`).join('\n');
    const body = `# ${weekLabel}

## Фокус недели

- 

## Дни

${dayLinks}

## Цели

- [ ] 
`;
    return this.createNote(weekLabel, 'Недели', body);
  }

  /** Функция `readCanvas`. */
  async readCanvas(id: string): Promise<CanvasData | null> {
    const filePath = path.join(this.vaultPath, 'Canvas', `${id}.canvas.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as CanvasData;
    } catch {
      return null;
    }
  }

  /** Функция `saveCanvas`. */
  async saveCanvas(canvas: CanvasData): Promise<void> {
    const filePath = path.join(this.vaultPath, 'Canvas', `${canvas.id}.canvas.json`);
    await atomicWriteJson(filePath, canvas);
  }

  /** Функция `listCanvases`. */
  async listCanvases(): Promise<{ id: string; title: string }[]> {
    const dir = path.join(this.vaultPath, 'Canvas');
    try {
      const files = await fs.readdir(dir);
      const result: { id: string; title: string }[] = [];
      for (const f of files.filter((x) => x.endsWith('.canvas.json'))) {
        const raw = await fs.readFile(path.join(dir, f), 'utf-8');
        const data = JSON.parse(raw) as CanvasData;
        result.push({ id: data.id, title: data.title });
      }
      return result;
    } catch {
      return [];
    }
  }

  /** Функция `handler`. */
  private workspaceDir(): string {
    return path.join(this.vaultPath, '.zametnik', 'workspaces');
  }

  /** Функция `handler`. */
  private relationsPath(): string {
    return path.join(this.vaultPath, '.zametnik', 'relations.json');
  }

  /** Функция `readWorkspace`. */
  async readWorkspace(id: string): Promise<WorkspaceData | null> {
    const filePath = path.join(this.workspaceDir(), `${id}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** Функция `saveWorkspace`. */
  async saveWorkspace(workspace: WorkspaceData): Promise<void> {
    const dir = this.workspaceDir();
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${workspace.id}.json`);
    await atomicWriteJson(filePath, workspace);
  }

  /** Функция `deleteWorkspace`. */
  async deleteWorkspace(id: string): Promise<void> {
    const filePath = path.join(this.workspaceDir(), `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  /** Функция `listWorkspaces`. */
  async listWorkspaces(): Promise<{ id: string; title: string }[]> {
    const dir = this.workspaceDir();
    try {
      const files = await fs.readdir(dir);
      const result: { id: string; title: string }[] = [];
      for (const f of files.filter((x) => x.endsWith('.json'))) {
        const raw = await fs.readFile(path.join(dir, f), 'utf-8');
        const data = JSON.parse(raw) as { id: string; title: string };
        result.push({ id: data.id, title: data.title });
      }
      return result;
    } catch {
      return [];
    }
  }

  /** Функция `loadRelations`. */
  async loadRelations(): Promise<TypedRelation[]> {
    try {
      const raw = await fs.readFile(this.relationsPath(), 'utf-8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /** Функция `saveRelations`. */
  async saveRelations(relations: TypedRelation[]): Promise<void> {
    const dir = path.join(this.vaultPath, '.zametnik');
    await fs.mkdir(dir, { recursive: true });
    await atomicWriteJson(this.relationsPath(), relations);
  }

  /** Функция `searchNotes`. */
  searchNotes(query: string): NoteMeta[] {
    const q = query.toLowerCase();
    return Object.values(this.notes).filter(
      (n) => n.title.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q))
    );
  }

  /** Функция `initDemoVault`. */
  async initDemoVault(): Promise<void> {
    const today = new Date();
    /** Функция `fmt`. */
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const monday = new Date(today);
    const day = monday.getDay();
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));

    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(fmt(d));
    }

    const weekLabel = this.getWeekLabelFromDate(fmt(today));
    await this.ensureWeekNote(weekLabel, days);

    await this.createNote(
      'Проект Альфа',
      'Проекты',
      `# Проект Альфа

Статус: #активный

## Задачи

- [ ] Подготовить презентацию
- [ ] Согласовать бюджет с [[Иван Иванов]]

## Связанные заметки

`
    );

    await this.createNote(
      'Здоровье',
      'Проекты',
      `# Здоровье

Контекст для задач по здоровью и спорту.

- [ ] Утренняя пробежка
- [ ] Записаться к врачу
`
    );

    await this.createNote(
      'Задача: Купить подарок',
      'Задачи',
      `# Задача: Купить подарок

- [ ] Выбрать подарок
- [ ] Купить до пятницы

Связано: [[Покупки]]
`
    );

    await this.createNote('Иван Иванов', undefined, `# Иван Иванов

Коллега, менеджер проекта.

## Встречи

- Созвон по [[Проект Альфа]]
`);

    await this.createNote(
      'Статья про ИИ',
      undefined,
      `# Статья про ИИ

## Структура

1. Введение
2. История
3. Современные модели
4. Заключение

#черновик #писательство
`
    );

    await this.createNote('Покупки', 'Проекты', `# Покупки\n\nБытовые покупки и подарки.\n`);

    await this.createNote(
      'Запуск сайта',
      'Проекты',
      `# Запуск сайта

Главный фокус квартала.

- [ ] Дизайн лендинга
- [ ] Настроить хостинг
- [ ] SEO-оптимизация
`
    );

    for (const d of days) {
      await this.ensureDailyNote(d);
    }

    const todayNote = await this.readNote(titleToId(fmt(today)));
    if (todayNote) {
      const enriched = `# ${fmt(today)}

## Фокус дня

[[Запуск сайта]] · [[Проект Альфа]]

## Расписание

| Время | Событие |
|-------|---------|
| 09:00 | Созвон по [[Проект Альфа]] с [[Иван Иванов]] |
| 12:00 | Написать структуру для [[Статья про ИИ]] |
| 15:00 | [[Здоровье]] — пробежка |

## Задачи

- [ ] Сделать [[Задача: Купить подарок]]
- [ ] Обновить план на [[${weekLabel}]]

## Заметки

Утренний кофе ☕

---
*Создано автоматически · [[${weekLabel}]]*
`;
      await this.saveNote(todayNote.id, enriched);
    }

    const weekNote = await this.readNote(titleToId(weekLabel));
    if (weekNote) {
      const weekBody = `# ${weekLabel}

## Фокус недели

[[Запуск сайта]]

## Дни

${days.map((d) => `- [[${d}]]`).join('\n')}

## Цели

- [ ] Завершить черновик [[Статья про ИИ]]
- [ ] Провести 3 созвона по [[Проект Альфа]]
- [ ] Поддерживать [[Здоровье]]
`;
      await this.saveNote(weekNote.id, weekBody);
    }

    const canvasNodes: CanvasNode[] = [
      ...days.map((d, i) => ({
        id: `day-${i}`,
        type: 'note' as const,
        noteId: titleToId(d),
        label: d,
        x: 80 + i * 180,
        y: 120,
        width: 160,
        height: 80,
        color: '#ffd166',
      })),
      {
        id: 'project-alpha',
        type: 'note',
        noteId: titleToId('Проект Альфа'),
        label: 'Проект Альфа',
        x: 200,
        y: 320,
        width: 180,
        height: 80,
        color: '#7c9eff',
      },
      {
        id: 'launch',
        type: 'note',
        noteId: titleToId('Запуск сайта'),
        label: 'Запуск сайта',
        x: 500,
        y: 320,
        width: 180,
        height: 80,
        color: '#7c9eff',
      },
      {
        id: 'goal',
        type: 'text',
        label: 'Итог недели',
        x: 650,
        y: 480,
        width: 160,
        height: 60,
        color: '#06d6a0',
      },
    ];

    const demoCanvas: CanvasData = {
      id: 'week-plan',
      title: 'План недели',
      nodes: canvasNodes,
      edges: [
        { id: 'e1', source: 'day-0', target: 'project-alpha', color: '#7c9eff' },
        { id: 'e2', source: 'day-2', target: 'launch', color: '#ef476f' },
        { id: 'e3', source: 'project-alpha', target: 'goal', color: '#06d6a0', label: '→' },
        { id: 'e4', source: 'launch', target: 'goal', color: '#06d6a0', label: '→' },
      ],
    };
    await this.saveCanvas(demoCanvas);

    await this.savePlanning({
      schemaVersion: 1,
      tasks: [
        {
          id: crypto.randomUUID(),
          title: 'Подготовить конспект',
          done: false,
          status: 'today',
          dueDate: fmt(today),
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
              color: '#7c9eff',
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
              color: '#06d6a0',
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

    await this.indexVault();
  }
}
