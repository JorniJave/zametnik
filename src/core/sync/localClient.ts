import type { SyncClient, SyncDelta } from './types';
import { OperationLog } from './operationLog';

/** Offline stub: queues operations locally until a real server is configured. */
export class LocalSyncClient implements SyncClient {
  deviceId: string;
  private log: OperationLog;

  /** Функция `constructor`. */
  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.log = new OperationLog(deviceId);
  }

  /** Функция `push`. */
  async push(delta: SyncDelta): Promise<SyncDelta> {
    for (const op of delta.operations) {
      this.log.append({
        objectId: op.objectId,
        objectType: op.objectType,
        kind: op.kind,
        contentHash: op.contentHash,
        timestamp: op.timestamp,
        payload: op.payload,
      });
    }
    const ackIds = delta.operations.map((o) => o.id).filter(Boolean);
    if (ackIds.length) this.log.ack(ackIds);
    return {
      operations: [],
      revisions: [],
      tombstones: [],
      serverTime: Date.now(),
    };
  }

  /** Функция `pull`. */
  async pull(_since: number): Promise<SyncDelta> {
    return {
      operations: this.log.pending(),
      revisions: [],
      tombstones: [],
      serverTime: Date.now(),
    };
  }

  /** Функция `pendingCount`. */
  pendingCount(): number {
    return this.log.pending().length;
  }
}
