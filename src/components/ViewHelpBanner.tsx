import { X } from 'lucide-react';
import { hideViewHelp, useViewHelpVisible } from '../lib/viewHelp';

interface ViewHelpBannerProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

/** Функция `ViewHelpBanner`. */
export function ViewHelpBanner({ id, title, children }: ViewHelpBannerProps) {
  const visible = useViewHelpVisible(id);

  if (!visible) return null;

  return (
    <div
      className="mb-4 p-3 rounded-xl border text-sm"
      style={{ borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-semibold text-[var(--accent)]">{title}</p>
        <button
          type="button"
          className="btn-icon shrink-0"
          onClick={() => hideViewHelp(id)}
          title="Скрыть подсказку"
        >
          <X size={14} />
        </button>
      </div>
      <div className="text-[var(--text-secondary)] space-y-1 text-xs leading-relaxed">{children}</div>
    </div>
  );
}
