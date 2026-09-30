import type {
  User,
  Customer,
  Supplier,
  Product,
  Batch,
  Sale,
  Purchase,
  Payment,
  StockMovement,
  PrintJob,
  AuditLog,
  StoreSettings,
  DashboardSummary,
  SalesInsightReport,
  InventoryInsightReport,
} from './index';

export interface IElectronAPI {
  // Auth
  login: (credentials: { username: string; password: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
  getUsers: () => Promise<User[]>;
  createUser: (data: { username: string; name: string; role: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (data: { userId: number; oldPassword: string; newPassword: string }) => Promise<{ success: boolean; error?: string }>;

  // Billing
  getNextInvoiceNumber: () => Promise<string>;
  createSale: (saleData: any) => Promise<{ success: boolean; sale?: Sale; error?: string }>;
  getSales: (filters?: any) => Promise<{ sales: Sale[]; totalCount: number }>;
  getSaleById: (id: number) => Promise<Sale | null>;
  getSaleByInvoice: (invoice: string) => Promise<Sale | null>;
  cancelSale: (data: { saleId: number; reason: string; userId?: number }) => Promise<{ success: boolean; error?: string }>;

  // Inventory
  getProducts: (filters?: any) => Promise<Product[]>;
  getProductById: (id: number) => Promise<Product | null>;
  createProduct: (data: any) => Promise<{ success: boolean; product?: Product; error?: string }>;
  updateProduct: (data: { id: number; data: any; userId?: number }) => Promise<{ success: boolean; product?: Product; error?: string }>;
  adjustStock: (data: any) => Promise<{ success: boolean; error?: string }>;
  getAllBatches: () => Promise<any[]>;
  getCategories: () => Promise<string[]>;
  getStockMovements: (data: { productId?: number; limit?: number }) => Promise<StockMovement[]>;

  // Customers
  getCustomers: (searchQuery?: string) => Promise<Customer[]>;
  getCustomerById: (id: number) => Promise<Customer | null>;
  createCustomer: (data: { data: any; userId?: number }) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  updateCustomer: (data: { id: number; data: any; userId?: number }) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  getCustomerLedger: (customerId: number) => Promise<any>;
  collectPayment: (data: any) => Promise<{ success: boolean; payment?: Payment; error?: string }>;

  // Suppliers
  getSuppliers: (searchQuery?: string) => Promise<Supplier[]>;
  getSupplierById: (id: number) => Promise<Supplier | null>;
  createSupplier: (data: { data: any; userId?: number }) => Promise<{ success: boolean; supplier?: Supplier; error?: string }>;
  updateSupplier: (data: { id: number; data: any; userId?: number }) => Promise<{ success: boolean; supplier?: Supplier; error?: string }>;
  recordSupplierPayment: (data: any) => Promise<{ success: boolean; payment?: Payment; error?: string }>;

  // Purchases
  createPurchase: (data: any) => Promise<{ success: boolean; purchase?: Purchase; error?: string }>;
  getPurchases: (filters?: any) => Promise<Purchase[]>;
  getPurchaseById: (id: number) => Promise<Purchase | null>;

  // Printing
  updatePrintStatus: (data: { saleId: number; status: string; errorMessage?: string; printType?: string }) => Promise<{ success: boolean }>;
  getPrintJobs: (limit?: number) => Promise<PrintJob[]>;
  reprintSale: (data: { saleId: number; printType?: string }) => Promise<{ success: boolean; job?: PrintJob; error?: string }>;
  getPrinters: () => Promise<any[]>;
  printWindow: (options?: any) => Promise<{ success: boolean; errorType?: string }>;
  savePDF: (options?: { defaultFilename?: string; format?: string; invoiceHtml?: string; sale?: any; settings?: any; targetPath?: string }) => Promise<{ success: boolean; filePath?: string; fileSize?: number; cancelled?: boolean; error?: string }>;
  showItemInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;

  // Reports
  getSalesReport: (filters: { startDate?: string; endDate?: string }) => Promise<any>;
  getTaxReport: (filters: { startDate?: string; endDate?: string }) => Promise<any>;
  getInventoryValuation: () => Promise<any>;
  getCustomerOutstandingReport: () => Promise<any>;

  // Insights
  getDashboardSummary: () => Promise<DashboardSummary>;
  getSalesInsights: (period: string) => Promise<SalesInsightReport>;
  getInventoryInsights: () => Promise<InventoryInsightReport>;

  // Settings
  getSettings: () => Promise<StoreSettings>;
  updateSettings: (data: { data: any; userId?: number }) => Promise<{ success: boolean; settings?: StoreSettings; error?: string }>;

  // Backup & Restore
  createBackup: (customPath?: string) => Promise<{ success: boolean; filePath?: string; fileSize?: number; error?: string }>;
  restoreBackup: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
  getAuditLogs: (limit?: number) => Promise<AuditLog[]>;
  openBackupFileDialog: () => Promise<string | null>;
  selectBackupFolderDialog: () => Promise<string | null>;

  // Window State
  getWindowState: () => Promise<{
    isMaximized: boolean;
    isMinimized: boolean;
    isResizable: boolean;
    isFullScreen: boolean;
    isKiosk: boolean;
  }>;
  minimizeWindow: () => Promise<{ success: boolean }>;
  restoreWindow: () => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}
