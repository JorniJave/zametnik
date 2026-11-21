export interface SyncOperation {
  id: string;
  deviceId: string;
  objectId: string;
  objectType: string;
  kind: 'upsert' | 'delete';
  contentHash: string;
  timestamp: number;
  payload?: unknown;
}

export interface SyncRevision {
  objectId: string;
  revision: number;
  contentHash: string;
  updatedAt: number;
  deviceId: string;
}

export interface Tombstone {
  objectId: string;
  deletedAt: number;
  deviceId: string;
}

export type ConflictResult<T> =
  | { winner: 'local'; value: T }
  | { winner: 'remote'; value: T }
  | { winner: 'merge'; value: T };

/** Функция `resolveConflict`. */
export function resolveConflict<T extends { updatedAt: number; deviceId: string }>(
  local: T,
  remote: T
): ConflictResult<T> {
  if (local.updatedAt > remote.updatedAt) return { winner: 'local', value: local };
  if (remote.updatedAt > local.updatedAt) return { winner: 'remote', value: remote };
  return local.deviceId.localeCompare(remote.deviceId) <= 0
    ? { winner: 'local', value: local }
    : { winner: 'remote', value: remote };
}
