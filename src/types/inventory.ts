export type InboundType = 
  | 'PEMBELIAN_VENDOR'        // Pembelian Dari Vendor
  | 'RETUR_DEFECT'            // Retur Defect
  | 'RETUR_PEMINJAMAN'        // Retur Peminjaman
  | 'TRANSFER_GUDANG_LAIN'    // Transfer Dari Gudang Lain
  | 'LABELING'                // Labeling
  | 'VENDOR_PURCHASE'         // Legacy alias
  | 'CUSTOMER_RETURN'         // Legacy alias
  | 'KOL_RETURN'              // Legacy alias
  | 'INTER_WAREHOUSE_IN';     // Legacy alias

export const INBOUND_TYPE_LABELS: Record<string, string> = {
  PEMBELIAN_VENDOR: 'Pembelian Dari Vendor',
  RETUR_DEFECT: 'Retur Defect',
  RETUR_PEMINJAMAN: 'Retur Peminjaman',
  TRANSFER_GUDANG_LAIN: 'Transfer Dari Gudang Lain',
  LABELING: 'Labeling',
  VENDOR_PURCHASE: 'Pembelian Dari Vendor',
  CUSTOMER_RETURN: 'Retur Pembeli',
  KOL_RETURN: 'Retur Peminjaman / KOL',
  INTER_WAREHOUSE_IN: 'Transfer Dari Gudang Lain',
};

export type OutboundType = 
  | 'SALES_PENJUALAN'         // Sales / Penjualan
  | 'RETUR_DEFECT_VENDOR'     // Retur Defect Dari Vendor
  | 'TRANSFER_DUMA_PS'        // Transfer Stock Duma PS
  | 'TRANSFER_DUMA_PI'        // Transfer Stock Duma PI
  | 'PO_WEB'                  // PO Web
  | 'PO_PI'                   // PO PI
  | 'PO_PS'                   // PO PS
  | 'PO_BAZAAR'               // PO Bazaar
  | 'PEMINJAMAN'              // Peminjaman
  | 'EXCHANGE'                // Exchange
  | 'ENDORSE'                 // Endorse
  | 'DAILY_SALES'             // Legacy alias
  | 'SUPPLIER_RETURN'         // Legacy alias
  | 'INTER_WAREHOUSE_OUT'     // Legacy alias
  | 'BIN_RELOCATION';         // Legacy alias

export const OUTBOUND_TYPE_LABELS: Record<string, string> = {
  SALES_PENJUALAN: 'Sales/Penjualan',
  RETUR_DEFECT_VENDOR: 'Retur Defect Dari Vendor',
  TRANSFER_DUMA_PS: 'Transfer Stock Duma PS',
  TRANSFER_DUMA_PI: 'Transfer Stock Duma PI',
  PO_WEB: 'PO Web',
  PO_PI: 'PO PI',
  PO_PS: 'PO PS',
  PO_BAZAAR: 'PO Bazaar',
  PEMINJAMAN: 'Peminjaman',
  EXCHANGE: 'Exchange',
  ENDORSE: 'Endorse',
  DAILY_SALES: 'Sales/Penjualan',
  SUPPLIER_RETURN: 'Retur Defect Dari Vendor',
  INTER_WAREHOUSE_OUT: 'Transfer Antar Gudang',
  BIN_RELOCATION: 'Pindah Lokasi BIN',
};

export type DefectStatus = 
  | 'BARU_DITEMUKAN'        // Baru diinput di gudang
  | 'PROSES_INVESTIGASI'    // Sedang diperiksa tim QC
  | 'DIKIRIM_KE_VENDOR'     // Sedang di vendor untuk perbaikan
  | 'SELESAI_DIPERBAIKI'    // Selesai diperbaiki, masuk stok normal
  | 'SCRAP_WRITE_OFF';      // Tidak bisa diperbaiki, dimusnahkan/write-off

export type DefectType = 
  | 'JAHITAN_RUSAK'
  | 'SOBEK_CACAT_KAIN'
  | 'NODA_KOTOR'
  | 'MALFUNGSI_RESLETING_KANCING'
  | 'CACAT_SABLON_PRINTING'
  | 'KEMASAN_RUSAK'
  | 'LAINNYA';

export type PreOrderStatus = 
  | 'MENUNGGU_BARANG'   // Menunggu stok ready dari produksi/vendor
  | 'SIAP_KIRIM'        // Stok sudah ada, siap diproses packing
  | 'SUDAH_DIKIRIM'     // Sudah fulfilled
  | 'DIBATALKAN';       // Cancelled

export interface ProductSKU {
  sku: string;
  name: string;
  category: string;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  minStockAlert: number;
  description?: string;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  pic: string;
  phone: string;
  address: string;
  capacityMax: number;
  notes?: string;
}

export interface BinLocation {
  id: string;
  warehouseId: string;
  code: string; // e.g., BIN-A1-01
  zone: string;
  rack: string;
  tier: string;
  maxCapacity: number;
}

export interface StockPosition {
  id: string;
  sku: string;
  warehouseId: string;
  binCode: string;
  qtyOnHand: number;
  qtyReserved: number; // Reserved for Pre-Order
  qtyDefect: number;
  lastUpdated: string;
}

export interface InboundLog {
  id: string;
  invoiceNo: string;
  type: InboundType;
  sku: string;
  productName: string;
  qty: number;
  targetWarehouseId: string;
  targetBinCode: string;
  sourceOrVendor: string;
  pic: string;
  notes?: string;
  timestamp: string;
}

export interface OutboundLog {
  id: string;
  transactionNo: string;
  type: OutboundType;
  sku: string;
  productName: string;
  qty: number;
  sourceWarehouseId: string;
  sourceBinCode: string;
  destinationOrCustomer: string;
  pic: string;
  notes?: string;
  timestamp: string;
}

export interface PreOrderItem {
  id: string;
  orderNo: string;
  channel: string; // Shopee, Tokopedia, TikTok, WhatsApp
  customerName: string;
  customerPhone: string;
  sku: string;
  productName: string;
  requestedQty: number;
  allocatedQty: number;
  status: PreOrderStatus;
  orderDate: string;
  etaDate: string;
  notes?: string;
}

export interface SupplierPartner {
  id: string;
  code: string;
  name: string;
  category: 'PRODUK_JADI' | 'BAHAN_BAKU' | 'PACKAGING' | 'JASA_KONVEKSI' | 'LAINNYA';
  picName: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string; // e.g. "NET 30", "COD", "DP 50%"
  rating: number; // 1-5
  notes?: string;
}

export interface DefectRepairLog {
  date: string;
  action: string;
  repairIteration: number;
  note: string;
  pic: string;
}

export interface DefectTrackerItem {
  id: string;
  defectCode: string;
  sku: string;
  productName: string;
  qty: number;
  warehouseId: string;
  detectedFrom: 'INBOUND_QC' | 'GUDANG_SORTIR' | 'CUSTOMER_RETURN';
  vendorId: string;
  vendorName: string;
  defectType: DefectType;
  repairIteration: number; // Perbaikan ke-berapa (1, 2, 3...)
  status: DefectStatus;
  history: DefectRepairLog[];
  dateReported: string;
  lastUpdated: string;
  resolvedDate?: string;
}

export interface StockSummary {
  totalStockOnHand: number;
  totalUniqueSKUs: number;
  totalIncomingMonth: number;
  totalOutgoingMonth: number;
  lowStockItemsCount: number;
  totalDefectCount: number;
  totalPendingPOCount: number;
  totalEstimatedStockValue: number;
}

export type NotificationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AppNotification {
  id: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DEFECT_ALERT' | 'PREORDER_READY' | 'SYSTEM';
  title: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: string;
  sku?: string;
  read: boolean;
  actionTab?: string;
}

export type ReportType = 
  | 'RINGKASAN_STOK_BULANAN'
  | 'PERGERAKAN_MUTASI_SKU'
  | 'VENDOR_DEFECT_QC'
  | 'PRE_ORDER_FULFILLMENT'
  | 'AUDIT_LOG_IN_OUT';

export type ReportPeriod = 
  | 'TODAY'
  | 'LAST_7_DAYS'
  | 'THIS_MONTH'
  | 'THIS_QUARTER'
  | 'CUSTOM';

export interface ReportFilterOptions {
  type: ReportType;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  warehouseId?: string; // 'ALL' or specific
  category?: string;    // 'ALL' or specific
  sku?: string;
}

// Bulk Import & Export Types
export type BulkImportEntity = 
  | 'PRODUCTS'
  | 'STOCK_INITIAL'
  | 'SUPPLIERS'
  | 'INBOUND_BATCH'
  | 'FULL_BACKUP_JSON';

export interface ImportPreviewRow<T = any> {
  rowNumber: number;
  data: T;
  isValid: boolean;
  errors: string[];
}

export interface BulkImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: { rowNumber: number; message: string }[];
}

export type BulkExportEntity = 
  | 'ALL_ZIP_JSON'
  | 'PRODUCTS_CSV'
  | 'STOCK_POSITIONS_CSV'
  | 'INBOUND_LOGS_CSV'
  | 'OUTBOUND_LOGS_CSV'
  | 'PRE_ORDERS_CSV'
  | 'DEFECTS_CSV'
  | 'SUPPLIERS_CSV'
  | 'VENDOR_INVOICES_CSV'
  | 'STOCK_OPNAME_CSV';

// Multi-item payload for Inbound / Outbound
export interface InboundLineItem {
  id: string;
  sku: string;
  productName: string;
  qty: number;
  targetBinCode: string;
  notes?: string;
}

export interface OutboundLineItem {
  id: string;
  sku: string;
  productName: string;
  qty: number;
  sourceBinCode: string;
  maxAvailableQty?: number;
  notes?: string;
}

// Vendor Invoice & PO Receiving Interfaces
export interface VendorInvoiceItem {
  id: string;
  sku: string;
  productName: string;
  orderedQty: number; // Qty sesuai Purchase Order (PO)
  receivedQty: number; // Qty akumulasi yang sudah diterima
  remainingQty: number; // Qty kekurangan (orderedQty - receivedQty)
  unitPrice: number;
  targetBinCode: string;
}

export interface VendorReceivingHistory {
  id: string;
  receiptNumber: string;
  date: string;
  pic: string;
  notes: string;
  fulfillmentType: 'PARTIAL' | 'FULL';
  itemsReceived: Array<{
    sku: string;
    productName: string;
    qty: number;
    targetBinCode: string;
  }>;
  editedAt?: string;
  editedByPic?: string;
  editNotes?: string;
}

export interface VendorInvoice {
  id: string;
  invoiceNumber: string; // Nomor Faktur Pembelian Vendor
  poNumber: string;      // Nomor PO
  vendorId: string;
  vendorName: string;
  targetWarehouseId: string;
  orderDate: string;
  status: 'DRAFT' | 'PARTIAL' | 'FULFILLED';
  totalOrderedQty: number;
  totalReceivedQty: number;
  totalRemainingQty: number;
  items: VendorInvoiceItem[];
  receivingHistory: VendorReceivingHistory[];
  createdByPic: string;
  createdAt: string;
  lastEditedByPic?: string;
  lastEditedAt?: string;
  notes?: string;
}

// Stock Opname & Stock Lock Interfaces
export interface StockOpnameItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  binCode: string;
  systemQtySnapshot: number; // Stok sistem saat dikunci (lock stock)
  physicalCountQty: number | null; // Hasil hitung fisik (null jika belum dihitung)
  varianceQty: number; // physical - system
  varianceStatus: 'MATCH' | 'SURPLUS' | 'DEFICIT' | 'UNCOUNTED';
  unitPrice: number;
  varianceValue: number;
  scannedAt?: string;
  notes?: string;
}

export interface StockOpnameSession {
  id: string;
  sessionCode: string;
  warehouseId: string;
  warehouseName: string;
  status: 'LOCKED_COUNTING' | 'ADJUSTED_COMPLETED' | 'CANCELLED';
  lockedAt: string;
  lockedByPic: string;
  completedAt?: string;
  completedByPic?: string;
  totalSkus: number;
  totalSystemQty: number;
  totalPhysicalQty: number;
  totalVarianceQty: number;
  totalVarianceValue: number;
  items: StockOpnameItem[];
  notes?: string;
}


