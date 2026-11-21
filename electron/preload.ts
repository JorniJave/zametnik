import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('zametnik', {
  selectVault: () => ipcRenderer.invoke('select-vault'),
  createDefaultVault: () => ipcRenderer.invoke('create-default-vault'),
  getVaultPath: () => ipcRenderer.invoke('get-vault-path'),
  loadVault: () => ipcRenderer.invoke('load-vault'),
  readNote: (id: string) => ipcRenderer.invoke('read-note', id),
  saveNote: (id: string, content: string) => ipcRenderer.invoke('save-note', id, content),
  createNote: (title: string, folder?: string, content?: string) =>
    ipcRenderer.invoke('create-note', title, folder, content),
  deleteNote: (id: string) => ipcRenderer.invoke('delete-note', id),
  getBacklinks: (id: string) => ipcRenderer.invoke('get-backlinks', id),
  getLocalGraph: (id: string, depth?: number) => ipcRenderer.invoke('get-local-graph', id, depth),
  ensureDailyNote: (date: string) => ipcRenderer.invoke('ensure-daily-note', date),
  ensureWeekNote: (weekLabel: string, days: string[]) =>
    ipcRenderer.invoke('ensure-week-note', weekLabel, days),
  readCanvas: (id: string) => ipcRenderer.invoke('read-canvas', id),
  saveCanvas: (canvas: unknown) => ipcRenderer.invoke('save-canvas', canvas),
  listCanvases: () => ipcRenderer.invoke('list-canvases'),
  readWorkspace: (id: string) => ipcRenderer.invoke('read-workspace', id),
  saveWorkspace: (workspace: unknown) => ipcRenderer.invoke('save-workspace', workspace),
  deleteWorkspace: (id: string) => ipcRenderer.invoke('delete-workspace', id),
  listWorkspaces: () => ipcRenderer.invoke('list-workspaces'),
  loadRelations: () => ipcRenderer.invoke('load-relations'),
  saveRelations: (relations: unknown) => ipcRenderer.invoke('save-relations', relations),
  searchNotes: (query: string) => ipcRenderer.invoke('search-notes', query),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),
  loadPlanning: () => ipcRenderer.invoke('load-planning'),
  savePlanning: (data: unknown) => ipcRenderer.invoke('save-planning', data),
  pickExcelFile: () => ipcRenderer.invoke('pick-excel-file'),
  readExcelFile: () => ipcRenderer.invoke('read-excel-file'),
  saveExcelFile: (defaultName: string, base64: string) =>
    ipcRenderer.invoke('save-excel-file', defaultName, base64),
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', title, body),
  setLaunchAtLogin: (enabled: boolean) => ipcRenderer.invoke('set-launch-at-login', enabled),
});
