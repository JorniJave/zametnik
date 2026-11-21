export interface NoteFrontmatter {
  uuid?: string;
  type?: string;
  color?: string;
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Функция `splitFrontmatter`. */
export function splitFrontmatter(content: string): { frontmatter: NoteFrontmatter; body: string } {
  const match = content.match(FM_RE);
  if (!match) return { frontmatter: {}, body: content };
  const fm: NoteFrontmatter = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (key === 'uuid') fm.uuid = val;
    if (key === 'type') fm.type = val;
    if (key === 'color') fm.color = val;
  }
  return { frontmatter: fm, body: content.slice(match[0].length) };
}

/** Функция `mergeFrontmatter`. */
export function mergeFrontmatter(content: string, patch: Partial<NoteFrontmatter>): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const next = { ...frontmatter, ...patch };
  const lines = ['---'];
  if (next.uuid) lines.push(`uuid: ${next.uuid}`);
  if (next.type) lines.push(`type: ${next.type}`);
  if (next.color) lines.push(`color: ${next.color}`);
  if (lines.length === 1) return body;
  lines.push('---');
  return `${lines.join('\n')}\n${body}`;
}

/** Функция `ensureUuid`. */
export function ensureUuid(content: string): string {
  const { frontmatter, body } = splitFrontmatter(content);
  if (frontmatter.uuid) return content;
  return mergeFrontmatter(body, { uuid: crypto.randomUUID() });
}
