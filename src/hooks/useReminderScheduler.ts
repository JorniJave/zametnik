import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getAPI } from '../lib/api';
import { tasksDueForReminder, reminderBody, formatReminderKey } from '../lib/reminders';

const POLL_MS = 30_000;

/** Функция `useReminderScheduler`. */
export function useReminderScheduler() {
  const vaultPath = useAppStore((s) => s.vaultPath);
  const planning = useAppStore((s) => s.planning);
  const settings = useAppStore((s) => s.settings);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!vaultPath || !settings?.remindersEnabled) return;

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    /** Функция `tick`. */
    const tick = () => {
      const defaultMin = settings.defaultReminderMinutes ?? 15;
      const due = tasksDueForReminder(planning.tasks, defaultMin);
      const api = getAPI();

      for (const { task, kind } of due) {
        const key = formatReminderKey(task.id, kind);
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);

        const title = kind === 'due' ? `Срок: ${task.title}` : `Напоминание: ${task.title}`;
        const body = reminderBody(task);
        api.showNotification(title, body).catch(() => {});
      }
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [vaultPath, planning.tasks, settings?.remindersEnabled, settings?.defaultReminderMinutes]);
}
