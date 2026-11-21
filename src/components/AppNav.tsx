import {
  Sun,
  CalendarDays,
  CheckSquare,
  Clock,
  Brain,
  Settings,
  Menu,
  FileText,
} from 'lucide-react';
import { useAppStore, type ViewMode } from '../store/useAppStore';
import { DEFAULT_WORKSPACE_ID } from '../types/workspace';

const NAV: { id: ViewMode; label: string; icon: typeof Sun }[] = [
  { id: 'today', label: 'Сегодня', icon: Sun },
  { id: 'notes', label: 'Заметки', icon: FileText },
  { id: 'calendar', label: 'Календарь', icon: CalendarDays },
  { id: 'tasks', label: 'Задачи', icon: CheckSquare },
  { id: 'schedules', label: 'Расписания', icon: Clock },
  { id: 'workspace', label: 'База знаний', icon: Brain },
];

interface AppNavProps {
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

/** Функция `AppNav`. */
export function AppNav({ mobileOpen, onMobileToggle }: AppNavProps) {
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const loadWorkspace = useAppStore((s) => s.loadWorkspace);
  const vaultPath = useAppStore((s) => s.vaultPath);

  /** Функция `go`. */
  const go = (mode: ViewMode) => {
    if (mode === 'workspace') {
      loadWorkspace(DEFAULT_WORKSPACE_ID);
    } else {
      setViewMode(mode);
    }
    onMobileToggle();
  };

  const vaultLabel = vaultPath?.split(/[/\\]/).pop() ?? '';

  return (
    <>
      <header className="app-header">
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <button className="btn-icon lg:hidden" type="button" onClick={onMobileToggle} aria-label="Меню">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="app-logo-sm">Z</div>
            <div className="min-w-0 hidden sm:block">
              <div className="text-sm font-bold leading-none">Zametnik</div>
              {vaultLabel && (
                <div className="text-[10px] text-[var(--text-secondary)] truncate max-w-[140px]">{vaultLabel}</div>
              )}
            </div>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 flex-1 min-w-0 justify-end">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              className={`app-nav-item shrink-0 ${viewMode === id ? 'app-nav-item-active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => go('settings')}
            className={`app-nav-item shrink-0 ${viewMode === 'settings' ? 'app-nav-item-active' : ''}`}
          >
            <Settings size={16} />
            Настройки
          </button>
        </nav>
      </header>

      {mobileOpen && (
        <div className="lg:hidden app-mobile-nav">
          <div className="flex flex-col gap-1">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                className={`app-nav-item w-full ${viewMode === id ? 'app-nav-item-active' : ''}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => go('settings')}
              className={`app-nav-item w-full ${viewMode === 'settings' ? 'app-nav-item-active' : ''}`}
            >
              <Settings size={16} />
              Настройки
            </button>
          </div>
        </div>
      )}
    </>
  );
}
