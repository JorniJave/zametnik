import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Tray,
  Menu,
  nativeImage,
  Notification,
  type NativeImage,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { VaultManager } from './vault.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let vault: VaultManager | null = null;
let quitting = false;

const isDev = !app.isPackaged;
const gotLock = app.requestSingleInstanceLock();

/** Функция `resolveIndexHtml`. */
function resolveIndexHtml(): string {
  const candidates = [
    path.join(__dirname, '../dist/index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

/** Функция `resolvePreload`. */
function resolvePreload(): string {
  const candidates = [
    path.join(__dirname, 'preload.js'),
    path.join(app.getAppPath(), 'dist-electron', 'preload.js'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

/** Функция `buildTrayIcon`. */
function buildTrayIcon(): NativeImage {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill="#7c9eff"/>
    <text x="16" y="21" text-anchor="middle" font-size="14" font-family="Segoe UI,sans-serif" fill="#161724" font-weight="700">Z</text>
  </svg>`;
  return nativeImage.createFromBuffer(Buffer.from(svg));
}

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/** Функция `createWindow`. */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 360,
    minHeight: 560,
    title: 'Zametnik',
    backgroundColor: '#161724',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = resolveIndexHtml();
    mainWindow.loadFile(indexHtml).catch((err) => {
      console.error('Failed to load index.html:', indexHtml, err);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('did-fail-load', code, desc, url);
    dialog.showErrorBox(
      'Zametnik — ошибка загрузки',
      `Не удалось открыть интерфейс.\n\nКод: ${code}\n${desc}\n\nФайл: ${resolveIndexHtml()}\n\nЗапустите Zametnik.exe.bat из папки проекта.`
    );
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('render-process-gone', details);
  });

  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/** Функция `createTray`. */
function createTray() {
  const icon = buildTrayIcon();
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    {
      label: 'Показать Zametnik',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'Выход',
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip('Zametnik');
  tray.setContextMenu(menu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

/** Функция `getVault`. */
function getVault(): VaultManager {
  if (!vault) vault = new VaultManager();
  return vault;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  createTray();
  app.setLoginItemSettings({ openAtLogin: false });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    /* keep running in tray */
  }
});

ipcMain.handle('select-vault', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Выберите папку Vault',
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const v = getVault();
  await v.setVaultPath(result.filePaths[0]);
  return result.filePaths[0];
});

ipcMain.handle('create-default-vault', async () => {
  const docs = app.getPath('documents');
  const vaultPath = path.join(docs, 'ZametnikVault');
  const v = getVault();
  await v.setVaultPath(vaultPath);
  await v.initDemoVault();
  return vaultPath;
});

ipcMain.handle('get-vault-path', async () => getVault().getVaultPath());
ipcMain.handle('load-vault', () => getVault().loadVault());
ipcMain.handle('read-note', (_e, id: string) => getVault().readNote(id));
ipcMain.handle('save-note', (_e, id: string, content: string) => getVault().saveNote(id, content));
ipcMain.handle('create-note', (_e, title: string, folder?: string, content?: string) =>
  getVault().createNote(title, folder, content)
);
ipcMain.handle('delete-note', (_e, id: string) => getVault().deleteNote(id));
ipcMain.handle('get-backlinks', (_e, id: string) => getVault().getBacklinks(id));
ipcMain.handle('get-local-graph', (_e, id: string, depth?: number) =>
  getVault().getLocalGraph(id, depth)
);
ipcMain.handle('ensure-daily-note', (_e, date: string) => getVault().ensureDailyNote(date));
ipcMain.handle('ensure-week-note', (_e, weekLabel: string, days: string[]) =>
  getVault().ensureWeekNote(weekLabel, days)
);
ipcMain.handle('read-canvas', (_e, id: string) => getVault().readCanvas(id));
ipcMain.handle('save-canvas', (_e, canvas: unknown) =>
  getVault().saveCanvas(canvas as import('./vault.js').CanvasData)
);
ipcMain.handle('list-canvases', () => getVault().listCanvases());
ipcMain.handle('read-workspace', (_e, id: string) => getVault().readWorkspace(id));
ipcMain.handle('save-workspace', (_e, workspace: unknown) =>
  getVault().saveWorkspace(workspace as import('./vault.js').WorkspaceData)
);
ipcMain.handle('delete-workspace', (_e, id: string) => getVault().deleteWorkspace(id));
ipcMain.handle('list-workspaces', () => getVault().listWorkspaces());
ipcMain.handle('load-relations', () => getVault().loadRelations());
ipcMain.handle('save-relations', (_e, relations: unknown) =>
  getVault().saveRelations(relations as import('./vault.js').TypedRelation[])
);
ipcMain.handle('search-notes', (_e, query: string) => getVault().searchNotes(query));
ipcMain.handle('get-settings', () => getVault().getSettings());
ipcMain.handle('save-settings', (_e, settings: unknown) =>
  getVault().saveSettings(settings as Partial<import('./vault.js').VaultSettings>)
);
ipcMain.handle('load-planning', () => getVault().loadPlanning());
ipcMain.handle('save-planning', (_e, data: unknown) =>
  getVault().savePlanning(data as import('./vault.js').PlanningData)
);
ipcMain.handle('pick-excel-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls', 'csv'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});
ipcMain.handle('read-excel-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls', 'csv'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const fs = await import('fs/promises');
  const buf = await fs.readFile(result.filePaths[0]);
  return buf.toString('base64');
});
ipcMain.handle('save-excel-file', async (_e, defaultName: string, base64: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultName,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (result.canceled || !result.filePath) return null;
  const fs = await import('fs/promises');
  await fs.writeFile(result.filePath, Buffer.from(base64, 'base64'));
  return result.filePath;
});
ipcMain.handle('show-notification', (_e, title: string, body: string) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});
ipcMain.handle('set-launch-at-login', (_e, enabled: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
    args: isDev ? [] : undefined,
  });
});
