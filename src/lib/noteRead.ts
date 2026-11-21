import { marked } from 'marked';
import { splitFrontmatter, mergeFrontmatter, type NoteFrontmatter } from './frontmatter';

marked.use({ gfm: true, breaks: true });

/** Текст без служебной шапки uuid/type/color. */
export function noteBody(content: string): string {
  return splitFrontmatter(content).body.replace(/^\uFEFF/, '').trimStart();
}

/** Сохраняет скрытую шапку, если пользователь правил только текст. */
export function restoreFrontmatter(original: string, body: string): string {
  const { frontmatter } = splitFrontmatter(original);
  const patch: Partial<NoteFrontmatter> = {};
  if (frontmatter.uuid) patch.uuid = frontmatter.uuid;
  if (frontmatter.type) patch.type = frontmatter.type;
  if (frontmatter.color) patch.color = frontmatter.color;
  if (!patch.uuid && !patch.type && !patch.color) return body;
  return mergeFrontmatter(body, patch);
}

/** Заметка как страница, а не исходный Markdown. Таблицы становятся таблицами. */
export function renderNoteHtml(content: string): string {
  const body = noteBody(content);
  if (!body.trim()) return '<p class="note-read-empty">Пока пусто. Нажмите «Править», чтобы написать.</p>';
  return marked.parse(body, { async: false }) as string;
}
