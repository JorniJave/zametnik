import { useCallback, useEffect, useRef, useState } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { KnowledgeNotesPanel } from './KnowledgeNotesPanel';
import { KnowledgeEditorPane } from './KnowledgeEditorPane';
import { useAppStore } from '../store/useAppStore';

interface NoteDockProps {
  open: boolean;
  onClose: () => void;
}

/** Функция `NoteDock`. */
export function NoteDock({ open, onClose }: NoteDockProps) {
  const activeNoteId = useAppStore((s) => s.activeNoteId);
  const openWorkspaceNote = useAppStore((s) => s.openWorkspaceNote);
  const [pos, setPos] = useState({ x: 72, y: 72 });
  const [size, setSize] = useState({ w: 420, h: 520 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos.x, pos.y]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    resizeRef.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    e.preventDefault();
    e.stopPropagation();
  }, [size.w, size.h]);

  useEffect(() => {
    /** Функция `onMove`. */
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        setPos({
          x: Math.max(8, dragRef.current.px + e.clientX - dragRef.current.x),
          y: Math.max(8, dragRef.current.py + e.clientY - dragRef.current.y),
        });
      }
      if (resizeRef.current) {
        setSize({
          w: Math.max(320, resizeRef.current.w + e.clientX - resizeRef.current.x),
          h: Math.max(280, resizeRef.current.h + e.clientY - resizeRef.current.y),
        });
      }
    };
    /** Функция `onUp`. */
    const onUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="note-dock"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      <div className="note-dock-header" onMouseDown={onDragStart}>
        <GripHorizontal size={14} className="opacity-50" />
        <span className="text-sm font-medium flex-1">Заметки</span>
        <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Закрыть">
          <X size={14} />
        </button>
      </div>
      <div className="note-dock-body">
        <KnowledgeNotesPanel
          selectedNoteId={activeNoteId}
          onSelect={(id) => void openWorkspaceNote(id)}
          embedded
        />
        <KnowledgeEditorPane embedded />
      </div>
      <div className="note-dock-resize" onMouseDown={onResizeStart} aria-hidden />
    </div>
  );
}
