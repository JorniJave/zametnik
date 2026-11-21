export type { SyncOperation, SyncRevision, Tombstone, ConflictResult } from './conflict';

export interface SyncDelta {
  operations: import('./conflict').SyncOperation[];
  revisions: import('./conflict').SyncRevision[];
  tombstones: import('./conflict').Tombstone[];
  serverTime: number;
}

export interface SyncClient {
  deviceId: string;
  /** Функция `push`. */
  push(delta: SyncDelta): Promise<SyncDelta>;
  /** Функция `pull`. */
  pull(since: number): Promise<SyncDelta>;
}
