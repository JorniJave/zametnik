import {
  Save,
  Search,
  Undo2,
  Redo2,
  MousePointer2,
  Trash2,
  PanelLeft,
  Circle,
  LayoutGrid,
} from 'lucide-react';
import { HelpButton } from '../HelpButton';
import type { RelationType } from '../../types/workspace';
import { RELATION_LABELS, DEFAULT_WORKSPACE_ID } from '../../types/workspace';
import type { WorkspaceDisplayMode } from '../../store/useAppStore';

interface WorkspaceToolbarProps {
  title: string | undefined;
  boardSearch: string;
  showBoards: boolean;
  relationType: RelationType;
  linkMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  saveState: 'saved' | 'saving' | 'error';
  workspaceId: string | null;
  displayMode: WorkspaceDisplayMode;
  onRenameBoard: () => void;
  onBoardSearchChange: (value: string) => void;
  onToggleBoards: () => void;
  onRelationTypeChange: (type: RelationType) => void;
  onToggleLinkMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onRemoveBoard: () => void;
  onShowOrbit: () => void;
  onShowCards: () => void;
}

/** Функция `WorkspaceToolbar`. */
export function WorkspaceToolbar({
  title,
  boardSearch,
  showBoards,
  relationType,
  linkMode,
  canUndo,
  canRedo,
  saveState,
  workspaceId,
  displayMode,
  onRenameBoard,
  onBoardSearchChange,
  onToggleBoards,
  onRelationTypeChange,
  onToggleLinkMode,
  onUndo,
  onRedo,
  onSave,
  onRemoveBoard,
  onShowOrbit,
  onShowCards,
}: WorkspaceToolbarProps) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 border-b shrink-0 gap-2"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          className="text-base font-semibold truncate shrink-0 hover:text-[var(--accent)]"
          onClick={onRenameBoard}
          title="Переименовать доску"
        >
          {title ?? 'База знаний'}
        </button>
        <HelpButton helpId="workspace" />
        <div className="workspace-search-wrap relative flex-1 max-w-xs hidden sm:block">
          <Search size={14} className="workspace-search-icon" />
          <input
            className="input w-full workspace-search-input py-1.5 text-sm"
            placeholder="Поиск на доске…"
            value={boardSearch}
            onChange={(e) => onBoardSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          className={`btn-icon ${displayMode === 'orbit' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : ''}`}
          title="Граф-кружки"
          onClick={onShowOrbit}
        >
          <Circle size={16} />
        </button>
        <button
          type="button"
          className={`btn-icon ${displayMode === 'cards' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : ''}`}
          title="Карточки на холсте"
          onClick={onShowCards}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          type="button"
          className={`btn-icon ${showBoards ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : ''}`}
          title="Панель досок"
          onClick={onToggleBoards}
        >
          <PanelLeft size={16} />
        </button>
        <select
          className="input py-1 text-xs max-w-[140px]"
          value={relationType}
          onChange={(event) => onRelationTypeChange(event.target.value as RelationType)}
          title="Тип новой связи"
        >
          {(Object.keys(RELATION_LABELS) as RelationType[]).map((type) => (
            <option key={type} value={type}>{RELATION_LABELS[type]}</option>
          ))}
        </select>
        <button
          type="button"
          className={`btn-icon ${linkMode ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : ''}`}
          title="Режим связи"
          onClick={onToggleLinkMode}
        >
          <MousePointer2 size={16} />
        </button>
        <button type="button" className="btn-icon" disabled={!canUndo} onClick={onUndo} title="Отменить">
          <Undo2 size={16} />
        </button>
        <button type="button" className="btn-icon" disabled={!canRedo} onClick={onRedo} title="Повторить">
          <Redo2 size={16} />
        </button>
        <button type="button" className="btn-icon" onClick={onSave} title="Сохранить">
          <Save size={16} />
        </button>
        {workspaceId !== DEFAULT_WORKSPACE_ID && (
          <button type="button" className="btn-icon text-red-400" onClick={onRemoveBoard} title="Удалить доску">
            <Trash2 size={16} />
          </button>
        )}
        <span className={`workspace-save-status ${saveState === 'error' ? 'workspace-save-status-error' : ''}`}>
          {saveState === 'saving' ? '…' : saveState === 'error' ? '!' : '✓'}
        </span>
      </div>
    </div>
  );
}
