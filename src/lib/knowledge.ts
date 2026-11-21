import { normalizeTitle, titleToId } from './parser';

const WIKI_LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Функция `hasWikiLink`. */
export function hasWikiLink(content: string, title: string): boolean {
  const target = normalizeTitle(title).toLowerCase();
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKI_LINK.source, 'g');
  while ((match = re.exec(content)) !== null) {
    if (titleToId(match[1]) === target) return true;
  }
  return false;
}

/** Функция `addWikiLinkToContent`. */
export function addWikiLinkToContent(content: string, title: string): string {
  const safe = normalizeTitle(title);
  if (hasWikiLink(content, safe)) return content;
  const trimmed = content.trimEnd();
  const block = trimmed ? `\n\n[[${safe}]]` : `[[${safe}]]`;
  return `${trimmed}${block}\n`;
}

/** Функция `removeWikiLinkFromContent`. */
export function removeWikiLinkFromContent(content: string, title: string): string {
  const target = titleToId(title);
  return content
    .split('\n')
    .filter((line) => {
      let match: RegExpExecArray | null;
      const re = new RegExp(WIKI_LINK.source, 'g');
      while ((match = re.exec(line)) !== null) {
        if (titleToId(match[1]) === target) return false;
      }
      return true;
    })
    .join('\n');
}

/** Функция `linkedNoteBody`. */
export function linkedNoteBody(title: string, sourceTitle?: string): string {
  const safe = normalizeTitle(title);
  const header = `# ${safe}\n\n`;
  if (sourceTitle) {
    return `${header}Связано с [[${normalizeTitle(sourceTitle)}]]\n\n`;
  }
  return `${header}\n`;
}
