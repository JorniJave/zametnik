import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { AppNav } from './components/AppNav';
import { VisualWorkspace } from './components/VisualWorkspace';
import { NotesView } from './components/NotesView';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SettingsView } from './components/SettingsView';
import { TodayView } from './components/TodayView';
import { TasksView } from './components/TasksView';
import { PlannerCalendarView } from './components/PlannerCalendarView';
import { SchedulesView } from './components/SchedulesView';
import { useReminderScheduler } from './hooks/useReminderScheduler';

/** Функция `BootScreen`. */
function BootScreen() {
  return (
    <div className="app-splash">
      <div className="app-splash-glow" aria-hidden />
      <div className="text-center relative z-10">
        <div className="app-logo mx-auto mb-4 animate-pulse">Z</div>
        <p className="text-sm text-[var(--text-secondary)]">Загрузка Zametnik…</p>
      </div>
    </div>
  );
}

export default function App() {
  const initialized = useAppStore((s) => s.initialized);
  const vaultPath = useAppStore((s) => s.vaultPath);
  const viewMode = useAppStore((s) => s.viewMode);
  const init = useAppStore((s) => s.init);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const [mobileNav, setMobileNav] = useState(false);

  useReminderScheduler();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    /** Функция `handler`. */
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        setViewMode(viewMode === 'workspace' ? 'today' : 'workspace');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode, setViewMode]);

  if (!initialized) {
    return <BootScreen />;
  }

  if (!vaultPath) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex flex-col h-full">
      <AppNav mobileOpen={mobileNav} onMobileToggle={() => setMobileNav((v) => !v)} />

      {viewMode === 'today' && <TodayView />}
      {viewMode === 'notes' && <NotesView />}
      {viewMode === 'calendar' && <PlannerCalendarView />}
      {viewMode === 'tasks' && <TasksView />}
      {viewMode === 'schedules' && <SchedulesView />}
      {viewMode === 'workspace' && <VisualWorkspace />}
      {viewMode === 'settings' && (
        <div className="flex-1 overflow-y-auto">
          <SettingsView />
        </div>
      )}
    </div>
  );
}
