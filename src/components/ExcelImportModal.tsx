import { useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import {
  importPlanningFromWorkbook,
  applyExcelImport,
  arrayBufferFromBase64,
  type ExcelImportResult,
} from '../lib/excel';
import { useAppStore } from '../store/useAppStore';
import { getAPI } from '../lib/api';

interface ExcelImportModalProps {
  open: boolean;
  onClose: () => void;
}

/** Функция `ExcelImportModal`. */
export function ExcelImportModal({ open, onClose }: ExcelImportModalProps) {
  const planning = useAppStore((s) => s.planning);
  const savePlanning = useAppStore((s) => s.savePlanning);
  const [preview, setPreview] = useState<ExcelImportResult | null>(null);
  const [mergeTasks, setMergeTasks] = useState(true);
  const [mergeEvents, setMergeEvents] = useState(true);
  const [mergeSchedules, setMergeSchedules] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  /** Функция `parseBuffer`. */
  const parseBuffer = (buffer: ArrayBuffer, name: string) => {
    const result = importPlanningFromWorkbook(buffer);
    setPreview(result);
    setFileName(name);
  };

  /** Функция `pickFile`. */
  const pickFile = async () => {
    setLoading(true);
    try {
      const api = getAPI();
      const base64 = await api.readExcelFile();
      if (!base64) return;
      parseBuffer(arrayBufferFromBase64(base64), 'файл');
    } finally {
      setLoading(false);
    }
  };

  /** Функция `onFileInput`. */
  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) parseBuffer(reader.result, file.name);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  /** Функция `apply`. */
  const apply = async () => {
    if (!preview) return;
    const next = applyExcelImport(planning, preview, { mergeTasks, mergeEvents, mergeSchedules });
    await savePlanning(next);
    setPreview(null);
    setFileName('');
    onClose();
  };

  /** Функция `close`. */
  const close = () => {
    setPreview(null);
    setFileName('');
    onClose();
  };

  return (
    <Modal open={open} title="Импорт из Excel" onClose={close} widthClass="max-w-lg">
      {!preview ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Файлы Zametnik содержат листы <strong>«Таблица»</strong> (шаблоны по дням недели),{' '}
            <strong>«События»</strong> и <strong>«Задачи»</strong>. Не переименовывайте колонки в первой строке.
            Даты: ДД.ММ.ГГГГ или ГГГГ-ММ-ДД.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" className="btn-primary flex-1" onClick={pickFile} disabled={loading}>
              <Upload size={16} /> {loading ? 'Чтение…' : 'Выбрать файл'}
            </button>
            <label className="btn-ghost flex-1 text-center cursor-pointer">
              <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={onFileInput} />
              Из браузера
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">
            Файл: <span className="font-mono text-[var(--accent)]">{fileName}</span>
          </p>
          <ul className="text-sm space-y-1 bg-[var(--bg-secondary)] rounded-lg p-3">
            <li>Задач: <strong>{preview.stats.tasks}</strong></li>
            <li>Событий по датам: <strong>{preview.stats.events}</strong></li>
            <li>Шаблонов расписания: <strong>{preview.stats.schedules}</strong></li>
            {preview.errors.length > 0 && (
              <li className="text-[var(--accent)] flex items-start gap-1">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                Пропущено строк: {preview.errors.length}
              </li>
            )}
          </ul>
          {preview.errors.length > 0 && (
            <details className="text-xs text-[var(--text-secondary)]">
              <summary className="cursor-pointer">Подробности ошибок</summary>
              <ul className="mt-1 max-h-24 overflow-y-auto">
                {preview.errors.slice(0, 10).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </details>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mergeTasks} onChange={(e) => setMergeTasks(e.target.checked)} />
            Добавить задачи к существующим
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mergeEvents} onChange={(e) => setMergeEvents(e.target.checked)} />
            Добавить события к существующим
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mergeSchedules} onChange={(e) => setMergeSchedules(e.target.checked)} />
            Добавить шаблоны расписания к существующим
          </label>
          {!mergeTasks && (
            <p className="text-xs text-[var(--accent)]">Без галочки — старые задачи (кроме из заметок) будут заменены</p>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" onClick={apply}>
              Импортировать
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPreview(null)}>
              Назад
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
