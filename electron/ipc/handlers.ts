import { ipcMain, dialog, BrowserWindow, shell, app, screen } from 'electron';
import fs from 'fs';
import path from 'path';
import { authService } from '../services/authService';
import { billingService } from '../services/billingService';
import { inventoryService } from '../services/inventoryService';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { purchaseService } from '../services/purchaseService';
import { printingService } from '../services/printingService';
import { pdfService } from '../services/pdfService';
import { reportService } from '../services/reportService';
import { insightService } from '../services/insightService';
import { backupService } from '../services/backupService';
import { settingsService } from '../services/settingsService';

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // Auth
  ipcMain.handle('auth:login', async (_, { username, password }) => {
    return authService.login(username, password);
  });
  ipcMain.handle('auth:getUsers', async () => {
    return authService.getUsers();
  });
  ipcMain.handle('auth:createUser', async (_, { username, name, role, password }) => {
    return authService.createUser(username, name, role, password);
  });
  ipcMain.handle('auth:changePassword', async (_, { userId, oldPassword, newPassword }) => {
    return authService.changePassword(userId, oldPassword, newPassword);
  });

  // Billing / POS
  ipcMain.handle('billing:getNextInvoiceNumber', async () => {
    return billingService.getNextInvoiceNumber();
  });
  ipcMain.handle('billing:createSale', async (_, saleData) => {
    return billingService.createSale(saleData);
  });
  ipcMain.handle('billing:getSales', async (_, filters) => {
    return billingService.getSales(filters || {});
  });
  ipcMain.handle('billing:getSaleById', async (_, id) => {
    return billingService.getSaleById(id);
  });
  ipcMain.handle('billing:getSaleByInvoice', async (_, invoiceNumber) => {
    return billingService.getSaleByInvoice(invoiceNumber);
  });
  ipcMain.handle('billing:cancelSale', async (_, { saleId, reason, userId }) => {
    return billingService.cancelSale(saleId, reason, userId);
  });

  // Inventory & Products
  ipcMain.handle('inventory:getProducts', async (_, filters) => {
    return inventoryService.getProducts(filters);
  });
  ipcMain.handle('inventory:getProductById', async (_, id) => {
    return inventoryService.getProductById(id);
  });
  ipcMain.handle('inventory:createProduct', async (_, data) => {
    return inventoryService.createProduct(data);
  });
  ipcMain.handle('inventory:updateProduct', async (_, { id, data, userId }) => {
    return inventoryService.updateProduct(id, data, userId);
  });
  ipcMain.handle('inventory:adjustStock', async (_, data) => {
    return inventoryService.adjustStock(data);
  });
  ipcMain.handle('inventory:getAllBatches', async () => {
    return inventoryService.getAllBatches();
  });
  ipcMain.handle('inventory:getCategories', async () => {
    return inventoryService.getCategories();
  });
  ipcMain.handle('inventory:getStockMovements', async (_, { productId, limit }) => {
    return inventoryService.getStockMovements(productId, limit);
  });

  // Customers & Credit Ledger
  ipcMain.handle('customers:getCustomers', async (_, searchQuery) => {
    return customerService.getCustomers(searchQuery);
  });
  ipcMain.handle('customers:getCustomerById', async (_, id) => {
    return customerService.getCustomerById(id);
  });
  ipcMain.handle('customers:createCustomer', async (_, { data, userId }) => {
    return customerService.createCustomer(data, userId);
  });
  ipcMain.handle('customers:updateCustomer', async (_, { id, data, userId }) => {
    return customerService.updateCustomer(id, data, userId);
  });
  ipcMain.handle('customers:getCustomerLedger', async (_, customerId) => {
    return customerService.getCustomerLedger(customerId);
  });
  ipcMain.handle('customers:collectPayment', async (_, data) => {
    return customerService.collectPayment(data);
  });

  // Suppliers
  ipcMain.handle('suppliers:getSuppliers', async (_, searchQuery) => {
    return supplierService.getSuppliers(searchQuery);
  });
  ipcMain.handle('suppliers:getSupplierById', async (_, id) => {
    return supplierService.getSupplierById(id);
  });
  ipcMain.handle('suppliers:createSupplier', async (_, { data, userId }) => {
    return supplierService.createSupplier(data, userId);
  });
  ipcMain.handle('suppliers:updateSupplier', async (_, { id, data, userId }) => {
    return supplierService.updateSupplier(id, data, userId);
  });
  ipcMain.handle('suppliers:recordPayment', async (_, data) => {
    return supplierService.recordSupplierPayment(data);
  });

  // Purchases
  ipcMain.handle('purchases:createPurchase', async (_, data) => {
    return purchaseService.createPurchase(data);
  });
  ipcMain.handle('purchases:getPurchases', async (_, filters) => {
    return purchaseService.getPurchases(filters);
  });
  ipcMain.handle('purchases:getPurchaseById', async (_, id) => {
    return purchaseService.getPurchaseById(id);
  });

  // Mandatory Printing & Print Jobs
  ipcMain.handle('printing:updatePrintStatus', async (_, { saleId, status, errorMessage, printType }) => {
    return printingService.updatePrintStatus(saleId, status, errorMessage, printType);
  });
  ipcMain.handle('printing:getPrintJobs', async (_, limit) => {
    return printingService.getPrintJobs(limit);
  });
  ipcMain.handle('printing:reprintSale', async (_, { saleId, printType }) => {
    return printingService.reprintSale(saleId, printType);
  });
  ipcMain.handle('printing:getPrinters', async () => {
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      if (printers && printers.length > 0) {
        return printers;
      }
      if (process.env.AGRI_ENV === 'qa') {
        return [
          { name: 'Default Windows Printer', displayName: 'Default Windows Printer', isDefault: true },
          { name: 'Microsoft Print to PDF', displayName: 'Microsoft Print to PDF', isDefault: false },
          { name: 'Thermal POS Receipt Printer (80mm)', displayName: 'Thermal POS Receipt Printer (80mm)', isDefault: false },
        ];
      }
      return printers || [];
    } catch {
      return [{ name: 'Default Windows Printer', displayName: 'Default Windows Printer', isDefault: true }];
    }
  });
  ipcMain.handle('printing:printWindow', async (_, options?: {
    silent?: boolean;
    deviceName?: string;
    targetPrinter?: string;
    simulateCancel?: boolean;
    simulateFail?: boolean;
    simulateSuccess?: boolean;
    forceNativePrint?: boolean;
  }) => {
    // 1. Simulation for automated tests or explicit simulation flags
    if (options?.simulateCancel || process.env.AGRI_SIMULATE_PRINT_CANCEL === 'true') {
      return { success: false, errorType: 'cancelled' };
    }
    if (options?.simulateFail || process.env.AGRI_SIMULATE_PRINT_FAIL === 'true') {
      return { success: false, errorType: 'Printer paper out / offline' };
    }
    if (options?.simulateSuccess || (process.env.AGRI_AUTOMATED_TEST === 'true' && !options?.forceNativePrint)) {
      return { success: true };
    }

    // 2. Real native print execution
    return new Promise((resolve) => {
      const device = options?.deviceName || options?.targetPrinter;
      const printOptions: any = {
        silent: options?.silent ?? false, // Default: false opens native Windows Print Dialog!
        printBackground: true,
      };

      if (device && device !== 'Default Windows Printer' && device !== 'System Dialog' && device !== '') {
        printOptions.deviceName = device;
      }

      mainWindow.webContents.print(printOptions, (success, failureReason) => {
        if (!success) {
          resolve({
            success: false,
            errorType: failureReason || 'cancelled',
          });
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  ipcMain.handle('printing:savePDF', async (_, options: {
    defaultFilename?: string;
    format?: string;
    invoiceHtml?: string;
    sale?: any;
    settings?: any;
    targetPath?: string;
  } = {}) => {
    try {
      const sanitizedFilename = (options.defaultFilename || 'Invoice.pdf').replace(/[/\\?%*:|"<>]/g, '_');
      const documentsPath = app.getPath('documents') || app.getPath('desktop');
      let finalPath = options.targetPath;

      if (!finalPath) {
        const defaultPath = path.join(documentsPath, sanitizedFilename);
        if (process.env.AGRI_AUTOMATED_TEST === 'true' || process.env.AGRI_ENV === 'test-qa') {
          finalPath = defaultPath;
        } else {
          const res = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Invoice as PDF',
            defaultPath,
            filters: [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }],
          });

          if (res.canceled || !res.filePath) {
            return { success: false, cancelled: true };
          }
          finalPath = res.filePath;
        }
      }

      const targetDir = path.dirname(finalPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const result = await pdfService.generateInvoicePdf({
        targetPath: finalPath,
        format: options.format || 'a4',
        invoiceHtml: options.invoiceHtml,
        sale: options.sale,
        settings: options.settings,
      });

      return { success: true, filePath: finalPath, fileSize: result.fileSize };
    } catch (err: any) {
      console.error('Failed to save PDF:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('shell:showItemInFolder', async (_, filePath: string) => {
    try {
      if (!filePath) {
        return { success: false, error: 'No path specified' };
      }
      const normalized = path.normalize(filePath);
      if (fs.existsSync(normalized)) {
        shell.showItemInFolder(normalized);
        return { success: true };
      }
      return { success: false, error: `File does not exist: ${normalized}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('shell:openPath', async (_, filePath: string) => {
    try {
      if (!filePath) {
        return { success: false, error: 'No path specified' };
      }
      const normalized = path.normalize(filePath);
      if (!fs.existsSync(normalized)) {
        return { success: false, error: `File does not exist: ${normalized}` };
      }
      const errMsg = await shell.openPath(normalized);
      if (errMsg) {
        return { success: false, error: errMsg };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Reports
  ipcMain.handle('reports:getSalesReport', async (_, { startDate, endDate }) => {
    return reportService.getSalesReport(startDate, endDate);
  });
  ipcMain.handle('reports:getTaxReport', async (_, { startDate, endDate }) => {
    return reportService.getTaxReport(startDate, endDate);
  });
  ipcMain.handle('reports:getInventoryValuation', async () => {
    return reportService.getInventoryValuation();
  });
  ipcMain.handle('reports:getCustomerOutstandingReport', async () => {
    return reportService.getCustomerOutstandingReport();
  });

  // Insights Engine (Deterministic)
  ipcMain.handle('insights:getDashboardSummary', async () => {
    return insightService.getDashboardSummary();
  });
  ipcMain.handle('insights:getSalesInsights', async (_, period) => {
    return insightService.getSalesInsights(period);
  });
  ipcMain.handle('insights:getInventoryInsights', async () => {
    return insightService.getInventoryInsights();
  });

  // Settings
  ipcMain.handle('settings:getSettings', async () => {
    return settingsService.getSettings();
  });
  ipcMain.handle('settings:updateSettings', async (_, { data, userId }) => {
    return settingsService.updateSettings(data, userId);
  });

  // Backup & Audit
  ipcMain.handle('backup:createBackup', async (_, customPath) => {
    return backupService.createBackup(customPath);
  });
  ipcMain.handle('backup:restoreBackup', async (_, backupPath) => {
    return backupService.restoreBackup(backupPath);
  });
  ipcMain.handle('backup:getAuditLogs', async (_, limit) => {
    return backupService.getAuditLogs(limit);
  });
  ipcMain.handle('dialog:openBackupFile', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select AgriStore Database Backup File',
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'bak'] }],
      properties: ['openFile'],
    });
    return res.filePaths[0] || null;
  });
  // Window State / Management
  ipcMain.handle('window:getState', async () => {
    const currentDisplay = screen.getDisplayMatching(mainWindow.getBounds());
    return {
      isMaximized: mainWindow.isMaximized(),
      isMinimized: mainWindow.isMinimized(),
      isResizable: mainWindow.isResizable(),
      isFullScreen: mainWindow.isFullScreen(),
      isKiosk: mainWindow.isKiosk(),
      bounds: mainWindow.getBounds(),
      workArea: currentDisplay.workArea,
      scaleFactor: currentDisplay.scaleFactor,
    };
  });
  ipcMain.handle('window:minimize', async () => {
    mainWindow.minimize();
    return { success: true };
  });
  ipcMain.handle('window:restore', async () => {
    mainWindow.restore();
    return { success: true };
  });
}
