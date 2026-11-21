import { useEffect, useRef, type ReactNode } from 'react';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Всплывающее меню холста: закрывается кликом вне, Escape и при сдвиге графа.
 * Позиция экранная — при панорамировании меню закрывается, а не «едет» за холстом.
 */
export function CanvasContextMenu({ x, y, onClose, children, className = '' }: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /** Функция `onPointerDown`. */
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof globalThis.Node)) return;
      if (ref.current?.contains(target)) return;
      onClose();
    };
    /** Функция `onKeyDown`. */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true);
    }, 0);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`fixed z-50 panel border rounded-lg shadow-xl py-1 text-sm ${className}`}
      style={{ left: x, top: y, borderColor: 'var(--border)' }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}
