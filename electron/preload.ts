import { contextBridge, ipcRenderer } from 'electron';

export const electronAPI = {
  // Auth
  login: (credentials: { username: string; password: string }) => ipcRenderer.invoke('auth:login', credentials),
  getUsers: () => ipcRenderer.invoke('auth:getUsers'),
  createUser: (data: any) => ipcRenderer.invoke('auth:createUser', data),
  changePassword: (data: any) => ipcRenderer.invoke('auth:changePassword', data),

  // Billing
  getNextInvoiceNumber: () => ipcRenderer.invoke('billing:getNextInvoiceNumber'),
  createSale: (saleData: any) => ipcRenderer.invoke('billing:createSale', saleData),
  getSales: (filters?: any) => ipcRenderer.invoke('billing:getSales', filters),
  getSaleById: (id: number) => ipcRenderer.invoke('billing:getSaleById', id),
  getSaleByInvoice: (invoice: string) => ipcRenderer.invoke('billing:getSaleByInvoice', invoice),
  cancelSale: (data: { saleId: number; reason: string; userId?: number }) => ipcRenderer.invoke('billing:cancelSale', data),

  // Inventory & Products
  getProducts: (filters?: any) => ipcRenderer.invoke('inventory:getProducts', filters),
  getProductById: (id: number) => ipcRenderer.invoke('inventory:getProductById', id),
  createProduct: (data: any) => ipcRenderer.invoke('inventory:createProduct', data),
  updateProduct: (data: { id: number; data: any; userId?: number }) => ipcRenderer.invoke('inventory:updateProduct', data),
  adjustStock: (data: any) => ipcRenderer.invoke('inventory:adjustStock', data),
  getAllBatches: () => ipcRenderer.invoke('inventory:getAllBatches'),
  getCategories: () => ipcRenderer.invoke('inventory:getCategories'),
  getStockMovements: (data: { productId?: number; limit?: number }) => ipcRenderer.invoke('inventory:getStockMovements', data),

  // Customers & Ledger
  getCustomers: (searchQuery?: string) => ipcRenderer.invoke('customers:getCustomers', searchQuery),
  getCustomerById: (id: number) => ipcRenderer.invoke('customers:getCustomerById', id),
  createCustomer: (data: { data: any; userId?: number }) => ipcRenderer.invoke('customers:createCustomer', data),
  updateCustomer: (data: { id: number; data: any; userId?: number }) => ipcRenderer.invoke('customers:updateCustomer', data),
  getCustomerLedger: (customerId: number) => ipcRenderer.invoke('customers:getCustomerLedger', customerId),
  collectPayment: (data: any) => ipcRenderer.invoke('customers:collectPayment', data),

  // Suppliers
  getSuppliers: (searchQuery?: string) => ipcRenderer.invoke('suppliers:getSuppliers', searchQuery),
  getSupplierById: (id: number) => ipcRenderer.invoke('suppliers:getSupplierById', id),
  createSupplier: (data: { data: any; userId?: number }) => ipcRenderer.invoke('suppliers:createSupplier', data),
  updateSupplier: (data: { id: number; data: any; userId?: number }) => ipcRenderer.invoke('suppliers:updateSupplier', data),
  recordSupplierPayment: (data: any) => ipcRenderer.invoke('suppliers:recordPayment', data),

  // Purchases
  createPurchase: (data: any) => ipcRenderer.invoke('purchases:createPurchase', data),
  getPurchases: (filters?: any) => ipcRenderer.invoke('purchases:getPurchases', filters),
  getPurchaseById: (id: number) => ipcRenderer.invoke('purchases:getPurchaseById', id),

  // Printing & Print Jobs
  updatePrintStatus: (data: { saleId: number; status: string; errorMessage?: string; printType?: string }) => ipcRenderer.invoke('printing:updatePrintStatus', data),
  getPrintJobs: (limit?: number) => ipcRenderer.invoke('printing:getPrintJobs', limit),
  reprintSale: (data: { saleId: number; printType?: string }) => ipcRenderer.invoke('printing:reprintSale', data),
  getPrinters: () => ipcRenderer.invoke('printing:getPrinters'),
  printWindow: (options?: any) => ipcRenderer.invoke('printing:printWindow', options),
  savePDF: (options?: { defaultFilename?: string; format?: string }) => ipcRenderer.invoke('printing:savePDF', options),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),

  // Reports
  getSalesReport: (filters: { startDate?: string; endDate?: string }) => ipcRenderer.invoke('reports:getSalesReport', filters),
  getTaxReport: (filters: { startDate?: string; endDate?: string }) => ipcRenderer.invoke('reports:getTaxReport', filters),
  getInventoryValuation: () => ipcRenderer.invoke('reports:getInventoryValuation'),
  getCustomerOutstandingReport: () => ipcRenderer.invoke('reports:getCustomerOutstandingReport'),

  // Insights Engine
  getDashboardSummary: () => ipcRenderer.invoke('insights:getDashboardSummary'),
  getSalesInsights: (period: string) => ipcRenderer.invoke('insights:getSalesInsights', period),
  getInventoryInsights: () => ipcRenderer.invoke('insights:getInventoryInsights'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getSettings'),
  updateSettings: (data: { data: any; userId?: number }) => ipcRenderer.invoke('settings:updateSettings', data),

  // Backup & Audit
  createBackup: (customPath?: string) => ipcRenderer.invoke('backup:createBackup', customPath),
  restoreBackup: (backupPath: string) => ipcRenderer.invoke('backup:restoreBackup', backupPath),
  getAuditLogs: (limit?: number) => ipcRenderer.invoke('backup:getAuditLogs', limit),
  openBackupFileDialog: () => ipcRenderer.invoke('dialog:openBackupFile'),
  selectBackupFolderDialog: () => ipcRenderer.invoke('dialog:selectBackupFolder'),

  // Window State
  getWindowState: () => ipcRenderer.invoke('window:getState'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  restoreWindow: () => ipcRenderer.invoke('window:restore'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
