import { describe, it, expect } from 'vitest';
import { removeWikiLinkFromContent, addWikiLinkToContent } from './knowledge';
import { buildLinkedNoteContent } from './noteCommands';

describe('noteCommands', () => {
  it('builds linked note with entity type', () => {
    const body = buildLinkedNoteContent('Новая', 'Старая', { entityType: 'person' });
    expect(body).toContain('type: person');
    expect(body).toContain('[[Старая]]');
  });

  it('unlink removes wiki reference', () => {
    const c = addWikiLinkToContent('# A\n', 'B');
    const out = removeWikiLinkFromContent(c, 'B');
    expect(out).not.toContain('[[B]]');
  });
});
