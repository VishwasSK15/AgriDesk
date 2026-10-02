import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { initDatabase } from './db';
import { registerIpcHandlers } from './ipc/handlers';

const isQA = process.env.AGRI_ENV === 'qa' || process.env.NODE_ENV === 'test-qa';
if (isQA) {
  const qaUserData = path.resolve(process.env.APPDATA ? path.join(process.env.APPDATA, 'AgriculturalBilling-QA') : path.join(__dirname, '../../data-qa'));
  app.setPath('userData', qaUserData);
}

let mainWindow: BrowserWindow | null = null;
let isRestoring = false;

function createWindow() {
  // Query actual primary display usable work area (respects taskbar, DPI scaling, multi-monitor)
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 1024,
    minHeight: 700,
    resizable: false,
    maximizable: true,
    minimizable: true,
    closable: true,
    title: 'AgriDesk - Agricultural Store Billing & Inventory System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  // Register IPC handlers with main window reference
  registerIpcHandlers(mainWindow);

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    // Attempt local dev server first, fall back to dist/index.html
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      const indexPath = path.join(__dirname, '../dist/index.html');
      mainWindow?.loadFile(indexPath);
    });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.maximize();
    mainWindow.show();
  });

  // Keep window in maximized state while preventing infinite maximize/unmaximize loop
  mainWindow.on('unmaximize', () => {
    if (isRestoring || !mainWindow || mainWindow.isDestroyed()) return;
    isRestoring = true;
    setImmediate(() => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMaximized()) {
        mainWindow.maximize();
      }
      isRestoring = false;
    });
  });

  // Handle display changes (moving window to another monitor, resolution / DPI changes)
  const handleDisplayChange = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const currentDisplay = screen.getDisplayMatching(mainWindow.getBounds());
      const workArea = currentDisplay.workArea;
      if (!mainWindow.isMaximized()) {
        mainWindow.setBounds(workArea);
        mainWindow.maximize();
      }
    } catch {
      // Ignore transient display transition states
    }
  };

  screen.on('display-metrics-changed', handleDisplayChange);
  screen.on('display-added', handleDisplayChange);
  screen.on('display-removed', handleDisplayChange);

  mainWindow.on('moved', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMaximized()) return;
    try {
      const currentDisplay = screen.getDisplayMatching(mainWindow.getBounds());
      mainWindow.setBounds(currentDisplay.workArea);
      mainWindow.maximize();
    } catch {
      // Ignore
    }
  });

  mainWindow.on('closed', () => {
    screen.removeListener('display-metrics-changed', handleDisplayChange);
    screen.removeListener('display-added', handleDisplayChange);
    screen.removeListener('display-removed', handleDisplayChange);
    mainWindow = null;
  });
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Initialize SQLite database, seed schema & data
    initDatabase();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
