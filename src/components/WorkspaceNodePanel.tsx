import { Pencil, Link2, Plus, User, Unlink } from 'lucide-react';
import type { NoteMeta } from '../types';
import type { EntityType } from '../types/workspace';

interface WorkspaceNodePanelProps {
  note: NoteMeta;
  style?: React.CSSProperties;
  onEdit: () => void;
  onLink: () => void;
  onLinkedNote: () => void;
  onSetType: (type: EntityType) => void;
  onUnlink?: () => void;
}

/** Функция `WorkspaceNodePanel`. */
export function WorkspaceNodePanel({
  note,
  style,
  onEdit,
  onLink,
  onLinkedNote,
  onSetType,
  onUnlink,
}: WorkspaceNodePanelProps) {
  return (
    <div className="workspace-node-panel" style={style}>
      <p className="text-xs font-semibold truncate mb-2">{note.title}</p>
      <div className="flex flex-wrap gap-1">
        <button type="button" className="workspace-panel-btn" onClick={onEdit} title="Редактировать">
          <Pencil size={14} />
        </button>
        <button type="button" className="workspace-panel-btn" onClick={onLinkedNote} title="Связанная заметка">
          <Plus size={14} />
        </button>
        <button type="button" className="workspace-panel-btn" onClick={onLink} title="Связать">
          <Link2 size={14} />
        </button>
        <button type="button" className="workspace-panel-btn" onClick={() => onSetType('person')} title="Человек">
          <User size={14} />
        </button>
        {onUnlink && (
          <button type="button" className="workspace-panel-btn" onClick={onUnlink} title="Убрать связь">
            <Unlink size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
