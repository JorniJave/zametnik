import { describe, it, expect } from 'vitest';
import { addWikiLinkToContent, hasWikiLink, linkedNoteBody } from './knowledge';

describe('knowledge', () => {
  it('adds wiki link once', () => {
    const c = addWikiLinkToContent('# A\n', 'B');
    expect(c).toContain('[[B]]');
    expect(hasWikiLink(c, 'B')).toBe(true);
    expect(addWikiLinkToContent(c, 'B')).toBe(c);
  });

  it('linked note body references source', () => {
    const body = linkedNoteBody('Новая', 'Старая');
    expect(body).toContain('[[Старая]]');
  });
});
