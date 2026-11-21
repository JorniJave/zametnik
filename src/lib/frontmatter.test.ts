import { describe, it, expect } from 'vitest';
import { splitFrontmatter, mergeFrontmatter, ensureUuid } from './frontmatter';

describe('frontmatter', () => {
  it('parses yaml block', () => {
    const raw = `---
uuid: abc-123
type: person
color: "#ffd166"
---
# Title

Body
`;
    const { frontmatter, body } = splitFrontmatter(raw);
    expect(frontmatter.uuid).toBe('abc-123');
    expect(frontmatter.type).toBe('person');
    expect(body.startsWith('# Title')).toBe(true);
  });

  it('merges frontmatter', () => {
    const next = mergeFrontmatter('# Hi\n', { type: 'person' });
    expect(next).toContain('type: person');
    expect(next).toContain('# Hi');
  });

  it('ensureUuid adds uuid', () => {
    const out = ensureUuid('# Note\n');
    expect(out).toMatch(/uuid:/);
  });
});
