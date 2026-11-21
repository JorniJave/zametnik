import { describe, it, expect } from 'vitest';
import {
  mergeCanvasesIntoWorkspace,
  mergeEdges,
  mergeWorkspaceNodes,
  migrateCanvasToWorkspace,
  noteNodeId,
} from './workspace';
import type { CanvasData, NoteMeta, WorkspaceData } from '../types';

const note = (id: string, type: NoteMeta['type'] = 'note'): NoteMeta => ({
  id,
  path: `${id}.md`,
  title: id,
  type,
  links: [],
  tasks: [],
  tags: [],
  modified: 0,
});

describe('workspace', () => {
  it('migrates canvas nodes to workspace', () => {
    const canvas: CanvasData = {
      id: 'week-plan',
      title: 'План',
      nodes: [
        {
          id: 'n1',
          type: 'note',
          noteId: 'alpha',
          label: 'Alpha',
          x: 10,
          y: 20,
          width: 160,
          height: 80,
        },
      ],
      edges: [],
    };
    const ws = migrateCanvasToWorkspace(canvas);
    expect(ws.id).toBe('knowledge');
    expect(ws.nodes[0].id).toBe(noteNodeId('alpha'));
  });

  it('remaps canvas edge ids to note node ids', () => {
    const canvas: CanvasData = {
      id: 'c1',
      title: 'T',
      nodes: [
        { id: 'a', type: 'note', noteId: 'one', label: '1', x: 0, y: 0, width: 80, height: 40 },
        { id: 'b', type: 'note', noteId: 'two', label: '2', x: 100, y: 0, width: 80, height: 40 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b', color: '#fff' }],
    };
    const ws = migrateCanvasToWorkspace(canvas);
    expect(ws.edges[0].source).toBe(noteNodeId('one'));
    expect(ws.edges[0].target).toBe(noteNodeId('two'));
  });

  it('merges multiple canvases without duplicate nodes', () => {
    const c1: CanvasData = {
      id: 'week-plan',
      title: 'W',
      nodes: [{ id: 'x', type: 'note', noteId: 'a', label: 'A', x: 0, y: 0, width: 80, height: 40 }],
      edges: [],
    };
    const c2: CanvasData = {
      id: 'other',
      title: 'O',
      nodes: [{ id: 'y', type: 'note', noteId: 'b', label: 'B', x: 50, y: 50, width: 80, height: 40 }],
      edges: [],
    };
    const ws = mergeCanvasesIntoWorkspace([c1, c2], null);
    expect(ws.nodes).toHaveLength(2);
  });

  it('does not mutate an existing workspace during migration', () => {
    const existing: WorkspaceData = {
      id: 'knowledge', title: 'K', schemaVersion: 1, nodes: [], edges: [], hiddenNoteIds: [],
    };
    const canvas: CanvasData = {
      id: 'other', title: 'O', nodes: [{ id: 'x', type: 'text', label: 'X', x: 0, y: 0, width: 80, height: 40 }], edges: [],
    };
    mergeCanvasesIntoWorkspace([canvas], existing);
    expect(existing.nodes).toHaveLength(0);
  });

  it('keeps explicit daily notes and respects hidden notes', () => {
    const workspace: WorkspaceData = {
      id: 'knowledge', title: 'K', schemaVersion: 1,
      nodes: [{ id: noteNodeId('daily'), kind: 'note', noteId: 'daily', x: 0, y: 0 }],
      edges: [], hiddenNoteIds: ['hidden'],
    };
    const merged = mergeWorkspaceNodes({ daily: note('daily', 'daily'), hidden: note('hidden') }, workspace, false);
    expect(merged.map((node) => node.noteId)).toEqual(['daily']);
  });

  it('keeps typed relations separate and suppresses duplicate wiki edges', () => {
    const ids = new Set([noteNodeId('a'), noteNodeId('b')]);
    const merged = mergeEdges([], [{
      id: 'wiki-a-b', source: noteNodeId('a'), target: noteNodeId('b'), kind: 'wiki',
    }], [{ id: 'typed-a-b', sourceId: 'a', targetId: 'b', relationType: 'blocks' }], ids);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: 'typed-a-b', kind: 'typed', relationType: 'blocks' });
  });
});
