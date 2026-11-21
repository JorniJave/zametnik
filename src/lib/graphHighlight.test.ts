import { describe, it, expect } from 'vitest';
import { connectedNodeIds, filteredGraph, isLinkHighlighted, scopeGraph } from './graphHighlight';

describe('graphHighlight', () => {
  const graph = {
    nodes: [
      { id: 'a', title: 'A', type: 'note' as const },
      { id: 'b', title: 'B', type: 'note' as const },
      { id: 'c', title: 'C', type: 'note' as const },
    ],
    links: [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ],
  };

  it('returns null when no selection', () => {
    expect(connectedNodeIds(graph, null)).toBeNull();
  });

  it('includes neighbors', () => {
    const set = connectedNodeIds(graph, 'b');
    expect(set?.has('a')).toBe(true);
    expect(set?.has('b')).toBe(true);
    expect(set?.has('c')).toBe(true);
  });

  it('highlights direct links only', () => {
    const set = connectedNodeIds(graph, 'b')!;
    expect(isLinkHighlighted({ source: 'a', target: 'b' }, set, 'b')).toBe(true);
    expect(isLinkHighlighted({ source: 'a', target: 'c' }, set, 'b')).toBe(false);
  });

  it('keeps a week hub, its days and their links', () => {
    const notes = {
      'неделя 36 - 2026': {
        id: 'неделя 36 - 2026',
        path: 'Недели/Неделя 36 - 2026.md',
        title: 'Неделя 36 - 2026',
        type: 'week' as const,
        links: ['2026-08-31'],
        tasks: [],
        tags: [],
        modified: 0,
      },
      '2026-08-31': {
        id: '2026-08-31',
        path: '2026-08-31.md',
        title: '2026-08-31',
        type: 'daily' as const,
        links: ['Проект Альфа', 'Неделя 36 - 2026'],
        tasks: [],
        tags: [],
        modified: 0,
      },
      'проект альфа': {
        id: 'проект альфа',
        path: 'Проекты/Проект Альфа.md',
        title: 'Проект Альфа',
        type: 'project' as const,
        links: [],
        tasks: [],
        tags: [],
        modified: 0,
      },
      другое: {
        id: 'другое',
        path: 'Другое.md',
        title: 'Другое',
        type: 'note' as const,
        links: [],
        tasks: [],
        tags: [],
        modified: 0,
      },
    };
    const full = {
      nodes: Object.values(notes).map((n) => ({ id: n.id, title: n.title, type: n.type })),
      links: [
        { source: 'неделя 36 - 2026', target: '2026-08-31' },
        { source: '2026-08-31', target: 'проект альфа' },
        { source: 'другое', target: 'проект альфа' },
      ],
    };
    const visible = filteredGraph(full, notes, 'week', 'Неделя 36 - 2026');
    const ids = visible.nodes.map((n) => n.id);
    expect(ids).toContain('неделя 36 - 2026');
    expect(ids).toContain('2026-08-31');
    expect(ids).toContain('проект альфа');
    expect(ids).not.toContain('другое');
  });

  it('home graph hides days and weeks until a topic is opened', () => {
    const notes = {
      здоровье: { id: 'здоровье', path: 'Проекты/Здоровье.md', title: 'Здоровье', type: 'project' as const, links: ['2026-10-01'], tasks: [], tags: [], modified: 0 },
      '2026-10-01': { id: '2026-10-01', path: '2026-10-01.md', title: '2026-10-01', type: 'daily' as const, links: [], tasks: [], tags: [], modified: 0 },
      'неделя 40 - 2026': { id: 'неделя 40 - 2026', path: 'Недели/Неделя 40 - 2026.md', title: 'Неделя 40 - 2026', type: 'week' as const, links: [], tasks: [], tags: [], modified: 0 },
    };
    const full = {
      nodes: Object.values(notes).map((n) => ({ id: n.id, title: n.title, type: n.type })),
      links: [{ source: 'здоровье', target: '2026-10-01' }],
    };
    const home = scopeGraph(full, notes, null);
    expect(home.nodes.map((n) => n.id)).toEqual(['здоровье']);
    const around = scopeGraph(full, notes, 'здоровье');
    expect(around.nodes.map((n) => n.id).sort()).toEqual(['2026-10-01', 'здоровье']);
    const hidden = scopeGraph(full, notes, null, ['неделя 40 - 2026']);
    expect(hidden.nodes.map((n) => n.id)).not.toContain('неделя 40 - 2026');
  });
});
