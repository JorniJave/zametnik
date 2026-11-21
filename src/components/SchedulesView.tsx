import { useMemo, useState } from 'react';
import { Plus, Trash2, ListPlus, Download, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { createId, slotDescription } from '../lib/planning';
import { exportScheduleTemplate, exportMergedSchedules, downloadWorkbook } from '../lib/excel';
import { isValidTimeRange, normalizeEndTime } from '../lib/time';
import { Modal } from './Modal';
import { ViewHelpBanner } from './ViewHelpBanner';
import { HelpButton } from './HelpButton';
import { TimeInput } from './TimeInput';
import type { ScheduleCombo, ScheduleSlot, ScheduleTemplate } from '../types/planning';

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** Функция `orderedDays`. */
function orderedDays(weekStartsOn: 0 | 1): number[] {
  return weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
}

/** Сортировка: порядок в столбце, затем время */
function slotsForWeekday(slots: ScheduleSlot[], weekday: number): ScheduleSlot[] {
  return slots
    .filter((s) => s.weekdays.includes(weekday))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.startTime.localeCompare(b.startTime));
}

/** Функция `ensureSortOrder`. */
function ensureSortOrder(slots: ScheduleSlot[], weekday: number): ScheduleSlot[] {
  const daySlots = slotsForWeekday(slots, weekday);
  let changed = false;
  const orderMap = new Map<string, number>();
  daySlots.forEach((s, i) => {
    const order = s.sortOrder ?? i * 10;
    if (s.sortOrder === undefined) changed = true;
    orderMap.set(s.id, order);
  });
  if (!changed) return slots;
  return slots.map((s) => (orderMap.has(s.id) ? { ...s, sortOrder: orderMap.get(s.id) } : s));
}

/** Функция `moveSlotInDay`. */
function moveSlotInDay(
  schedule: ScheduleTemplate,
  slotId: string,
  weekday: number,
  direction: -1 | 1
): ScheduleTemplate {
  const slots = ensureSortOrder(schedule.slots, weekday);
  const daySlots = slotsForWeekday(slots, weekday);
  const idx = daySlots.findIndex((s) => s.id === slotId);
  const target = idx + direction;
  if (idx < 0 || target < 0 || target >= daySlots.length) return schedule;

  const a = daySlots[idx];
  const b = daySlots[target];
  const orderA = a.sortOrder ?? idx * 10;
  const orderB = b.sortOrder ?? target * 10;

  const nextSlots = slots.map((s) => {
    if (s.id === a.id) return { ...s, sortOrder: orderB };
    if (s.id === b.id) return { ...s, sortOrder: orderA };
    return s;
  });
  return { ...schedule, slots: nextSlots };
}

interface MergedSlot {
  slot: ScheduleSlot;
  schedule: ScheduleTemplate;
}

/** Функция `mergedSlotsForWeekday`. */
function mergedSlotsForWeekday(schedules: ScheduleTemplate[], weekday: number): MergedSlot[] {
  const items: MergedSlot[] = [];
  for (const schedule of schedules) {
    for (const slot of slotsForWeekday(schedule.slots, weekday)) {
      items.push({ slot, schedule });
    }
  }
  return items.sort(
    (a, b) =>
      (a.slot.sortOrder ?? 0) - (b.slot.sortOrder ?? 0) ||
      a.slot.startTime.localeCompare(b.slot.startTime) ||
      a.slot.title.localeCompare(b.slot.title)
  );
}

/** Функция `SlotCard`. */
function SlotCard({
  slot,
  schedule,
  dayIndex,
  dayCount,
  scheduleLabel,
  onChange,
  onDelete,
  onMove,
  readOnly,
}: {
  slot: ScheduleSlot;
  schedule: ScheduleTemplate;
  dayIndex: number;
  dayCount: number;
  scheduleLabel?: string;
  onChange: (next: ScheduleTemplate) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  readOnly?: boolean;
}) {
  const [timeError, setTimeError] = useState('');

  /** Функция `updateSlot`. */
  const updateSlot = (patch: Partial<ScheduleSlot>) => {
    let merged: ScheduleSlot = { ...slot, ...patch };
    if (merged.startTime && merged.endTime && !isValidTimeRange(merged.startTime, merged.endTime)) {
      merged.endTime = normalizeEndTime(merged.startTime, merged.endTime);
    }
    setTimeError('');
    const slots = schedule.slots.map((s) => (s.id === slot.id ? merged : s));
    onChange({ ...schedule, slots });
  };

  /** Функция `commitEndTime`. */
  const commitEndTime = (endTime: string) => {
    if (!isValidTimeRange(slot.startTime, endTime)) {
      setTimeError('Конец должен быть позже начала');
      return 'Конец должен быть позже начала';
    }
    setTimeError('');
    return null;
  };

  const borderColor = slot.color ?? schedule.color ?? 'var(--border)';
  const fieldClass =
    'w-full min-w-0 px-2 py-1.5 rounded-md border bg-[var(--bg-secondary)] border-[var(--border)] disabled:opacity-70';

  return (
    <div className="schedule-slot-card space-y-2" style={{ borderColor, borderLeftWidth: 3 }}>
      {scheduleLabel && (
        <p className="text-[10px] font-medium truncate opacity-80 -mb-0.5" style={{ color: borderColor }}>
          {scheduleLabel}
        </p>
      )}

      <div className="flex items-start gap-1.5">
        <input
          value={slot.title}
          onChange={(e) => updateSlot({ title: e.target.value })}
          disabled={readOnly}
          className={`${fieldClass} text-sm font-medium flex-1`}
          placeholder="Название"
        />
        {!readOnly && (
          <div className="flex flex-col shrink-0 -mr-0.5">
            <button
              type="button"
              className="btn-icon-sm disabled:opacity-30"
              disabled={dayIndex <= 0}
              onClick={() => onMove(-1)}
              title="Выше"
            >
              <ChevronUp size={13} />
            </button>
            <button
              type="button"
              className="btn-icon-sm disabled:opacity-30"
              disabled={dayIndex >= dayCount - 1}
              onClick={() => onMove(1)}
              title="Ниже"
            >
              <ChevronDown size={13} />
            </button>
            <button type="button" className="btn-icon-sm text-[var(--accent)] mt-0.5" onClick={onDelete} title="Удалить">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-0.5 min-w-0">
          Начало
          <TimeInput
            value={slot.startTime}
            onChange={(v) => updateSlot({ startTime: v })}
            disabled={readOnly}
            className={`${fieldClass} text-xs tabular-nums`}
          />
        </label>
        <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-0.5 min-w-0">
          Конец
          <TimeInput
            value={slot.endTime}
            onChange={(v) => updateSlot({ endTime: v })}
            onBlurValidate={commitEndTime}
            disabled={readOnly}
            className={`${fieldClass} text-xs tabular-nums ${timeError ? 'border-[var(--accent)]' : ''}`}
          />
        </label>
      </div>

      {timeError && <p className="text-[10px] text-[var(--accent)] -mt-1">{timeError}</p>}

      <input
        value={slotDescription(slot)}
        onChange={(e) => updateSlot({ description: e.target.value, location: undefined })}
        disabled={readOnly}
        placeholder="Описание"
        className={`${fieldClass} text-xs`}
      />
    </div>
  );
}

/** Функция `SchedulesView`. */
export function SchedulesView() {
  const planning = useAppStore((s) => s.planning);
  const settings = useAppStore((s) => s.settings);
  const saveSchedules = useAppStore((s) => s.saveSchedules);
  const saveCombos = useAppStore((s) => s.saveCombos);

  const [mode, setMode] = useState<'edit' | 'merge'>('edit');
  const [selectedId, setSelectedId] = useState(planning.schedules[0]?.id ?? '');
  const [mergeIds, setMergeIds] = useState<string[]>(
    planning.combos[0]?.scheduleIds ?? planning.schedules.slice(0, 2).map((s) => s.id)
  );
  const [comboOpen, setComboOpen] = useState(false);
  const [comboTitle, setComboTitle] = useState('');

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickStart, setQuickStart] = useState('09:00');
  const [quickEnd, setQuickEnd] = useState('09:45');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickDays, setQuickDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [quickTimeError, setQuickTimeError] = useState('');

  const weekStartsOn = settings?.weekStartsOn ?? 1;
  const days = useMemo(() => orderedDays(weekStartsOn), [weekStartsOn]);

  const selected = planning.schedules.find((s) => s.id === selectedId) ?? planning.schedules[0];
  const mergeSchedules = planning.schedules.filter((s) => mergeIds.includes(s.id));

  /** Функция `updateSchedule`. */
  const updateSchedule = async (next: ScheduleTemplate) => {
    const schedules = planning.schedules.map((s) => (s.id === next.id ? next : s));
    await saveSchedules(schedules);
  };

  /** Функция `addSchedule`. */
  const addSchedule = async () => {
    const schedule: ScheduleTemplate = {
      id: createId(),
      title: 'Новое расписание',
      slots: [],
      exceptions: [],
      color: '#7c9eff',
    };
    await saveSchedules([...planning.schedules, schedule]);
    setSelectedId(schedule.id);
  };

  /** Функция `addSlotForDay`. */
  const addSlotForDay = async (weekday: number) => {
    if (!selected || mode !== 'edit') return;
    const slot: ScheduleSlot = {
      id: createId(),
      weekdays: [weekday],
      startTime: '09:00',
      endTime: '09:45',
      title: 'Новый пункт',
      description: '',
    };
    await updateSchedule({ ...selected, slots: [...selected.slots, slot] });
  };

  /** Функция `quickAdd`. */
  const quickAdd = async () => {
    if (!selected || !quickTitle.trim() || quickDays.length === 0) return;
    if (!isValidTimeRange(quickStart, quickEnd)) {
      setQuickTimeError('Конец должен быть позже начала');
      return;
    }
    setQuickTimeError('');
    const newSlots: ScheduleSlot[] = quickDays.map((weekday) => ({
      id: createId(),
      weekdays: [weekday],
      startTime: quickStart,
      endTime: quickEnd,
      title: quickTitle.trim(),
      description: quickDesc.trim(),
    }));
    await updateSchedule({ ...selected, slots: [...selected.slots, ...newSlots] });
    setQuickOpen(false);
    setQuickTitle('');
    setQuickDesc('');
  };

  /** Функция `saveCombo`. */
  const saveCombo = async () => {
    if (!comboTitle.trim() || mergeIds.length < 2) return;
    const combo: ScheduleCombo = {
      id: createId(),
      title: comboTitle.trim(),
      scheduleIds: [...mergeIds],
    };
    await saveCombos([...planning.combos, combo]);
    setComboOpen(false);
    setComboTitle('');
  };

  /** Функция `loadCombo`. */
  const loadCombo = (combo: ScheduleCombo) => {
    setMergeIds(combo.scheduleIds);
    setMode('merge');
  };

  /** Функция `toggleMergeId`. */
  const toggleMergeId = (id: string) => {
    setMergeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /** Функция `exportCurrent`. */
  const exportCurrent = async () => {
    const ws = weekStartsOn;
    if (mode === 'merge' && mergeSchedules.length > 0) {
      const title = mergeSchedules.map((s) => s.title).join(' + ');
      await downloadWorkbook(
        exportMergedSchedules(mergeSchedules, title, ws),
        `расписание-объединение.xlsx`
      );
      return;
    }
    if (!selected) return;
    const safeName = selected.title.replace(/[^\w\u0400-\u04FF-]+/g, '_').slice(0, 40);
    await downloadWorkbook(exportScheduleTemplate(selected, ws), `расписание-${safeName}.xlsx`);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 gap-3 min-h-0">
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <h1 className="text-2xl font-bold">Расписания</h1>
        <HelpButton helpId="schedules" />
        <div className="flex rounded-lg border overflow-hidden text-xs" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            className={`px-3 py-1.5 ${mode === 'edit' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)]'}`}
            onClick={() => setMode('edit')}
          >
            Редактировать
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 flex items-center gap-1 ${mode === 'merge' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)]'}`}
            onClick={() => setMode('merge')}
          >
            <Layers size={12} /> Объединённый вид
          </button>
        </div>
      </div>

      <ViewHelpBanner id="schedules" title="Как устроены расписания">
        <p><strong>Редактировать</strong> — один шаблон (школа, спорт…).</p>
        <p><strong>Объединённый вид</strong> — несколько шаблонов в одних столбцах.</p>
        <p>Стрелки ↑↓ меняют порядок в столбце. Время проверяется при выходе из поля.</p>
      </ViewHelpBanner>

      {mode === 'edit' ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm bg-[var(--bg-secondary)] border-[var(--border)]"
          >
            {planning.schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <button type="button" className="btn-ghost text-xs" onClick={addSchedule}>
            <Plus size={14} /> Новый шаблон
          </button>
          <button type="button" className="btn-primary text-xs" onClick={() => setQuickOpen(true)}>
            <ListPlus size={14} /> Быстрое добавление
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={exportCurrent}>
            <Download size={14} /> Excel
          </button>
        </div>
      ) : (
        <div className="space-y-2 shrink-0">
          <p className="text-xs text-[var(--text-secondary)]">Выберите шаблоны для объединения:</p>
          <div className="flex flex-wrap gap-2">
            {planning.schedules.map((s) => (
              <label
                key={s.id}
                className={`px-2 py-1 rounded-lg border text-xs cursor-pointer flex items-center gap-1.5 ${
                  mergeIds.includes(s.id) ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={mergeIds.includes(s.id)}
                  onChange={() => toggleMergeId(s.id)}
                />
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                {s.title}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {planning.combos.map((c) => (
              <button key={c.id} type="button" className="btn-ghost text-xs" onClick={() => loadCombo(c)}>
                {c.title}
              </button>
            ))}
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setComboOpen(true)}
              disabled={mergeIds.length < 2}
            >
              Сохранить комбо
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={exportCurrent}>
              <Download size={14} /> Excel
            </button>
          </div>
        </div>
      )}

      {mode === 'edit' && selected ? (
        <input
          value={selected.title}
          onChange={(e) => updateSchedule({ ...selected, title: e.target.value })}
          className="text-lg font-semibold bg-transparent border-b border-[var(--border)] w-full max-w-md pb-1 shrink-0"
        />
      ) : mode === 'merge' ? (
        <p className="text-sm text-[var(--text-secondary)] shrink-0">
          {mergeSchedules.length > 0
            ? `Показано: ${mergeSchedules.map((s) => s.title).join(' + ')}`
            : 'Выберите хотя бы одно расписание'}
        </p>
      ) : null}

      {(mode === 'edit' ? selected : mergeSchedules.length > 0) && (
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
          <div
            className="grid gap-3 min-w-[1260px] h-full"
            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(180px, 1fr))` }}
          >
            {days.map((weekday) => {
              const daySlots =
                mode === 'edit' && selected
                  ? slotsForWeekday(selected.slots, weekday).map((slot) => ({
                      slot,
                      schedule: selected,
                    }))
                  : mergedSlotsForWeekday(mergeSchedules, weekday);

              return (
                <div
                  key={weekday}
                  className="flex flex-col rounded-xl border panel min-h-[220px] max-h-full"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div
                    className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="text-sm font-semibold">{DAY_LABELS[weekday]}</span>
                    {mode === 'edit' && (
                      <button type="button" className="btn-ghost text-xs px-1.5 py-0.5" onClick={() => addSlotForDay(weekday)}>
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                    {daySlots.length === 0 ? (
                      <p className="text-xs text-[var(--text-secondary)] italic text-center py-4">Пусто</p>
                    ) : (
                      daySlots.map(({ slot, schedule }, idx) => (
                        <SlotCard
                          key={`${schedule.id}-${slot.id}`}
                          slot={slot}
                          schedule={schedule}
                          dayIndex={idx}
                          dayCount={daySlots.length}
                          scheduleLabel={mode === 'merge' ? schedule.title : undefined}
                          readOnly={mode === 'merge'}
                          onChange={updateSchedule}
                          onMove={(dir) =>
                            updateSchedule(moveSlotInDay(schedule, slot.id, weekday, dir))
                          }
                          onDelete={() =>
                            updateSchedule({
                              ...schedule,
                              slots: schedule.slots.filter((s) => s.id !== slot.id),
                            })
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {planning.schedules.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
          Создайте шаблон постоянного расписания
        </div>
      )}

      <Modal open={quickOpen} title="Быстрое добавление" onClose={() => setQuickOpen(false)} widthClass="max-w-md">
        <div className="space-y-3">
          <input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Название"
            className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--bg-secondary)] border-[var(--border)]"
          />
          <div className="flex gap-2">
            <input type="time" value={quickStart} onChange={(e) => setQuickStart(e.target.value)} className="flex-1 px-2 py-1.5 rounded border text-sm bg-[var(--bg-secondary)] border-[var(--border)]" />
            <span className="self-center">—</span>
            <input type="time" value={quickEnd} onChange={(e) => setQuickEnd(e.target.value)} className="flex-1 px-2 py-1.5 rounded border text-sm bg-[var(--bg-secondary)] border-[var(--border)]" />
          </div>
          {quickTimeError && <p className="text-xs text-[var(--accent)]">{quickTimeError}</p>}
          <input value={quickDesc} onChange={(e) => setQuickDesc(e.target.value)} placeholder="Описание" className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--bg-secondary)] border-[var(--border)]" />
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <label key={d} className={`px-2 py-1 rounded-lg border text-xs cursor-pointer ${quickDays.includes(d) ? 'bg-[var(--accent)]/20 border-[var(--accent)]' : 'border-[var(--border)]'}`}>
                <input type="checkbox" className="sr-only" checked={quickDays.includes(d)} onChange={() => setQuickDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]))} />
                {DAY_LABELS[d]}
              </label>
            ))}
          </div>
          <button type="button" className="btn-primary w-full" onClick={quickAdd} disabled={!quickTitle.trim() || quickDays.length === 0}>
            Добавить
          </button>
        </div>
      </Modal>

      <Modal open={comboOpen} title="Сохранить комбо" onClose={() => setComboOpen(false)}>
        <input
          value={comboTitle}
          onChange={(e) => setComboTitle(e.target.value)}
          placeholder="Школа + спорт"
          className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--bg-secondary)] border-[var(--border)] mb-3"
        />
        <button type="button" className="btn-primary w-full" onClick={saveCombo} disabled={!comboTitle.trim()}>
          Сохранить
        </button>
      </Modal>
    </div>
  );
}
