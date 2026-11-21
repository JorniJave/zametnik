import { useState } from 'react';
import { Download, FileSpreadsheet, Calendar } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { exportPlanningWorkbook, exportScheduleTemplate, downloadWorkbook } from '../lib/excel';
import { exportEventsToIcs, downloadIcs } from '../lib/ics';
import { getPendingSyncCount } from '../lib/syncBridge';
import { getDeviceId } from '../core/sync/device';
import { ExcelImportModal } from './ExcelImportModal';
import { ReminderMinutesInput } from './ReminderMinutesInput';

/** Функция `Toggle`. */
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

/** Функция `SettingsView`. */
export function SettingsView() {
  const settings = useAppStore((s) => s.settings);
  const vaultPath = useAppStore((s) => s.vaultPath);
  const planning = useAppStore((s) => s.planning);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const [importOpen, setImportOpen] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [exportScheduleId, setExportScheduleId] = useState(planning.schedules[0]?.id ?? '');
  const isElectron = typeof window !== 'undefined' && Boolean(window.zametnik);

  /** Функция `exportAll`. */
  const exportAll = async () => {
    setExportMsg('Сохранение…');
    try {
      const buf = exportPlanningWorkbook(planning, new Date(), 7);
      const path = await downloadWorkbook(buf, `zametnik-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setExportMsg(`Готово: ${path}`);
    } catch {
      setExportMsg('Ошибка экспорта');
    }
  };

  /** Функция `exportOneSchedule`. */
  const exportOneSchedule = async () => {
    const schedule = planning.schedules.find((s) => s.id === exportScheduleId);
    if (!schedule) return;
    setExportMsg('Сохранение…');
    try {
      const safeName = schedule.title.replace(/[^\w\u0400-\u04FF-]+/g, '_').slice(0, 40);
      /** Функция `ws`. */
      const ws = (settings?.weekStartsOn ?? 1) as 0 | 1;
      const buf = exportScheduleTemplate(schedule, ws);
      const path = await downloadWorkbook(buf, `расписание-${safeName}.xlsx`);
      setExportMsg(`Готово: ${path}`);
    } catch {
      setExportMsg('Ошибка экспорта');
    }
  };

  /** Функция `exportIcs`. */
  const exportIcs = () => {
    const content = exportEventsToIcs(planning.events);
    downloadIcs(content, `zametnik-${new Date().toISOString().slice(0, 10)}.ics`);
    setExportMsg('Календарь .ics сохранён');
  };

  const pendingSync = getPendingSyncCount();

  /** Функция `setLaunchAtLogin`. */
  const setLaunchAtLogin = async (enabled: boolean) => {
    await updateSettings({ launchAtLogin: enabled });
  };

  if (!settings) return null;

  return (
    <div className="max-w-xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Настройки</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Папка Vault</label>
          <p className="text-sm text-[var(--text-secondary)] font-mono bg-[var(--bg-secondary)] px-3 py-2 rounded-lg break-all">
            {vaultPath}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Тема</label>
          <div className="flex gap-2">
            {(['dark', 'light'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => updateSettings({ theme })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  settings.theme === theme
                    ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'border-[var(--border)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {theme === 'dark' ? 'Тёмная' : 'Светлая'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Открывать «Сегодня» при запуске</div>
          </div>
          <Toggle checked={settings.autoOpenDaily} onChange={() => updateSettings({ autoOpenDaily: !settings.autoOpenDaily })} />
        </div>

        {isElectron && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Запускать с Windows</div>
              <div className="text-xs text-[var(--text-secondary)]">Сворачивается в tray</div>
            </div>
            <Toggle checked={settings.launchAtLogin ?? false} onChange={() => setLaunchAtLogin(!settings.launchAtLogin)} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Начало недели</label>
          <select
            value={settings.weekStartsOn}
            onChange={(e) => updateSettings({ weekStartsOn: Number(e.target.value) as 0 | 1 })}
            className="w-full px-3 py-2 rounded-lg border bg-[var(--bg-secondary)] border-[var(--border)] text-sm"
          >
            <option value={1}>Понедельник</option>
            <option value={0}>Воскресенье</option>
          </select>
        </div>

        <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold">Напоминания</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-medium">Уведомления о задачах</div>
            <Toggle
              checked={settings.remindersEnabled ?? true}
              onChange={() => updateSettings({ remindersEnabled: !settings.remindersEnabled })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">По умолчанию напомнить за</label>
            <ReminderMinutesInput
              value={settings.defaultReminderMinutes ?? 15}
              onChange={(m) => updateSettings({ defaultReminderMinutes: m ?? 15 })}
            />
          </div>
        </div>

        <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileSpreadsheet size={16} /> Excel — как пользоваться
          </h3>
          <ol className="text-xs text-[var(--text-secondary)] space-y-2 list-decimal list-inside">
            <li>
              <strong>Экспорт всего</strong> — листы «События» (календарь по датам) и «Задачи».
            </li>
            <li>
              <strong>Экспорт шаблона</strong> — лист «Таблица» для редактирования + «Неделя» для просмотра.
            </li>
            <li>Редактируйте «Таблицу» в Excel: День · Начало · Конец · Название · Описание.</li>
            <li>
              <strong>Импорт</strong> — подхватит задачи, события и шаблоны из соответствующих листов.
            </li>
          </ol>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={exportAll}>
              <Download size={16} /> Экспорт всего
            </button>
            <button type="button" className="btn-ghost" onClick={() => setImportOpen(true)}>
              Импорт из Excel
            </button>
            <button type="button" className="btn-ghost" onClick={exportIcs}>
              <Calendar size={16} /> Экспорт .ics
            </button>
          </div>

          {planning.schedules.length > 0 && (
            <div className="p-3 rounded-lg border space-y-2" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium">Экспорт одного расписания</p>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={exportScheduleId}
                  onChange={(e) => setExportScheduleId(e.target.value)}
                  className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg border text-sm bg-[var(--bg-secondary)] border-[var(--border)]"
                >
                  {planning.schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-ghost text-sm" onClick={exportOneSchedule}>
                  <Download size={14} /> Скачать .xlsx
                </button>
              </div>
            </div>
          )}

          {exportMsg && (
            <p className="text-xs text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-2 rounded-lg">{exportMsg}</p>
          )}
        </div>

        <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold">Синхронизация</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Локальный режим: все данные на этом устройстве. Журнал изменений готов для будущего sync-сервера.
          </p>
          <p className="text-xs font-mono text-[var(--text-secondary)]">
            Устройство: {getDeviceId().slice(0, 8)}… · В очереди: {pendingSync} операций
          </p>
        </div>

        <button type="button" className="btn-ghost" onClick={() => setViewMode('today')}>
          ← На главную
        </button>
      </div>

      <ExcelImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
