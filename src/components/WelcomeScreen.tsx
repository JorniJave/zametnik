import { FolderOpen, Sparkles, Sun, CalendarDays, Brain, CheckSquare } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const FEATURES = [
  { icon: Sun, title: 'Сегодня', desc: 'Задачи, события и фокус дня в одном экране' },
  { icon: CalendarDays, title: 'Календарь', desc: 'Неделя, расписания и дедлайны' },
  { icon: Brain, title: 'База знаний', desc: 'Заметки, связи и визуальная доска' },
  { icon: CheckSquare, title: 'Задачи', desc: 'Inbox, приоритеты и напоминания' },
];

/** Функция `WelcomeScreen`. */
export function WelcomeScreen() {
  const openVault = useAppStore((s) => s.openVault);
  const loading = useAppStore((s) => s.loading);

  return (
    <div className="app-splash">
      <div className="app-splash-glow" aria-hidden />
      <div className="max-w-2xl w-full mx-4 relative z-10">
        <div className="text-center mb-10">
          <div className="app-logo mx-auto mb-5">Z</div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Zametnik</h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-md mx-auto">
            Личный органайзер: заметки, задачи, календарь и база знаний — всё локально на вашем ПК
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="app-feature-card">
              <div className="app-feature-icon">
                <Icon size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold">{title}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            className="btn-primary justify-center py-3 px-6 text-base min-w-[200px]"
            disabled={loading}
            onClick={() => openVault(true)}
          >
            <Sparkles size={18} />
            {loading ? 'Подготовка…' : 'Начать работу'}
          </button>
          <button
            className="btn-secondary justify-center py-3 px-6 text-base min-w-[200px]"
            disabled={loading}
            onClick={() => openVault(false)}
          >
            <FolderOpen size={18} />
            Открыть папку vault
          </button>
        </div>

        <p className="text-xs text-center text-[var(--text-secondary)] mt-8">
          Данные в обычных .md файлах · без облака · полная приватность
        </p>
      </div>
    </div>
  );
}
