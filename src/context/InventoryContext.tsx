import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ProductSKU,
  Warehouse,
  BinLocation,
  StockPosition,
  InboundLog,
  OutboundLog,
  PreOrderItem,
  SupplierPartner,
  DefectTrackerItem,
  StockSummary,
  InboundType,
  OutboundType,
  DefectStatus,
  PreOrderStatus,
  AppNotification,
  VendorInvoice,
  VendorInvoiceItem,
  VendorReceivingHistory,
  StockOpnameSession,
  StockOpnameItem,
  InboundLineItem,
  OutboundLineItem,
} from '../types/inventory';
import {
  INITIAL_PRODUCTS,
  INITIAL_WAREHOUSES,
  INITIAL_BINS,
  INITIAL_STOCK_POSITIONS,
  INITIAL_SUPPLIERS,
  INITIAL_INBOUND_LOGS,
  INITIAL_OUTBOUND_LOGS,
  INITIAL_PRE_ORDERS,
  INITIAL_DEFECTS,
  INITIAL_VENDOR_INVOICES,
  INITIAL_STOCK_OPNAMES,
} from '../data/mockInventoryData';
import {
  calculateStockSummary,
  advanceDefectStatus,
  allocatePreOrdersOnInbound,
  validateStockAvailability,
  generateNotifications,
  calculateVendorShortageSummary,
  calculateOpnameItemVariance,
} from '../utils/inventoryCalculations';

interface InventoryContextType {
  products: ProductSKU[];
  warehouses: Warehouse[];
  bins: BinLocation[];
  stockPositions: StockPosition[];
  suppliers: SupplierPartner[];
  inbounds: InboundLog[];
  outbounds: OutboundLog[];
  preOrders: PreOrderItem[];
  defects: DefectTrackerItem[];
  summary: StockSummary;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Actions
  addProduct: (product: ProductSKU, initialWarehouseId?: string, initialBinCode?: string, initialQty?: number) => void;
  updateProduct: (product: ProductSKU) => void;
  addWarehouse: (warehouse: Warehouse) => void;
  addBinLocation: (bin: BinLocation) => void;
  addSupplier: (supplier: SupplierPartner) => void;

  handleStockIn: (params: {
    type: InboundType;
    sku: string;
    qty: number;
    targetWarehouseId: string;
    targetBinCode: string;
    sourceOrVendor: string;
    pic: string;
    invoiceNo?: string;
    notes?: string;
    autoAllocatePreOrders?: boolean;
  }) => { success: boolean; message: string };

  handleStockOut: (params: {
    type: OutboundType;
    sku: string;
    qty: number;
    sourceWarehouseId: string;
    sourceBinCode: string;
    destinationOrCustomer: string;
    pic: string;
    transactionNo?: string;
    notes?: string;
  }) => { success: boolean; message: string };

  handleRelocateBin: (params: {
    sku: string;
    qty: number;
    warehouseId: string;
    fromBinCode: string;
    toBinCode: string;
    pic: string;
    notes?: string;
  }) => { success: boolean; message: string };

  addPreOrder: (item: Omit<PreOrderItem, 'id' | 'allocatedQty' | 'status'>) => void;
  updatePreOrderStatus: (id: string, newStatus: PreOrderStatus) => void;
  fulfillPreOrder: (id: string, sourceWarehouseId: string, sourceBinCode: string, pic: string) => { success: boolean; message: string };

  recordDefect: (params: {
    sku: string;
    qty: number;
    warehouseId: string;
    vendorId: string;
    vendorName: string;
    detectedFrom: 'INBOUND_QC' | 'GUDANG_SORTIR' | 'CUSTOMER_RETURN';
    defectType: any;
    pic: string;
    notes: string;
  }) => void;

  updateDefectAction: (params: {
    defectId: string;
    newStatus: DefectStatus;
    actionLabel: string;
    notes: string;
    pic: string;
    targetNormalBin?: string;
  }) => { success: boolean; message: string };

  notifications: AppNotification[];
  dismissNotification: (id: string) => void;
  markAllNotificationsRead: () => void;
  notificationEmail: string;
  setNotificationEmail: (email: string) => void;
  sendSimulatedEmailAlert: (subject: string, message: string) => { success: boolean; message: string };
  loadSampleDumaData: () => void;
  resetAllDataToDefault: () => void;

  // Bulk Import & Restore Actions
  bulkImportProducts: (
    items: {
      product: ProductSKU;
      initialWarehouseId?: string;
      initialBinCode?: string;
      initialQty?: number;
    }[],
    mode?: 'MERGE' | 'REPLACE'
  ) => { success: boolean; importedCount: number; message: string };

  bulkImportStockPositions: (
    items: { sku: string; warehouseId: string; binCode: string; qtyOnHand: number }[]
  ) => { success: boolean; importedCount: number; message: string };

  bulkImportSuppliers: (
    suppliers: SupplierPartner[],
    mode?: 'MERGE' | 'REPLACE'
  ) => { success: boolean; importedCount: number; message: string };

  bulkRestoreDatabase: (payload: any) => { success: boolean; message: string };

  // Multi-SKU Inbound & Outbound
  handleMultiItemStockIn: (params: {
    invoiceNo: string;
    type: InboundType;
    targetWarehouseId: string;
    sourceOrVendor: string;
    pic: string;
    notes?: string;
    autoAllocatePreOrders?: boolean;
    items: Array<{
      sku: string;
      productName: string;
      qty: number;
      targetBinCode: string;
      notes?: string;
    }>;
  }) => { success: boolean; message: string };

  handleMultiItemStockOut: (params: {
    transactionNo: string;
    type: OutboundType;
    sourceWarehouseId: string;
    destinationOrCustomer: string;
    pic: string;
    notes?: string;
    items: Array<{
      sku: string;
      productName: string;
      qty: number;
      sourceBinCode: string;
      notes?: string;
    }>;
  }) => { success: boolean; message: string };

  // Vendor Invoices & PO Receiving
  vendorInvoices: VendorInvoice[];
  createVendorInvoice: (params: {
    invoiceNumber: string;
    poNumber: string;
    vendorId: string;
    vendorName: string;
    targetWarehouseId: string;
    orderDate: string;
    items: Array<{
      sku: string;
      productName: string;
      orderedQty: number;
      unitPrice: number;
      targetBinCode: string;
    }>;
    createdByPic: string;
    notes?: string;
  }) => { success: boolean; message: string; invoiceId?: string };

  receiveVendorInvoiceGoods: (params: {
    invoiceId: string;
    receiptNumber?: string;
    pic: string;
    notes: string;
    receivedItems: Array<{
      sku: string;
      qty: number;
      targetBinCode: string;
    }>;
  }) => { success: boolean; message: string; isPartial: boolean; shortageMessage?: string };

  editPostedVendorInvoiceQty: (params: {
    invoiceId: string;
    receiptId: string;
    updatedItems: Array<{
      sku: string;
      qty: number;
      targetBinCode: string;
    }>;
    editorPic: string;
    editNotes: string;
  }) => { success: boolean; message: string };

  // Stock Opname & Stock Lock System
  stockOpnames: StockOpnameSession[];
  isWarehouseLockedForOpname: (warehouseId: string) => boolean;
  getActiveOpnameSession: (warehouseId: string) => StockOpnameSession | undefined;
  startStockOpname: (
    warehouseId: string,
    pic: string,
    notes?: string
  ) => { success: boolean; message: string; sessionId?: string };
  recordOpnamePhysicalCount: (
    sessionId: string,
    sku: string,
    binCode: string,
    countQty: number,
    notes?: string
  ) => void;
  finalizeAndUnlockStockOpname: (
    sessionId: string,
    approverPic: string,
    notes?: string
  ) => { success: boolean; message: string };
  cancelStockOpname: (sessionId: string, pic: string) => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

const STORAGE_KEY = 'wms_duma_kreasi_v4_clean';

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [notificationEmail, setNotificationEmail] = useState<string>('gudang@dumakreasi.co.id');
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);

  const [products, setProducts] = useState<ProductSKU[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_warehouses`);
    return saved ? JSON.parse(saved) : INITIAL_WAREHOUSES;
  });

  const [bins, setBins] = useState<BinLocation[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_bins`);
    return saved ? JSON.parse(saved) : INITIAL_BINS;
  });

  const [stockPositions, setStockPositions] = useState<StockPosition[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_stock_positions`);
    return saved ? JSON.parse(saved) : INITIAL_STOCK_POSITIONS;
  });

  const [suppliers, setSuppliers] = useState<SupplierPartner[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_suppliers`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [inbounds, setInbounds] = useState<InboundLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_inbounds`);
    return saved ? JSON.parse(saved) : INITIAL_INBOUND_LOGS;
  });

  const [outbounds, setOutbounds] = useState<OutboundLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_outbounds`);
    return saved ? JSON.parse(saved) : INITIAL_OUTBOUND_LOGS;
  });

  const [preOrders, setPreOrders] = useState<PreOrderItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_pre_orders`);
    return saved ? JSON.parse(saved) : INITIAL_PRE_ORDERS;
  });

  const [defects, setDefects] = useState<DefectTrackerItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_defects`);
    return saved ? JSON.parse(saved) : INITIAL_DEFECTS;
  });

  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_vendor_invoices`);
    return saved ? JSON.parse(saved) : INITIAL_VENDOR_INVOICES;
  });

  const [stockOpnames, setStockOpnames] = useState<StockOpnameSession[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_stock_opnames`);
    return saved ? JSON.parse(saved) : INITIAL_STOCK_OPNAMES;
  });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
    localStorage.setItem(`${STORAGE_KEY}_warehouses`, JSON.stringify(warehouses));
    localStorage.setItem(`${STORAGE_KEY}_bins`, JSON.stringify(bins));
    localStorage.setItem(`${STORAGE_KEY}_stock_positions`, JSON.stringify(stockPositions));
    localStorage.setItem(`${STORAGE_KEY}_suppliers`, JSON.stringify(suppliers));
    localStorage.setItem(`${STORAGE_KEY}_inbounds`, JSON.stringify(inbounds));
    localStorage.setItem(`${STORAGE_KEY}_outbounds`, JSON.stringify(outbounds));
    localStorage.setItem(`${STORAGE_KEY}_pre_orders`, JSON.stringify(preOrders));
    localStorage.setItem(`${STORAGE_KEY}_defects`, JSON.stringify(defects));
    localStorage.setItem(`${STORAGE_KEY}_vendor_invoices`, JSON.stringify(vendorInvoices));
    localStorage.setItem(`${STORAGE_KEY}_stock_opnames`, JSON.stringify(stockOpnames));
  }, [products, warehouses, bins, stockPositions, suppliers, inbounds, outbounds, preOrders, defects, vendorInvoices, stockOpnames]);

  const summary = calculateStockSummary(
    products,
    stockPositions,
    inbounds,
    outbounds,
    defects,
    preOrders
  );

  const addProduct = (
    newProduct: ProductSKU,
    initialWarehouseId?: string,
    initialBinCode?: string,
    initialQty = 0
  ) => {
    setProducts((prev) => [newProduct, ...prev]);

    if (initialWarehouseId && initialBinCode && initialQty > 0) {
      const now = new Date().toISOString();
      const newPos: StockPosition = {
        id: `sp-${Date.now()}`,
        sku: newProduct.sku,
        warehouseId: initialWarehouseId,
        binCode: initialBinCode,
        qtyOnHand: initialQty,
        qtyReserved: 0,
        qtyDefect: 0,
        lastUpdated: now,
      };
      setStockPositions((prev) => [newPos, ...prev]);

      // Record initial stock inbound log
      const initialLog: InboundLog = {
        id: `inb-init-${Date.now()}`,
        invoiceNo: `INIT-STOCK-${newProduct.sku}`,
        type: 'VENDOR_PURCHASE',
        sku: newProduct.sku,
        productName: newProduct.name,
        qty: initialQty,
        targetWarehouseId: initialWarehouseId,
        targetBinCode: initialBinCode,
        sourceOrVendor: 'Saldo Stok Awal SKU Baru',
        pic: 'Admin Sistem',
        notes: 'Pencatatan stok awal saat pembuatan SKU katalog',
        timestamp: now,
      };
      setInbounds((prev) => [initialLog, ...prev]);
    }
  };

  const updateProduct = (updated: ProductSKU) => {
    setProducts((prev) => prev.map((p) => (p.sku === updated.sku ? updated : p)));
  };

  const addWarehouse = (wh: Warehouse) => {
    setWarehouses((prev) => [...prev, wh]);
    // Create a default BIN for this new warehouse
    const defaultBin: BinLocation = {
      id: `bin-${Date.now()}`,
      warehouseId: wh.id,
      code: `BIN-A1-01`,
      zone: 'Zona Utama',
      rack: 'Rak 1',
      tier: 'Tingkat 1',
      maxCapacity: 500,
    };
    setBins((prev) => [...prev, defaultBin]);
  };

  const addBinLocation = (bin: BinLocation) => {
    setBins((prev) => [...prev, bin]);
  };

  const addSupplier = (sup: SupplierPartner) => {
    setSuppliers((prev) => [sup, ...prev]);
  };

  const isWarehouseLockedForOpname = (warehouseId: string): boolean => {
    return stockOpnames.some(
      (so) => so.warehouseId === warehouseId && so.status === 'LOCKED_COUNTING'
    );
  };

  const getActiveOpnameSession = (warehouseId: string): StockOpnameSession | undefined => {
    return stockOpnames.find(
      (so) => so.warehouseId === warehouseId && so.status === 'LOCKED_COUNTING'
    );
  };

  const handleStockIn = ({
    type,
    sku,
    qty,
    targetWarehouseId,
    targetBinCode,
    sourceOrVendor,
    pic,
    invoiceNo,
    notes,
    autoAllocatePreOrders = true,
  }: {
    type: InboundType;
    sku: string;
    qty: number;
    targetWarehouseId: string;
    targetBinCode: string;
    sourceOrVendor: string;
    pic: string;
    invoiceNo?: string;
    notes?: string;
    autoAllocatePreOrders?: boolean;
  }) => {
    if (qty <= 0) {
      return { success: false, message: 'Kuantitas barang masuk harus lebih besar dari 0!' };
    }

    const product = products.find((p) => p.sku === sku);
    if (!product) {
      return { success: false, message: `SKU ${sku} tidak ditemukan di katalog!` };
    }

    const now = new Date().toISOString();
    const invNo = invoiceNo || `INB-${Date.now().toString().slice(-6)}`;

    // Update or create StockPosition
    setStockPositions((prev) => {
      const idx = prev.findIndex(
        (sp) => sp.sku === sku && sp.warehouseId === targetWarehouseId && sp.binCode === targetBinCode
      );

      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          qtyOnHand: next[idx].qtyOnHand + qty,
          lastUpdated: now,
        };
        return next;
      } else {
        const newPos: StockPosition = {
          id: `sp-${Date.now()}`,
          sku,
          warehouseId: targetWarehouseId,
          binCode: targetBinCode,
          qtyOnHand: qty,
          qtyReserved: 0,
          qtyDefect: 0,
          lastUpdated: now,
        };
        return [newPos, ...prev];
      }
    });

    // Record Inbound Log
    const newInboundLog: InboundLog = {
      id: `inb-${Date.now()}`,
      invoiceNo: invNo,
      type,
      sku,
      productName: product.name,
      qty,
      targetWarehouseId,
      targetBinCode,
      sourceOrVendor,
      pic,
      notes,
      timestamp: now,
    };
    setInbounds((prev) => [newInboundLog, ...prev]);

    // Auto-allocate pending pre-orders if requested
    let allocatedNotice = '';
    if (autoAllocatePreOrders) {
      const { updatedPreOrders, allocatedTotal } = allocatePreOrdersOnInbound(preOrders, sku, qty);
      if (allocatedTotal > 0) {
        setPreOrders(updatedPreOrders);
        allocatedNotice = ` (${allocatedTotal} unit langsung dialokasikan ke Pre-Order pending)`;
      }
    }

    return {
      success: true,
      message: `Berhasil menambahkan ${qty} unit [${sku}] ke ${targetBinCode}!${allocatedNotice}`,
    };
  };

  const handleStockOut = ({
    type,
    sku,
    qty,
    sourceWarehouseId,
    sourceBinCode,
    destinationOrCustomer,
    pic,
    transactionNo,
    notes,
  }: {
    type: OutboundType;
    sku: string;
    qty: number;
    sourceWarehouseId: string;
    sourceBinCode: string;
    destinationOrCustomer: string;
    pic: string;
    transactionNo?: string;
    notes?: string;
  }) => {
    if (isWarehouseLockedForOpname(sourceWarehouseId)) {
      return {
        success: false,
        message: 'Gudang ini sedang dalam proses LOCK STOCK untuk Stock Opname! Selesaikan atau batalkan audit terlebih dahulu.',
      };
    }

    const product = products.find((p) => p.sku === sku);
    if (!product) {
      return { success: false, message: `SKU ${sku} tidak ditemukan di katalog!` };
    }

    const check = validateStockAvailability(stockPositions, sku, sourceWarehouseId, sourceBinCode, qty);
    if (!check.isValid) {
      return { success: false, message: check.errorMessage || 'Stok tidak mencukupi!' };
    }

    const now = new Date().toISOString();
    const trxNo = transactionNo || `OUT-${Date.now().toString().slice(-6)}`;

    // Deduct stock position
    setStockPositions((prev) => {
      return prev.map((sp) => {
        if (sp.sku === sku && sp.warehouseId === sourceWarehouseId && sp.binCode === sourceBinCode) {
          return {
            ...sp,
            qtyOnHand: sp.qtyOnHand - qty,
            lastUpdated: now,
          };
        }
        return sp;
      });
    });

    // Record Outbound Log
    const newOutboundLog: OutboundLog = {
      id: `out-${Date.now()}`,
      transactionNo: trxNo,
      type,
      sku,
      productName: product.name,
      qty,
      sourceWarehouseId,
      sourceBinCode,
      destinationOrCustomer,
      pic,
      notes,
      timestamp: now,
    };
    setOutbounds((prev) => [newOutboundLog, ...prev]);

    return {
      success: true,
      message: `Berhasil mengeluarkan ${qty} unit [${sku}] dari ${sourceBinCode}. Ref: ${trxNo}`,
    };
  };

  const handleRelocateBin = ({
    sku,
    qty,
    warehouseId,
    fromBinCode,
    toBinCode,
    pic,
    notes,
  }: {
    sku: string;
    qty: number;
    warehouseId: string;
    fromBinCode: string;
    toBinCode: string;
    pic: string;
    notes?: string;
  }) => {
    if (isWarehouseLockedForOpname(warehouseId)) {
      return {
        success: false,
        message: 'Gudang ini sedang dalam proses LOCK STOCK untuk Stock Opname! Relokasi BIN dinonaktifkan sementara.',
      };
    }

    if (fromBinCode === toBinCode) {
      return { success: false, message: 'BIN asal dan BIN tujuan tidak boleh sama!' };
    }

    const check = validateStockAvailability(stockPositions, sku, warehouseId, fromBinCode, qty);
    if (!check.isValid) {
      return { success: false, message: check.errorMessage || 'Stok tidak mencukupi di BIN asal!' };
    }

    const product = products.find((p) => p.sku === sku);
    const now = new Date().toISOString();
    const relocTrxNo = `RELOC-${Date.now().toString().slice(-6)}`;

    // 1. Deduct from source bin
    // 2. Add to target bin
    setStockPositions((prev) => {
      let next = prev.map((sp) => {
        if (sp.sku === sku && sp.warehouseId === warehouseId && sp.binCode === fromBinCode) {
          return {
            ...sp,
            qtyOnHand: sp.qtyOnHand - qty,
            lastUpdated: now,
          };
        }
        return sp;
      });

      const destIdx = next.findIndex(
        (sp) => sp.sku === sku && sp.warehouseId === warehouseId && sp.binCode === toBinCode
      );

      if (destIdx >= 0) {
        next[destIdx] = {
          ...next[destIdx],
          qtyOnHand: next[destIdx].qtyOnHand + qty,
          lastUpdated: now,
        };
      } else {
        next = [
          {
            id: `sp-${Date.now()}`,
            sku,
            warehouseId,
            binCode: toBinCode,
            qtyOnHand: qty,
            qtyReserved: 0,
            qtyDefect: 0,
            lastUpdated: now,
          },
          ...next,
        ];
      }
      return next;
    });

    // Record outbound as BIN_RELOCATION
    const outLog: OutboundLog = {
      id: `out-reloc-${Date.now()}`,
      transactionNo: relocTrxNo,
      type: 'BIN_RELOCATION',
      sku,
      productName: product?.name || sku,
      qty,
      sourceWarehouseId: warehouseId,
      sourceBinCode: fromBinCode,
      destinationOrCustomer: `Pindah ke BIN ${toBinCode}`,
      pic,
      notes: notes || `Relokasi internal BIN ${fromBinCode} -> ${toBinCode}`,
      timestamp: now,
    };
    setOutbounds((prev) => [outLog, ...prev]);

    return {
      success: true,
      message: `Relokasi berhasil! ${qty} unit [${sku}] dipindahkan dari ${fromBinCode} ke ${toBinCode}.`,
    };
  };

  // MULTI-SKU STOCK IN
  const handleMultiItemStockIn = ({
    invoiceNo,
    type,
    targetWarehouseId,
    sourceOrVendor,
    pic,
    notes,
    autoAllocatePreOrders = true,
    items,
  }: {
    invoiceNo: string;
    type: InboundType;
    targetWarehouseId: string;
    sourceOrVendor: string;
    pic: string;
    notes?: string;
    autoAllocatePreOrders?: boolean;
    items: Array<{
      sku: string;
      productName: string;
      qty: number;
      targetBinCode: string;
      notes?: string;
    }>;
  }) => {
    if (!items || items.length === 0) {
      return { success: false, message: 'Harap masukkan minimal 1 baris item SKU!' };
    }

    const now = new Date().toISOString();
    const invNo = invoiceNo?.trim() || `INB-${Date.now().toString().slice(-6)}`;

    // Update stock positions for each item
    setStockPositions((prev) => {
      const updated = [...prev];
      for (const item of items) {
        if (item.qty <= 0) continue;
        const existingIdx = updated.findIndex(
          (sp) => sp.sku === item.sku && sp.warehouseId === targetWarehouseId && sp.binCode === item.targetBinCode
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            qtyOnHand: updated[existingIdx].qtyOnHand + item.qty,
            lastUpdated: now,
          };
        } else {
          updated.push({
            id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sku: item.sku,
            warehouseId: targetWarehouseId,
            binCode: item.targetBinCode,
            qtyOnHand: item.qty,
            qtyReserved: 0,
            qtyDefect: 0,
            lastUpdated: now,
          });
        }
      }
      return updated;
    });

    // Create Inbound Logs
    const newLogs: InboundLog[] = items.map((item, idx) => ({
      id: `inb-${Date.now()}-${idx}`,
      invoiceNo: invNo,
      type,
      sku: item.sku,
      productName: item.productName,
      qty: item.qty,
      targetWarehouseId,
      targetBinCode: item.targetBinCode,
      sourceOrVendor,
      pic,
      notes: item.notes || notes,
      timestamp: now,
    }));
    setInbounds((prev) => [...newLogs, ...prev]);

    // Handle pre-order allocations FIFO
    if (autoAllocatePreOrders) {
      let currentPreOrders = [...preOrders];
      for (const item of items) {
        const { updatedPreOrders } = allocatePreOrdersOnInbound(currentPreOrders, item.sku, item.qty);
        currentPreOrders = updatedPreOrders;
      }
      setPreOrders(currentPreOrders);
    }

    const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
    return {
      success: true,
      message: `Berhasil Stock In ${items.length} SKU (Total ${totalQty} unit) dengan No. Ref ${invNo}!`,
    };
  };

  // MULTI-SKU STOCK OUT
  const handleMultiItemStockOut = ({
    transactionNo,
    type,
    sourceWarehouseId,
    destinationOrCustomer,
    pic,
    notes,
    items,
  }: {
    transactionNo: string;
    type: OutboundType;
    sourceWarehouseId: string;
    destinationOrCustomer: string;
    pic: string;
    notes?: string;
    items: Array<{
      sku: string;
      productName: string;
      qty: number;
      sourceBinCode: string;
      notes?: string;
    }>;
  }) => {
    if (isWarehouseLockedForOpname(sourceWarehouseId)) {
      return {
        success: false,
        message: 'Gudang ini sedang dalam proses LOCK STOCK untuk Stock Opname! Selesaikan atau batalkan Stock Opname terlebih dahulu sebelum pengeluaran barang.',
      };
    }

    if (!items || items.length === 0) {
      return { success: false, message: 'Harap masukkan minimal 1 baris item SKU!' };
    }

    // Validate stock availability for all items before applying
    for (const item of items) {
      const product = products.find((p) => p.sku === item.sku);
      if (!product) {
        return { success: false, message: `SKU ${item.sku} tidak ditemukan di katalog!` };
      }
      const check = validateStockAvailability(stockPositions, item.sku, sourceWarehouseId, item.sourceBinCode, item.qty);
      if (!check.isValid) {
        return {
          success: false,
          message: `Gagal Stock Out: Stok ${item.sku} di BIN ${item.sourceBinCode} tidak mencukupi (diminta ${item.qty} pcs).`,
        };
      }
    }

    const now = new Date().toISOString();
    const trxNo = transactionNo?.trim() || `OUT-${Date.now().toString().slice(-6)}`;

    // Deduct stock positions
    setStockPositions((prev) => {
      const updated = [...prev];
      for (const item of items) {
        const idx = updated.findIndex(
          (sp) => sp.sku === item.sku && sp.warehouseId === sourceWarehouseId && sp.binCode === item.sourceBinCode
        );
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            qtyOnHand: updated[idx].qtyOnHand - item.qty,
            lastUpdated: now,
          };
        }
      }
      return updated;
    });

    // Create Outbound Logs
    const newLogs: OutboundLog[] = items.map((item, idx) => ({
      id: `out-${Date.now()}-${idx}`,
      transactionNo: trxNo,
      type,
      sku: item.sku,
      productName: item.productName,
      qty: item.qty,
      sourceWarehouseId,
      sourceBinCode: item.sourceBinCode,
      destinationOrCustomer,
      pic,
      notes: item.notes || notes,
      timestamp: now,
    }));
    setOutbounds((prev) => [...newLogs, ...prev]);

    const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
    return {
      success: true,
      message: `Berhasil Stock Out ${items.length} SKU (Total ${totalQty} unit) dengan No. Ref ${trxNo}!`,
    };
  };

  // VENDOR INVOICES & PO RECEIVING
  const createVendorInvoice = (data: {
    invoiceNumber: string;
    poNumber: string;
    vendorId: string;
    vendorName: string;
    targetWarehouseId: string;
    orderDate: string;
    items: Array<{
      sku: string;
      productName: string;
      orderedQty: number;
      unitPrice: number;
      targetBinCode: string;
    }>;
    createdByPic: string;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    const invoiceId = `inv-po-${Date.now()}`;
    const totalOrderedQty = data.items.reduce((acc, i) => acc + i.orderedQty, 0);

    const formattedItems: VendorInvoiceItem[] = data.items.map((i, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      sku: i.sku,
      productName: i.productName,
      orderedQty: i.orderedQty,
      receivedQty: 0,
      remainingQty: i.orderedQty,
      unitPrice: i.unitPrice,
      targetBinCode: i.targetBinCode,
    }));

    const newInvoice: VendorInvoice = {
      id: invoiceId,
      invoiceNumber: data.invoiceNumber.trim() || `FAK-${Date.now().toString().slice(-6)}`,
      poNumber: data.poNumber.trim() || `PO-${Date.now().toString().slice(-6)}`,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      targetWarehouseId: data.targetWarehouseId,
      orderDate: data.orderDate || now.slice(0, 10),
      status: 'DRAFT',
      totalOrderedQty,
      totalReceivedQty: 0,
      totalRemainingQty: totalOrderedQty,
      items: formattedItems,
      receivingHistory: [],
      createdByPic: data.createdByPic,
      createdAt: now,
      notes: data.notes,
    };

    setVendorInvoices((prev) => [newInvoice, ...prev]);
    return {
      success: true,
      message: `Faktur Pembelian Vendor ${newInvoice.invoiceNumber} (PO: ${newInvoice.poNumber}) berhasil dibuat!`,
      invoiceId,
    };
  };

  const receiveVendorInvoiceGoods = ({
    invoiceId,
    receiptNumber,
    pic,
    notes,
    receivedItems,
  }: {
    invoiceId: string;
    receiptNumber?: string;
    pic: string;
    notes: string;
    receivedItems: Array<{
      sku: string;
      qty: number;
      targetBinCode: string;
    }>;
  }) => {
    const invoice = vendorInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) {
      return { success: false, message: 'Faktur vendor tidak ditemukan!', isPartial: false };
    }

    const now = new Date().toISOString();
    const rcvNo = receiptNumber?.trim() || `RCV-${Date.now().toString().slice(-6)}`;

    // Filter items where qty > 0
    const validReceives = receivedItems.filter((i) => i.qty > 0);
    if (validReceives.length === 0) {
      return { success: false, message: 'Masukkan setidaknya 1 item dengan kuantitas > 0!', isPartial: false };
    }

    // Update invoice items
    const updatedItems = invoice.items.map((item) => {
      const rcv = validReceives.find((r) => r.sku === item.sku);
      const addedQty = rcv ? rcv.qty : 0;
      const newReceivedQty = item.receivedQty + addedQty;
      const newRemainingQty = Math.max(0, item.orderedQty - newReceivedQty);
      return {
        ...item,
        receivedQty: newReceivedQty,
        remainingQty: newRemainingQty,
        targetBinCode: rcv?.targetBinCode || item.targetBinCode,
      };
    });

    const shortageSummary = calculateVendorShortageSummary(updatedItems);
    const newStatus: 'DRAFT' | 'PARTIAL' | 'FULFILLED' = shortageSummary.hasShortage ? 'PARTIAL' : 'FULFILLED';

    const receivingEntry: VendorReceivingHistory = {
      id: `rcv-${Date.now()}`,
      receiptNumber: rcvNo,
      date: now,
      pic,
      notes,
      fulfillmentType: shortageSummary.fulfillmentType,
      itemsReceived: validReceives.map((r) => {
        const match = invoice.items.find((i) => i.sku === r.sku);
        return {
          sku: r.sku,
          productName: match?.productName || r.sku,
          qty: r.qty,
          targetBinCode: r.targetBinCode,
        };
      }),
    };

    const updatedInvoice: VendorInvoice = {
      ...invoice,
      status: newStatus,
      totalOrderedQty: shortageSummary.totalOrdered,
      totalReceivedQty: shortageSummary.totalReceived,
      totalRemainingQty: shortageSummary.totalShortage,
      items: updatedItems,
      receivingHistory: [receivingEntry, ...invoice.receivingHistory],
      lastEditedAt: now,
      lastEditedByPic: pic,
    };

    setVendorInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)));

    // Add stock to inventory positions and record Inbound Logs
    for (const rcv of validReceives) {
      handleStockIn({
        type: 'PEMBELIAN_VENDOR',
        sku: rcv.sku,
        qty: rcv.qty,
        targetWarehouseId: invoice.targetWarehouseId,
        targetBinCode: rcv.targetBinCode,
        sourceOrVendor: `${invoice.vendorName} (Faktur: ${invoice.invoiceNumber})`,
        pic,
        invoiceNo: `${invoice.invoiceNumber}-${rcvNo}`,
        notes: `Penerimaan ${shortageSummary.fulfillmentType === 'FULL' ? 'Lengkap (Full)' : 'Sebagian (Partial)'}: ${notes}`,
      });
    }

    let shortageMessage = '';
    if (shortageSummary.hasShortage) {
      shortageMessage = `⚠️ Peringatan: Terdapat kekurangan kedatangan barang sebanyak ${shortageSummary.totalShortage} unit sesuai PO!`;
    }

    return {
      success: true,
      message: `Penerimaan barang faktur ${invoice.invoiceNumber} berhasil dicatat (${shortageSummary.fulfillmentType === 'FULL' ? 'Lengkap / Fulfilled' : 'Parsial / Belum Lengkap'}).`,
      isPartial: shortageSummary.hasShortage,
      shortageMessage,
    };
  };

  const editPostedVendorInvoiceQty = ({
    invoiceId,
    receiptId,
    updatedItems,
    editorPic,
    editNotes,
  }: {
    invoiceId: string;
    receiptId: string;
    updatedItems: Array<{
      sku: string;
      qty: number;
      targetBinCode: string;
    }>;
    editorPic: string;
    editNotes: string;
  }) => {
    const invoice = vendorInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return { success: false, message: 'Faktur vendor tidak ditemukan!' };

    const receipt = invoice.receivingHistory.find((r) => r.id === receiptId);
    if (!receipt) return { success: false, message: 'Riwayat penerimaan tidak ditemukan!' };

    const now = new Date().toISOString();

    // Calculate delta per sku between updatedItems and previous receipt.itemsReceived
    for (const updated of updatedItems) {
      const prevItem = receipt.itemsReceived.find((i) => i.sku === updated.sku);
      const oldQty = prevItem ? prevItem.qty : 0;
      const delta = updated.qty - oldQty;

      if (delta !== 0) {
        // Adjust stock positions
        setStockPositions((prev) => {
          return prev.map((sp) => {
            if (sp.sku === updated.sku && sp.warehouseId === invoice.targetWarehouseId && sp.binCode === updated.targetBinCode) {
              return {
                ...sp,
                qtyOnHand: Math.max(0, sp.qtyOnHand + delta),
                lastUpdated: now,
              };
            }
            return sp;
          });
        });

        // Record adjustment log in inbounds
        setInbounds((prev) => [
          {
            id: `inb-adj-${Date.now()}-${updated.sku}`,
            invoiceNo: `REVISI-${invoice.invoiceNumber}`,
            type: 'PEMBELIAN_VENDOR',
            sku: updated.sku,
            productName: updated.sku,
            qty: delta,
            targetWarehouseId: invoice.targetWarehouseId,
            targetBinCode: updated.targetBinCode,
            sourceOrVendor: `${invoice.vendorName} (Revisi Posting)`,
            pic: editorPic,
            notes: `Koreksi Qty Penerimaan (${oldQty} -> ${updated.qty} pcs). PIC Editor: ${editorPic}. Catatan: ${editNotes}`,
            timestamp: now,
          },
          ...prev,
        ]);
      }
    }

    // Update receipt record
    const updatedReceivingHistory = invoice.receivingHistory.map((r) => {
      if (r.id === receiptId) {
        return {
          ...r,
          editedAt: now,
          editedByPic: editorPic,
          editNotes,
          itemsReceived: updatedItems.map((u) => {
            const m = invoice.items.find((i) => i.sku === u.sku);
            return {
              sku: u.sku,
              productName: m?.productName || u.sku,
              qty: u.qty,
              targetBinCode: u.targetBinCode,
            };
          }),
        };
      }
      return r;
    });

    // Re-aggregate total received qty across all receiving history
    const newReceivedQtyMap = new Map<string, number>();
    for (const hist of updatedReceivingHistory) {
      for (const itm of hist.itemsReceived) {
        newReceivedQtyMap.set(itm.sku, (newReceivedQtyMap.get(itm.sku) || 0) + itm.qty);
      }
    }

    const newItems = invoice.items.map((i) => {
      const totRec = newReceivedQtyMap.get(i.sku) || 0;
      return {
        ...i,
        receivedQty: totRec,
        remainingQty: Math.max(0, i.orderedQty - totRec),
      };
    });

    const shortageSummary = calculateVendorShortageSummary(newItems);
    const updatedInv: VendorInvoice = {
      ...invoice,
      status: shortageSummary.hasShortage ? 'PARTIAL' : 'FULFILLED',
      totalOrderedQty: shortageSummary.totalOrdered,
      totalReceivedQty: shortageSummary.totalReceived,
      totalRemainingQty: shortageSummary.totalShortage,
      items: newItems,
      receivingHistory: updatedReceivingHistory,
      lastEditedAt: now,
      lastEditedByPic: editorPic,
    };

    setVendorInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? updatedInv : inv)));

    return {
      success: true,
      message: `Qty penerimaan faktur ${invoice.invoiceNumber} berhasil dikoreksi oleh PIC ${editorPic}. Stok gudang telah disinkronkan.`,
    };
  };

  // STOCK OPNAME WITH LOCK STOCK SYSTEM
  const startStockOpname = (warehouseId: string, pic: string, notes?: string) => {
    const wh = warehouses.find((w) => w.id === warehouseId);
    if (!wh) return { success: false, message: 'Gudang tidak ditemukan!' };

    if (isWarehouseLockedForOpname(warehouseId)) {
      return {
        success: false,
        message: `Gudang ${wh.name} saat ini sedang aktif dalam audit Stock Opname dan stok telah terkunci!`,
      };
    }

    const now = new Date().toISOString();
    const sessionId = `so-${Date.now()}`;
    const sessionCode = `SO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    // Snapshot all current stock in this warehouse
    const whPositions = stockPositions.filter((sp) => sp.warehouseId === warehouseId);
    const opnameItems: StockOpnameItem[] = [];
    const visitedKeys = new Set<string>();

    for (const pos of whPositions) {
      const product = products.find((p) => p.sku === pos.sku);
      const key = `${pos.sku}_${pos.binCode}`;
      visitedKeys.add(key);

      opnameItems.push({
        id: `so-itm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sku: pos.sku,
        productName: product?.name || pos.sku,
        category: product?.category || 'Umum',
        binCode: pos.binCode,
        systemQtySnapshot: pos.qtyOnHand, // LOCK STOCK DARI SALDO TERAKHIR
        physicalCountQty: null,
        varianceQty: 0,
        varianceStatus: 'UNCOUNTED',
        unitPrice: product?.buyPrice || 0,
        varianceValue: 0,
      });
    }

    // Also include any catalog products not yet assigned with 0 snapshot
    for (const prod of products) {
      const defaultBin = bins.find((b) => b.warehouseId === warehouseId)?.code || 'BIN-A1-01';
      const key = `${prod.sku}_${defaultBin}`;
      if (!visitedKeys.has(key) && !whPositions.some((p) => p.sku === prod.sku)) {
        opnameItems.push({
          id: `so-itm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sku: prod.sku,
          productName: prod.name,
          category: prod.category,
          binCode: defaultBin,
          systemQtySnapshot: 0,
          physicalCountQty: null,
          varianceQty: 0,
          varianceStatus: 'UNCOUNTED',
          unitPrice: prod.buyPrice || 0,
          varianceValue: 0,
        });
      }
    }

    const totalSystemQty = opnameItems.reduce((acc, i) => acc + i.systemQtySnapshot, 0);

    const newSession: StockOpnameSession = {
      id: sessionId,
      sessionCode,
      warehouseId,
      warehouseName: wh.name,
      status: 'LOCKED_COUNTING',
      lockedAt: now,
      lockedByPic: pic,
      totalSkus: opnameItems.length,
      totalSystemQty,
      totalPhysicalQty: 0,
      totalVarianceQty: 0,
      totalVarianceValue: 0,
      items: opnameItems,
      notes,
    };

    setStockOpnames((prev) => [newSession, ...prev]);

    return {
      success: true,
      message: `Sistem LOCK STOCK Aktif! Stock Opname [${sessionCode}] berhasil dimulai di ${wh.name}. Saldo stok sistem dikunci untuk penghitungan fisik.`,
      sessionId,
    };
  };

  const recordOpnamePhysicalCount = (
    sessionId: string,
    sku: string,
    binCode: string,
    countQty: number,
    notes?: string
  ) => {
    const now = new Date().toISOString();
    setStockOpnames((prev) => {
      return prev.map((session) => {
        if (session.id !== sessionId) return session;

        const updatedItems = session.items.map((item) => {
          if (item.sku === sku && (item.binCode === binCode || !binCode)) {
            const variance = calculateOpnameItemVariance(item.systemQtySnapshot, countQty, item.unitPrice);
            return {
              ...item,
              physicalCountQty: countQty,
              varianceQty: variance.varianceQty,
              varianceStatus: variance.varianceStatus,
              varianceValue: variance.varianceValue,
              scannedAt: now,
              notes: notes || item.notes,
            };
          }
          return item;
        });

        const totalPhysicalQty = updatedItems.reduce(
          (sum, i) => sum + (i.physicalCountQty !== null ? i.physicalCountQty : 0),
          0
        );
        const totalVarianceQty = updatedItems.reduce((sum, i) => sum + i.varianceQty, 0);
        const totalVarianceValue = updatedItems.reduce((sum, i) => sum + i.varianceValue, 0);

        return {
          ...session,
          totalPhysicalQty,
          totalVarianceQty,
          totalVarianceValue,
          items: updatedItems,
        };
      });
    });
  };

  const finalizeAndUnlockStockOpname = (
    sessionId: string,
    approverPic: string,
    notes?: string
  ) => {
    const session = stockOpnames.find((s) => s.id === sessionId);
    if (!session) return { success: false, message: 'Sesi Stock Opname tidak ditemukan!' };
    if (session.status !== 'LOCKED_COUNTING') {
      return { success: false, message: 'Sesi Stock Opname tidak dalam status terkunci!' };
    }

    const now = new Date().toISOString();

    // Synchronize physical count to stock positions
    setStockPositions((prev) => {
      const updated = [...prev];
      for (const item of session.items) {
        if (item.physicalCountQty !== null && item.varianceQty !== 0) {
          const idx = updated.findIndex(
            (sp) => sp.sku === item.sku && sp.warehouseId === session.warehouseId && sp.binCode === item.binCode
          );
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              qtyOnHand: item.physicalCountQty,
              lastUpdated: now,
            };
          } else {
            updated.push({
              id: `sp-so-${Date.now()}-${item.sku}`,
              sku: item.sku,
              warehouseId: session.warehouseId,
              binCode: item.binCode,
              qtyOnHand: item.physicalCountQty,
              qtyReserved: 0,
              qtyDefect: 0,
              lastUpdated: now,
            });
          }
        }
      }
      return updated;
    });

    // Generate adjustment logs
    const adjustmentInbounds: InboundLog[] = [];
    const adjustmentOutbounds: OutboundLog[] = [];

    for (const item of session.items) {
      if (item.physicalCountQty !== null && item.varianceQty > 0) {
        adjustmentInbounds.push({
          id: `adj-in-${Date.now()}-${item.sku}`,
          invoiceNo: `ADJ-SO-${session.sessionCode}`,
          type: 'LABELING',
          sku: item.sku,
          productName: item.productName,
          qty: item.varianceQty,
          targetWarehouseId: session.warehouseId,
          targetBinCode: item.binCode,
          sourceOrVendor: `Penyesuaian Fisik Stock Opname (${session.sessionCode})`,
          pic: approverPic,
          notes: `Surplus fisik +${item.varianceQty} pcs disesuaikan`,
          timestamp: now,
        });
      } else if (item.physicalCountQty !== null && item.varianceQty < 0) {
        adjustmentOutbounds.push({
          id: `adj-out-${Date.now()}-${item.sku}`,
          transactionNo: `ADJ-SO-${session.sessionCode}`,
          type: 'DAILY_SALES',
          sku: item.sku,
          productName: item.productName,
          qty: Math.abs(item.varianceQty),
          sourceWarehouseId: session.warehouseId,
          sourceBinCode: item.binCode,
          destinationOrCustomer: `Selisih Defisit Stock Opname (${session.sessionCode})`,
          pic: approverPic,
          notes: `Defisit fisik ${item.varianceQty} pcs disesuaikan`,
          timestamp: now,
        });
      }
    }

    if (adjustmentInbounds.length > 0) setInbounds((prev) => [...adjustmentInbounds, ...prev]);
    if (adjustmentOutbounds.length > 0) setOutbounds((prev) => [...adjustmentOutbounds, ...prev]);

    // Complete and unlock session
    const completedSession: StockOpnameSession = {
      ...session,
      status: 'ADJUSTED_COMPLETED',
      completedAt: now,
      completedByPic: approverPic,
      notes: notes || session.notes,
    };

    setStockOpnames((prev) => prev.map((s) => (s.id === sessionId ? completedSession : s)));

    return {
      success: true,
      message: `Stock Opname [${session.sessionCode}] SELESAI & SISTEM STOK DIBUKA KEMBALI (UNLOCKED)! Saldo fisik telah disinkronkan.`,
    };
  };

  const cancelStockOpname = (sessionId: string, pic: string) => {
    const now = new Date().toISOString();
    setStockOpnames((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: 'CANCELLED',
              completedAt: now,
              completedByPic: pic,
              notes: `${s.notes ? s.notes + ' | ' : ''}Dibatalkan oleh PIC: ${pic}`,
            }
          : s
      )
    );
  };

  const addPreOrder = (item: Omit<PreOrderItem, 'id' | 'allocatedQty' | 'status'>) => {
    const newItem: PreOrderItem = {
      ...item,
      id: `po-${Date.now()}`,
      allocatedQty: 0,
      status: 'MENUNGGU_BARANG',
    };
    setPreOrders((prev) => [newItem, ...prev]);
  };

  const updatePreOrderStatus = (id: string, newStatus: PreOrderStatus) => {
    setPreOrders((prev) =>
      prev.map((po) => (po.id === id ? { ...po, status: newStatus } : po))
    );
  };

  const fulfillPreOrder = (
    id: string,
    sourceWarehouseId: string,
    sourceBinCode: string,
    pic: string
  ) => {
    const order = preOrders.find((po) => po.id === id);
    if (!order) return { success: false, message: 'Data Pre-Order tidak ditemukan!' };

    // Fulfill via Outbound
    const outResult = handleStockOut({
      type: 'DAILY_SALES',
      sku: order.sku,
      qty: order.requestedQty,
      sourceWarehouseId,
      sourceBinCode,
      destinationOrCustomer: `Fulfill PO #${order.orderNo} (${order.customerName} - ${order.channel})`,
      pic,
      transactionNo: `SO-PO-${order.orderNo}`,
      notes: `Fulfillment pesanan Pre-Order yang telah ready. Resi siap dicetak.`,
    });

    if (outResult.success) {
      updatePreOrderStatus(id, 'SUDAH_DIKIRIM');
    }
    return outResult;
  };

  const recordDefect = ({
    sku,
    qty,
    warehouseId,
    vendorId,
    vendorName,
    detectedFrom,
    defectType,
    pic,
    notes,
  }: {
    sku: string;
    qty: number;
    warehouseId: string;
    vendorId: string;
    vendorName: string;
    detectedFrom: 'INBOUND_QC' | 'GUDANG_SORTIR' | 'CUSTOMER_RETURN';
    defectType: any;
    pic: string;
    notes: string;
  }) => {
    const product = products.find((p) => p.sku === sku);
    const now = new Date().toISOString();
    const defectCode = `DEF-${now.slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const newDefect: DefectTrackerItem = {
      id: `def-${Date.now()}`,
      defectCode,
      sku,
      productName: product?.name || sku,
      qty,
      warehouseId,
      detectedFrom,
      vendorId,
      vendorName,
      defectType,
      repairIteration: 0,
      status: 'BARU_DITEMUKAN',
      dateReported: now,
      lastUpdated: now,
      history: [
        {
          date: now,
          action: 'Pencatatan Defect Baru di Gudang',
          repairIteration: 0,
          note: notes,
          pic,
        },
      ],
    };

    setDefects((prev) => [newDefect, ...prev]);

    // Put into defect bin in stock positions
    setStockPositions((prev) => {
      const idx = prev.findIndex(
        (sp) => sp.sku === sku && sp.warehouseId === warehouseId && sp.binCode.includes('DEF')
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          qtyDefect: next[idx].qtyDefect + qty,
          lastUpdated: now,
        };
        return next;
      }
      return prev;
    });
  };

  const updateDefectAction = ({
    defectId,
    newStatus,
    actionLabel,
    notes,
    pic,
    targetNormalBin,
  }: {
    defectId: string;
    newStatus: DefectStatus;
    actionLabel: string;
    notes: string;
    pic: string;
    targetNormalBin?: string;
  }) => {
    const item = defects.find((d) => d.id === defectId);
    if (!item) return { success: false, message: 'Item defect tidak ditemukan!' };

    const updated = advanceDefectStatus(item, newStatus, actionLabel, notes, pic);
    setDefects((prev) => prev.map((d) => (d.id === defectId ? updated : d)));

    // If resolved repaired: return to healthy stock
    if (newStatus === 'SELESAI_DIPERBAIKI') {
      const binToUse = targetNormalBin || 'BIN-A1-01';
      handleStockIn({
        type: 'CUSTOMER_RETURN',
        sku: item.sku,
        qty: item.qty,
        targetWarehouseId: item.warehouseId,
        targetBinCode: binToUse,
        sourceOrVendor: `Selesai Diperbaiki Vendor (${item.vendorName})`,
        pic,
        invoiceNo: `REPAIR-OK-${item.defectCode}`,
        notes: `Barang defect selesai diperbaiki (Perbaikan Ke-${updated.repairIteration}). Lolos QC ulang dan masuk stok normal.`,
      });
    }

    return {
      success: true,
      message: `Status defect ${item.defectCode} diperbarui menjadi [${newStatus}]. Perbaikan ke-${updated.repairIteration}.`,
    };
  };

  const resetAllDataToDefault = () => {
    localStorage.removeItem(`${STORAGE_KEY}_products`);
    localStorage.removeItem(`${STORAGE_KEY}_warehouses`);
    localStorage.removeItem(`${STORAGE_KEY}_bins`);
    localStorage.removeItem(`${STORAGE_KEY}_stock_positions`);
    localStorage.removeItem(`${STORAGE_KEY}_suppliers`);
    localStorage.removeItem(`${STORAGE_KEY}_inbounds`);
    localStorage.removeItem(`${STORAGE_KEY}_outbounds`);
    localStorage.removeItem(`${STORAGE_KEY}_pre_orders`);
    localStorage.removeItem(`${STORAGE_KEY}_defects`);
    localStorage.removeItem(`${STORAGE_KEY}_vendor_invoices`);
    localStorage.removeItem(`${STORAGE_KEY}_stock_opnames`);

    setProducts(INITIAL_PRODUCTS);
    setWarehouses(INITIAL_WAREHOUSES);
    setBins(INITIAL_BINS);
    setStockPositions(INITIAL_STOCK_POSITIONS);
    setSuppliers(INITIAL_SUPPLIERS);
    setInbounds(INITIAL_INBOUND_LOGS);
    setOutbounds(INITIAL_OUTBOUND_LOGS);
    setPreOrders(INITIAL_PRE_ORDERS);
    setDefects(INITIAL_DEFECTS);
    setVendorInvoices(INITIAL_VENDOR_INVOICES);
    setStockOpnames(INITIAL_STOCK_OPNAMES);
    setDismissedNotifIds([]);
  };

  // Compute active notifications (low stock, out of stock, preorders, defects, vendor shortage, and stock lock)
  const rawBaseNotifications = generateNotifications(products, stockPositions, defects, preOrders);

  const vendorShortageNotifs: AppNotification[] = vendorInvoices
    .filter((inv) => inv.status === 'PARTIAL' && inv.totalRemainingQty > 0)
    .map((inv) => ({
      id: `notif-vendor-shortage-${inv.id}`,
      type: 'SYSTEM',
      title: `⚠️ Kekurangan Kedatangan PO: ${inv.poNumber}`,
      message: `Faktur ${inv.invoiceNumber} (${inv.vendorName}) masih memiliki kekurangan ${inv.totalRemainingQty} unit dari Purchase Order.`,
      severity: 'WARNING',
      timestamp: inv.lastEditedAt || inv.createdAt,
      actionTab: 'vendor-invoices',
      read: false,
    }));

  const opnameLockNotifs: AppNotification[] = stockOpnames
    .filter((so) => so.status === 'LOCKED_COUNTING')
    .map((so) => ({
      id: `notif-so-lock-${so.id}`,
      type: 'SYSTEM',
      title: `🔒 Lock Stock Aktif: ${so.warehouseName}`,
      message: `Stock Opname [${so.sessionCode}] sedang berjalan (PIC: ${so.lockedByPic}). Pengeluaran stok dikunci untuk penghitungan fisik.`,
      severity: 'INFO',
      timestamp: so.lockedAt,
      actionTab: 'stock-opname',
      read: false,
    }));

  const allRawNotifications = [...rawBaseNotifications, ...vendorShortageNotifs, ...opnameLockNotifs];
  const notifications = allRawNotifications.filter((n) => !dismissedNotifIds.includes(n.id));

  const dismissNotification = (id: string) => {
    setDismissedNotifIds((prev) => [...prev, id]);
  };

  const markAllNotificationsRead = () => {
    setDismissedNotifIds(allRawNotifications.map((n) => n.id));
  };

  const sendSimulatedEmailAlert = (subject: string, messageText: string) => {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    return {
      success: true,
      message: `[Simulasi Email Berhasil] Notifikasi terkirim ke: ${notificationEmail} pada ${timestamp} WIB. Subjek: "${subject}"`,
    };
  };

  // Optional sample data loader for PT Duma Kreasi Indonesia
  const loadSampleDumaData = () => {
    const sampleProducts: ProductSKU[] = [
      {
        sku: 'DKI-APP-001',
        name: 'Kemeja Katun Signature Duma Kreasi (Navy)',
        category: 'Apparel & Pakaian',
        unit: 'Pcs',
        buyPrice: 95000,
        sellPrice: 195000,
        minStockAlert: 20,
        description: 'Seragam dan pakaian katun combed 30s premium PT Duma Kreasi Indonesia',
        createdAt: '2026-10-01',
      },
      {
        sku: 'DKI-APP-002',
        name: 'Polo Shirt Bordir Duma Kreasi (White)',
        category: 'Apparel & Pakaian',
        unit: 'Pcs',
        buyPrice: 65000,
        sellPrice: 145000,
        minStockAlert: 25,
        description: 'Polo lacoste cvc 24s dengan bordir logo',
        createdAt: '2026-10-05',
      },
      {
        sku: 'DKI-MERCH-003',
        name: 'Tote Bag Kanvas Duma Kreasi Eco-Series',
        category: 'Merchandise & Promosi',
        unit: 'Pcs',
        buyPrice: 35000,
        sellPrice: 79000,
        minStockAlert: 15,
        description: 'Tote bag souvenir perusahaan bahan kanvas 14oz',
        createdAt: '2026-10-10',
      },
      {
        sku: 'DKI-PACK-004',
        name: 'Karton Box Packaging Corrugated Duma (M)',
        category: 'Kemasan & Packaging',
        unit: 'Box',
        buyPrice: 4500,
        sellPrice: 9000,
        minStockAlert: 100,
        description: 'Kardus packing double wall ukuran 30x20x15cm',
        createdAt: '2026-10-12',
      },
    ];

    const samplePositions: StockPosition[] = [
      { id: 'sp-1', sku: 'DKI-APP-001', warehouseId: 'WH-DKI01', binCode: 'BIN-A1-01', qtyOnHand: 18, qtyReserved: 5, qtyDefect: 2, lastUpdated: '2026-10-25' }, // Low stock (18 <= 20)
      { id: 'sp-2', sku: 'DKI-APP-002', warehouseId: 'WH-DKI01', binCode: 'BIN-A1-02', qtyOnHand: 60, qtyReserved: 0, qtyDefect: 1, lastUpdated: '2026-10-26' },
      { id: 'sp-3', sku: 'DKI-MERCH-003', warehouseId: 'WH-DKI01', binCode: 'BIN-B1-01', qtyOnHand: 0, qtyReserved: 0, qtyDefect: 0, lastUpdated: '2026-10-20' }, // Out of stock (0)
      { id: 'sp-4', sku: 'DKI-PACK-004', warehouseId: 'WH-DKI01', binCode: 'BIN-B1-02', qtyOnHand: 350, qtyReserved: 50, qtyDefect: 0, lastUpdated: '2026-10-28' },
    ];

    const sampleSuppliers: SupplierPartner[] = [
      {
        id: 'SUP-DKI-01',
        code: 'VND-DUMA-01',
        name: 'PT Mitra Tekstil Kreasi Nusantara',
        category: 'PRODUK_JADI',
        picName: 'Ahmad Kurniawan',
        phone: '0812-7788-9900',
        email: 'ahmad@mitrakreasi.com',
        address: 'Kawasan Industri Cikarang Blok B No. 12, Jawa Barat',
        paymentTerms: 'NET 30 Hari',
        rating: 5,
        notes: 'Vendor konveksi utama kemeja dan seragam',
      },
    ];

    const sampleInbounds: InboundLog[] = [
      {
        id: 'in-dki-1',
        invoiceNo: 'PO-DKI-202610-01',
        type: 'VENDOR_PURCHASE',
        sku: 'DKI-APP-001',
        productName: 'Kemeja Katun Signature Duma Kreasi (Navy)',
        qty: 100,
        targetWarehouseId: 'WH-DKI01',
        targetBinCode: 'BIN-A1-01',
        sourceOrVendor: 'PT Mitra Tekstil Kreasi Nusantara',
        pic: 'Staff QC Duma',
        notes: 'Penerimaan PO Seragam Batch Oktober',
        timestamp: '2026-10-15T09:00:00Z',
      },
    ];

    const sampleOutbounds: OutboundLog[] = [
      {
        id: 'out-dki-1',
        transactionNo: 'SO-DKI-8801',
        type: 'DAILY_SALES',
        sku: 'DKI-APP-001',
        productName: 'Kemeja Katun Signature Duma Kreasi (Navy)',
        qty: 82,
        sourceWarehouseId: 'WH-DKI01',
        sourceBinCode: 'BIN-A1-01',
        destinationOrCustomer: 'Pengiriman Klien Korporat Duma Kreasi',
        pic: 'Dispatch Duma',
        notes: 'Kirim via kurir ekspedisi Lalamove',
        timestamp: '2026-10-22T14:30:00Z',
      },
    ];

    setProducts(sampleProducts);
    setStockPositions(samplePositions);
    setSuppliers(sampleSuppliers);
    setInbounds(sampleInbounds);
    setOutbounds(sampleOutbounds);
  };

  const bulkImportProducts = (
    items: {
      product: ProductSKU;
      initialWarehouseId?: string;
      initialBinCode?: string;
      initialQty?: number;
    }[],
    mode: 'MERGE' | 'REPLACE' = 'MERGE'
  ) => {
    const now = new Date().toISOString();
    const importedProducts = items.map((i) => i.product);

    if (mode === 'REPLACE') {
      setProducts(importedProducts);
    } else {
      setProducts((prev) => {
        const map = new Map<string, ProductSKU>();
        prev.forEach((p) => map.set(p.sku.toUpperCase(), p));
        importedProducts.forEach((p) => map.set(p.sku.toUpperCase(), p));
        return Array.from(map.values());
      });
    }

    // Process initial stock positions
    const newStockPositions: StockPosition[] = [];
    const newInboundLogs: InboundLog[] = [];

    items.forEach((item, index) => {
      if (item.initialWarehouseId && item.initialBinCode && item.initialQty && item.initialQty > 0) {
        newStockPositions.push({
          id: `sp-bulk-${Date.now()}-${index}`,
          sku: item.product.sku,
          warehouseId: item.initialWarehouseId,
          binCode: item.initialBinCode,
          qtyOnHand: item.initialQty,
          qtyReserved: 0,
          qtyDefect: 0,
          lastUpdated: now,
        });

        newInboundLogs.push({
          id: `inb-bulk-${Date.now()}-${index}`,
          invoiceNo: `INIT-BULK-${item.product.sku}`,
          type: 'VENDOR_PURCHASE',
          sku: item.product.sku,
          productName: item.product.name,
          qty: item.initialQty,
          targetWarehouseId: item.initialWarehouseId,
          targetBinCode: item.initialBinCode,
          sourceOrVendor: 'Saldo Stok Awal (Bulk Import)',
          pic: 'Admin Bulk Import',
          notes: 'Impor massal master SKU & stok awal',
          timestamp: now,
        });
      }
    });

    if (newStockPositions.length > 0) {
      if (mode === 'REPLACE') {
        setStockPositions(newStockPositions);
      } else {
        setStockPositions((prev) => {
          const updated = [...prev];
          newStockPositions.forEach((np) => {
            const existingIdx = updated.findIndex(
              (p) => p.sku === np.sku && p.warehouseId === np.warehouseId && p.binCode === np.binCode
            );
            if (existingIdx >= 0) {
              updated[existingIdx] = {
                ...updated[existingIdx],
                qtyOnHand: updated[existingIdx].qtyOnHand + np.qtyOnHand,
                lastUpdated: now,
              };
            } else {
              updated.push(np);
            }
          });
          return updated;
        });
      }
    }

    if (newInboundLogs.length > 0) {
      setInbounds((prev) => [...newInboundLogs, ...prev]);
    }

    return {
      success: true,
      importedCount: items.length,
      message: `Berhasil mengimpor ${items.length} master SKU ke sistem (${mode === 'REPLACE' ? 'Timpa Seluruh Data' : 'Gabungkan / Merge'}).`,
    };
  };

  const bulkImportStockPositions = (
    items: { sku: string; warehouseId: string; binCode: string; qtyOnHand: number }[]
  ) => {
    const now = new Date().toISOString();
    setStockPositions((prev) => {
      const updated = [...prev];
      items.forEach((item, idx) => {
        const existingIdx = updated.findIndex(
          (p) => p.sku === item.sku && p.warehouseId === item.warehouseId && p.binCode === item.binCode
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            qtyOnHand: item.qtyOnHand,
            lastUpdated: now,
          };
        } else {
          updated.push({
            id: `sp-import-${Date.now()}-${idx}`,
            sku: item.sku,
            warehouseId: item.warehouseId,
            binCode: item.binCode,
            qtyOnHand: item.qtyOnHand,
            qtyReserved: 0,
            qtyDefect: 0,
            lastUpdated: now,
          });
        }
      });
      return updated;
    });

    return {
      success: true,
      importedCount: items.length,
      message: `Berhasil memperbarui ${items.length} posisi stok di gudang.`,
    };
  };

  const bulkImportSuppliers = (newSuppliers: SupplierPartner[], mode: 'MERGE' | 'REPLACE' = 'MERGE') => {
    if (mode === 'REPLACE') {
      setSuppliers(newSuppliers);
    } else {
      setSuppliers((prev) => {
        const map = new Map<string, SupplierPartner>();
        prev.forEach((s) => map.set(s.code.toUpperCase(), s));
        newSuppliers.forEach((s) => map.set(s.code.toUpperCase(), s));
        return Array.from(map.values());
      });
    }

    return {
      success: true,
      importedCount: newSuppliers.length,
      message: `Berhasil mengimpor ${newSuppliers.length} mitra/supplier.`,
    };
  };

  const bulkRestoreDatabase = (payload: any) => {
    try {
      if (!payload || typeof payload !== 'object') {
        return { success: false, message: 'Format berkas JSON cadangan tidak valid.' };
      }

      if (Array.isArray(payload.products)) setProducts(payload.products);
      if (Array.isArray(payload.warehouses)) setWarehouses(payload.warehouses);
      if (Array.isArray(payload.bins)) setBins(payload.bins);
      if (Array.isArray(payload.stockPositions)) setStockPositions(payload.stockPositions);
      if (Array.isArray(payload.suppliers)) setSuppliers(payload.suppliers);
      if (Array.isArray(payload.inbounds)) setInbounds(payload.inbounds);
      if (Array.isArray(payload.outbounds)) setOutbounds(payload.outbounds);
      if (Array.isArray(payload.preOrders)) setPreOrders(payload.preOrders);
      if (Array.isArray(payload.defects)) setDefects(payload.defects);

      return {
        success: true,
        message: 'Pemulihan data cadangan berhasil! Seluruh tabel dan transaksi telah dimuat.',
      };
    } catch (err: any) {
      return { success: false, message: `Gagal memulihkan database: ${err.message}` };
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        products,
        warehouses,
        bins,
        stockPositions,
        suppliers,
        inbounds,
        outbounds,
        preOrders,
        defects,
        summary,
        notifications,
        dismissNotification,
        markAllNotificationsRead,
        notificationEmail,
        setNotificationEmail,
        sendSimulatedEmailAlert,
        loadSampleDumaData,
        activeTab,
        setActiveTab,
        addProduct,
        updateProduct,
        addWarehouse,
        addBinLocation,
        addSupplier,
        handleStockIn,
        handleStockOut,
        handleRelocateBin,
        addPreOrder,
        updatePreOrderStatus,
        fulfillPreOrder,
        recordDefect,
        updateDefectAction,
        resetAllDataToDefault,
        bulkImportProducts,
        bulkImportStockPositions,
        bulkImportSuppliers,
        bulkRestoreDatabase,
        handleMultiItemStockIn,
        handleMultiItemStockOut,
        vendorInvoices,
        createVendorInvoice,
        receiveVendorInvoiceGoods,
        editPostedVendorInvoiceQty,
        stockOpnames,
        isWarehouseLockedForOpname,
        getActiveOpnameSession,
        startStockOpname,
        recordOpnamePhysicalCount,
        finalizeAndUnlockStockOpname,
        cancelStockOpname,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
