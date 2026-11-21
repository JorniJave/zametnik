import { useEffect, useRef, useState } from 'react';
import { NodeToolbar, NodeResizer, Handle, Position, type NodeProps } from '@xyflow/react';
import { User, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { WorkspaceNodePanel } from '../WorkspaceNodePanel';
import { CanvasNoteEditor } from '../CanvasNoteEditor';
import type { EntityType } from '../../types/workspace';
import { entityColor } from '../../lib/workspace';
import type { CardData } from './workspaceTypes';
import { COLLAPSED_HEIGHT } from './workspaceTypes';

/** Функция `WorkspaceNoteCard`. */
export function WorkspaceNoteCard({ id, data, selected }: NodeProps) {
  const d = data as CardData;
  const notes = useAppStore((s) => s.notes);
  const isPerson = d.entityType === 'person';
  const note = d.noteId ? notes[d.noteId] : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(d.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const expanded = Boolean(d.expanded && d.noteId);
  const border = entityColor(d.entityType as EntityType);

  useEffect(() => {
    if (!editing) setDraft(d.label);
  }, [d.label, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  /** Функция `stopBubble`. */
  const stopBubble = (event: React.SyntheticEvent) => event.stopPropagation();

  /** Функция `commitTitle`. */
  const commitTitle = () => {
    setEditing(false);
    if (draft.trim() && draft !== d.label) d.onLabelChange?.(id, draft.trim());
    else setDraft(d.label);
  };

  return (
    <>
      {selected && note && (
        <NodeToolbar position={Position.Right} offset={10} isVisible={selected}>
          <WorkspaceNodePanel
            note={note}
            onEdit={() => d.onToggleExpand?.(id)}
            onLink={() => d.onLink?.(id)}
            onLinkedNote={() => d.onLinkedNote?.(id)}
            onSetType={(type) => d.onSetType?.(id, type)}
          />
        </NodeToolbar>
      )}

      {selected && (
        <NodeResizer
          minWidth={isPerson ? 72 : 140}
          minHeight={COLLAPSED_HEIGHT}
          isVisible={selected}
          color={border}
          lineClassName="node-resizer-line"
          handleClassName="node-resizer-handle"
          onResize={(_event, params) => {
            d.onResize?.(id, params.width, params.height);
          }}
          onResizeEnd={(_event, params) => {
            d.onResizeEnd?.(id, params.width, params.height);
          }}
        />
      )}

      <div
        className={`note-card-outer ${expanded ? 'note-card-expanded' : ''}`}
        style={{ borderColor: border, width: '100%', height: '100%', boxSizing: 'border-box' }}
      >
        <Handle type="target" position={Position.Top} className="react-flow-handle-dot note-handle-top" style={{ zIndex: 10 }} />
        <div className="note-card-header note-card-drag-handle select-none">
          {isPerson && !editing && <User size={14} className="shrink-0 opacity-70" />}
          {editing ? (
            <input
              ref={inputRef}
              className="note-card-title-input nodrag nopan"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitTitle();
                }
                event.stopPropagation();
              }}
              onMouseDown={stopBubble}
            />
          ) : (
            <span
              className="note-card-title select-none"
              onDoubleClick={(event) => {
                event.stopPropagation();
                setEditing(true);
              }}
            >
              {d.label}
            </span>
          )}
          {d.noteId && (
            <button
              type="button"
              className="note-card-expand-btn nodrag nopan"
              title={expanded ? 'Свернуть' : 'Развернуть'}
              onMouseDown={stopBubble}
              onClick={(event) => {
                event.stopPropagation();
                d.onToggleExpand?.(id);
              }}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
        {expanded && d.noteId && (
          <div className="note-card-body nodrag nopan nowheel" onMouseDown={stopBubble}>
            <CanvasNoteEditor noteId={d.noteId} />
          </div>
        )}
        <Handle type="source" position={Position.Bottom} className="react-flow-handle-dot note-handle-bottom" style={{ zIndex: 10 }} />
      </div>
    </>
  );
}

export const workspaceNodeTypes = { noteCard: WorkspaceNoteCard };
