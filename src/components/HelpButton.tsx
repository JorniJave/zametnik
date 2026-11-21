import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import { VIEW_HELP } from '../lib/viewHelpContent';

interface HelpButtonProps {
  helpId: string;
  className?: string;
}

/** Кнопка «?» — подсказка во всплывающем окне (не обрезается панелью) */
export function HelpButton({ helpId, className = '' }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  const help = VIEW_HELP[helpId];

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setAnchor({ top: rect.bottom + 6, left: rect.left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    /** Функция `close`. */
    const close = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof globalThis.Node)) return;
      if (wrapRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!help) return null;

  return (
    <div className={`help-popover-wrap ${className}`} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="btn-icon text-[var(--text-secondary)] hover:text-[var(--accent)]"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        title="Подсказка"
        aria-expanded={open}
      >
        <HelpCircle size={18} />
      </button>
      {open &&
        createPortal(
          <div
            className="help-popover help-popover-floating"
            role="dialog"
            style={{ top: anchor.top, left: anchor.left }}
          >
            <p className="help-popover-title">{help.title}</p>
            <ul className="help-popover-list">
              {help.lines.map((line: string) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
