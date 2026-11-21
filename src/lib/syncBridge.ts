import { getDeviceId } from '../core/sync/device';
import { OperationLog } from '../core/sync/operationLog';

let log: OperationLog | null = null;

/** Функция `getLog`. */
function getLog(): OperationLog {
  if (!log) log = new OperationLog(getDeviceId());
  return log;
}

/** Функция `contentHash`. */
export function contentHash(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = (Math.imul(31, h) + content.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/** Функция `logObjectChange`. */
export function logObjectChange(
  objectId: string,
  objectType: string,
  kind: 'upsert' | 'delete',
  hash: string,
  payload?: unknown
): void {
  getLog().append({
    objectId,
    objectType,
    kind,
    contentHash: hash,
    timestamp: Date.now(),
    payload,
  });
}

/** Функция `getPendingSyncCount`. */
export function getPendingSyncCount(): number {
  return getLog().pending().length;
}
