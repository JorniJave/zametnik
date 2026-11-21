import type { SyncOperation } from './conflict';

const STORAGE_KEY = 'zametnik-sync-log';

export class OperationLog {
  private deviceId: string;

  /** Функция `constructor`. */
  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  /** Функция `handler`. */
  private read(): SyncOperation[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  /** Функция `handler`. */
  private write(ops: SyncOperation[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  }

  /** Функция `append`. */
  append(op: Omit<SyncOperation, 'id' | 'deviceId'>) {
    const entry: SyncOperation = {
      ...op,
      id: crypto.randomUUID(),
      deviceId: this.deviceId,
    };
    this.write([...this.read(), entry]);
    return entry;
  }

  /** Функция `pending`. */
  pending(): SyncOperation[] {
    return this.read();
  }

  /** Функция `ack`. */
  ack(ids: string[]) {
    const set = new Set(ids);
    this.write(this.read().filter((o) => !set.has(o.id)));
  }
}
