import { splitFrontmatter } from './frontmatter';
import type { EntityType } from '../types/workspace';

const WIKI_LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const TASK_LINE = /^(\s*[-*+]\s+)\[([ xX])\]\s+(.+)$/;
const TAG = /#([\w\u0400-\u04FF-]+)/g;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Функция `normalizeTitle`. */
export function normalizeTitle(title: string): string {
  return title.trim().replace(/[\\/:*?"<>|]/g, '-');
}

/** Функция `titleToId`. */
export function titleToId(title: string): string {
  return normalizeTitle(title).toLowerCase();
}

/** Функция `detectNoteType`. */
export function detectNoteType(title: string, path: string, content: string): import('../types').NoteMeta['type'] {
  if (DATE_PATTERN.test(title)) return 'daily';
  if (path.includes('Canvas/') || path.endsWith('.canvas.json')) return 'canvas';
  if (path.includes('Недели/') || title.toLowerCase().includes('неделя')) return 'week';
  if (path.includes('Проекты/')) return 'project';
  if (path.includes('Задачи/') || title.toLowerCase().startsWith('задача')) return 'task';
  if (content.includes('- [ ]') || content.includes('- [x]')) return 'task';
  return 'note';
}

/** Функция `extractWikiLinks`. */
export function extractWikiLinks(content: string): string[] {
  const links = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKI_LINK.source, 'g');
  while ((match = re.exec(content)) !== null) {
    links.add(normalizeTitle(match[1]));
  }
  return [...links];
}

/** Функция `extractTags`. */
export function extractTags(content: string): string[] {
  const tags = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(TAG.source, 'g');
  while ((match = re.exec(content)) !== null) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}

/** Функция `extractTasks`. */
export function extractTasks(content: string): import('../types').TaskItem[] {
  const lines = content.split('\n');
  const tasks: import('../types').TaskItem[] = [];
  lines.forEach((line, index) => {
    const m = line.match(TASK_LINE);
    if (m) {
      tasks.push({
        text: m[3].trim(),
        done: m[2].toLowerCase() === 'x',
        line: index,
      });
    }
  });
  return tasks;
}

/** Функция `toggleTaskLineInNote`. */
export function toggleTaskLineInNote(content: string, line: number): string {
  const lines = content.split('\n');
  const lineContent = lines[line];
  if (!lineContent) return content;
  const m = lineContent.match(TASK_LINE);
  if (!m) return content;
  const newCheck = m[2].toLowerCase() === 'x' ? ' ' : 'x';
  lines[line] = `${m[1]}[${newCheck}] ${m[3]}`;
  return lines.join('\n');
}

/** Функция `resolveEntityType`. */
function resolveEntityType(
  fmType: string | undefined,
  detected: import('../types').NoteMeta['type']
): EntityType {
  if (fmType === 'person') return 'person';
  return detected;
}

/** Функция `parseNote`. */
export function parseNote(
  path: string,
  content: string,
  modified: number
): import('../types').NoteMeta {
  const fileName = path.split(/[/\\]/).pop()?.replace(/\.md$/, '') ?? 'Без названия';
  const title = fileName;
  const { frontmatter, body } = splitFrontmatter(content);
  const detected = detectNoteType(title, path, body);
  return {
    id: titleToId(title),
    path,
    title,
    type: detected,
    entityType: resolveEntityType(frontmatter.type, detected),
    uuid: frontmatter.uuid,
    color: frontmatter.color,
    links: extractWikiLinks(body),
    tasks: extractTasks(body),
    tags: extractTags(body),
    modified,
  };
}

/** Функция `buildGraph`. */
export function buildGraph(notes: Record<string, import('../types').NoteMeta>): import('../types').GraphData {
  const nodes: import('../types').GraphNode[] = Object.values(notes).map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    val: Math.max(1, n.links.length + n.tasks.length),
  }));

  const links: import('../types').GraphLink[] = [];
  const nodeIds = new Set(Object.keys(notes));

  for (const note of Object.values(notes)) {
    for (const linkTitle of note.links) {
      const targetId = titleToId(linkTitle);
      if (nodeIds.has(targetId)) {
        links.push({ source: note.id, target: targetId });
      } else {
        // orphan link node
        if (!nodes.find((n) => n.id === targetId)) {
          nodes.push({ id: targetId, title: linkTitle, type: 'note', val: 1 });
        }
        links.push({ source: note.id, target: targetId });
      }
    }
  }

  return { nodes, links };
}

/** Функция `getBacklinks`. */
export function getBacklinks(
  targetId: string,
  notes: Record<string, import('../types').NoteMeta>
): import('../types').Backlink[] {
  const target = notes[targetId];
  if (!target) return [];

  return Object.values(notes)
    .filter((n) => n.id !== targetId && n.links.some((l) => titleToId(l) === targetId))
    .map((n) => ({
      sourceId: n.id,
      sourceTitle: n.title,
      sourcePath: n.path,
      context: `Связано с заметкой ${n.title}`,
    }));
}

/** Функция `getLocalGraph`. */
export function getLocalGraph(
  centerId: string,
  notes: Record<string, import('../types').NoteMeta>,
  depth = 1
): import('../types').GraphData {
  const visited = new Set<string>([centerId]);
  const queue: { id: string; d: number }[] = [{ id: centerId, d: 0 }];
  const linkSet = new Set<string>();

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    const note = notes[id];
    if (!note || d >= depth) continue;

    for (const linkTitle of note.links) {
      const tid = titleToId(linkTitle);
      const key = [id, tid].sort().join('->');
      if (!linkSet.has(key)) {
        linkSet.add(key);
      }
      if (!visited.has(tid)) {
        visited.add(tid);
        queue.push({ id: tid, d: d + 1 });
      }
    }

    for (const other of Object.values(notes)) {
      if (other.links.some((l) => titleToId(l) === id)) {
        const key = [other.id, id].sort().join('->');
        linkSet.add(key);
        if (!visited.has(other.id) && d + 1 < depth) {
          visited.add(other.id);
          queue.push({ id: other.id, d: d + 1 });
        }
      }
    }
  }

  const fullGraph = buildGraph(notes);
  const nodes = fullGraph.nodes.filter((n) => visited.has(n.id));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const links = fullGraph.links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));

  if (!nodes.find((n) => n.id === centerId)) {
    const center = notes[centerId];
    nodes.push({
      id: centerId,
      title: center?.title ?? centerId,
      type: center?.type ?? 'note',
      val: 3,
    });
  }

  return { nodes, links };
}

/** Функция `formatDate`. */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Функция `getWeekStart`. */
export function getWeekStart(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = weekStartsOn === 1 ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Функция `getWeekDays`. */
export function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Функция `getWeekLabel`. */
export function getWeekLabel(date: Date, weekStartsOn: 0 | 1 = 1): string {
  const start = getWeekStart(date, weekStartsOn);
  const weekNum = getISOWeek(start);
  return `Неделя ${weekNum} - ${start.getFullYear()}`;
}

/** Функция `getISOWeek`. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const DAILY_TEMPLATE = `# {{date}}

Коротко, как прошёл день.

## Заметки

`;

/** Функция `applyTemplate`. */
export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export { WIKI_LINK, TASK_LINE };
