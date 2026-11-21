/** Future sync-server contract (offline-first client already queues operations). */
export interface SyncAuth {
  accountId: string;
  deviceToken: string;
}

export interface SyncPushRequest {
  deviceId: string;
  since: number;
  operations: unknown[];
}

export interface SyncPushResponse {
  serverTime: number;
  operations: unknown[];
  revisions: unknown[];
  tombstones: unknown[];
}

export interface SyncServerConfig {
  baseUrl: string;
  enabled: boolean;
}

export const DEFAULT_SYNC_CONFIG: SyncServerConfig = {
  baseUrl: '',
  enabled: false,
};
