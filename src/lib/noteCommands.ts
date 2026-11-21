import type { EntityType } from '../types/workspace';
import { normalizeTitle, titleToId } from './parser';
import { mergeFrontmatter } from './frontmatter';
import { linkedNoteBody, addWikiLinkToContent, removeWikiLinkFromContent } from './knowledge';

export interface CreateLinkedNoteOptions {
  entityType?: EntityType;
  initialBody?: string;
  folder?: string;
}

/** Функция `buildLinkedNoteContent`. */
export function buildLinkedNoteContent(
  title: string,
  sourceTitle: string,
  opts?: CreateLinkedNoteOptions
): string {
  let body = opts?.initialBody ?? linkedNoteBody(title, sourceTitle);
  if (opts?.entityType && opts.entityType !== 'note') {
    body = mergeFrontmatter(body, {
      type: opts.entityType === 'person' ? 'person' : opts.entityType,
    });
  }
  return body;
}

/** Функция `applyWikiLink`. */
export function applyWikiLink(sourceContent: string, targetTitle: string): string {
  return addWikiLinkToContent(sourceContent, targetTitle);
}

/** Функция `removeWikiLink`. */
export function removeWikiLink(sourceContent: string, targetTitle: string): string {
  return removeWikiLinkFromContent(sourceContent, targetTitle);
}

/** Функция `renameNoteTitleInContent`. */
export function renameNoteTitleInContent(content: string, _oldTitle: string, newTitle: string): string {
  const safe = normalizeTitle(newTitle);
  const lines = content.split('\n');
  if (lines[0]?.startsWith('# ')) {
    lines[0] = `# ${safe}`;
  }
  return lines.join('\n');
}

/** Функция `noteMetaPatch`. */
export function noteMetaPatch(
  content: string,
  patch: { entityType?: EntityType; color?: string }
): string {
  const fm: { type?: string; color?: string } = {};
  if (patch.entityType) {
    fm.type = patch.entityType === 'person' ? 'person' : patch.entityType;
  }
  if (patch.color) fm.color = patch.color;
  return mergeFrontmatter(content, fm);
}

/** Функция `titlesLinked`. */
export function titlesLinked(sourceLinks: string[], targetId: string, _targetTitle: string): boolean {
  return sourceLinks.some((l) => titleToId(l) === targetId);
}
