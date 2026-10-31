import {
  ProductSKU,
  StockPosition,
  InboundLog,
  OutboundLog,
  PreOrderItem,
  DefectTrackerItem,
  StockSummary,
  DefectStatus,
  AppNotification,
} from '../types/inventory';

export function calculateStockSummary(
  products: ProductSKU[],
  stockPositions: StockPosition[],
  inbounds: InboundLog[],
  outbounds: OutboundLog[],
  defects: DefectTrackerItem[],
  preOrders: PreOrderItem[]
): StockSummary {
  const totalStockOnHand = stockPositions.reduce((acc, sp) => acc + sp.qtyOnHand, 0);
  const totalUniqueSKUs = products.length;

  const totalIncomingMonth = inbounds.reduce((acc, log) => acc + log.qty, 0);
  const totalOutgoingMonth = outbounds.reduce((acc, log) => acc + log.qty, 0);

  // Group on-hand per SKU across all warehouses
  const skuStockMap = new Map<string, number>();
  for (const pos of stockPositions) {
    skuStockMap.set(pos.sku, (skuStockMap.get(pos.sku) || 0) + pos.qtyOnHand);
  }

  let lowStockItemsCount = 0;
  let totalEstimatedStockValue = 0;

  for (const prod of products) {
    const totalQty = skuStockMap.get(prod.sku) || 0;
    if (totalQty <= prod.minStockAlert) {
      lowStockItemsCount++;
    }
    totalEstimatedStockValue += totalQty * prod.buyPrice;
  }

  const totalDefectCount = defects
    .filter((d) => d.status !== 'SELESAI_DIPERBAIKI' && d.status !== 'SCRAP_WRITE_OFF')
    .reduce((acc, d) => acc + d.qty, 0);

  const totalPendingPOCount = preOrders
    .filter((po) => po.status === 'MENUNGGU_BARANG')
    .reduce((acc, po) => acc + (po.requestedQty - po.allocatedQty), 0);

  return {
    totalStockOnHand,
    totalUniqueSKUs,
    totalIncomingMonth,
    totalOutgoingMonth,
    lowStockItemsCount,
    totalDefectCount,
    totalPendingPOCount,
    totalEstimatedStockValue,
  };
}

export interface MutationRecord {
  id: string;
  timestamp: string;
  referenceNo: string;
  type: 'INBOUND' | 'OUTBOUND';
  subType: string;
  warehouseId: string;
  binCode: string;
  sourceOrDestination: string;
  qtyIn: number;
  qtyOut: number;
  runningBalance: number;
  pic: string;
  notes: string;
}

export function calculateSkuMutationLedger(
  targetSku: string,
  stockPositions: StockPosition[],
  inbounds: InboundLog[],
  outbounds: OutboundLog[]
): {
  targetSku: string;
  currentStock: number;
  totalIn: number;
  totalOut: number;
  records: MutationRecord[];
} {
  const currentStock = stockPositions
    .filter((pos) => pos.sku === targetSku)
    .reduce((acc, p) => acc + p.qtyOnHand, 0);

  const rawIn = inbounds
    .filter((log) => log.sku === targetSku)
    .map((log) => ({
      id: `in-${log.id}`,
      timestamp: log.timestamp,
      referenceNo: log.invoiceNo,
      type: 'INBOUND' as const,
      subType: log.type,
      warehouseId: log.targetWarehouseId,
      binCode: log.targetBinCode,
      sourceOrDestination: log.sourceOrVendor,
      qtyIn: log.qty,
      qtyOut: 0,
      pic: log.pic,
      notes: log.notes || '-',
    }));

  const rawOut = outbounds
    .filter((log) => log.sku === targetSku)
    .map((log) => ({
      id: `out-${log.id}`,
      timestamp: log.timestamp,
      referenceNo: log.transactionNo,
      type: 'OUTBOUND' as const,
      subType: log.type,
      warehouseId: log.sourceWarehouseId,
      binCode: log.sourceBinCode,
      sourceOrDestination: log.destinationOrCustomer,
      qtyIn: 0,
      qtyOut: log.qty,
      pic: log.pic,
      notes: log.notes || '-',
    }));

  // Combine and sort chronologically (oldest to newest)
  const combined = [...rawIn, ...rawOut].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let totalIn = 0;
  let totalOut = 0;
  for (const item of combined) {
    totalIn += item.qtyIn;
    totalOut += item.qtyOut;
  }

  // Calculate opening stock balance:
  // CurrentStock = OpeningStock + totalIn - totalOut
  // => OpeningStock = CurrentStock - totalIn + totalOut
  const openingStock = Math.max(0, currentStock - totalIn + totalOut);

  let currentBalance = openingStock;
  const records: MutationRecord[] = combined.map((entry) => {
    currentBalance = currentBalance + entry.qtyIn - entry.qtyOut;
    return {
      ...entry,
      runningBalance: currentBalance,
    };
  });

  return {
    targetSku,
    currentStock,
    totalIn,
    totalOut,
    records,
  };
}

export function validateStockAvailability(
  stockPositions: StockPosition[],
  sku: string,
  warehouseId: string,
  binCode: string,
  requestedQty: number
): {
  isValid: boolean;
  availableQty: number;
  errorMessage?: string;
} {
  const position = stockPositions.find(
    (pos) => pos.sku === sku && pos.warehouseId === warehouseId && pos.binCode === binCode
  );

  if (!position) {
    return {
      isValid: false,
      availableQty: 0,
      errorMessage: `SKU ${sku} tidak ditemukan di Gudang [${warehouseId}] pada BIN [${binCode}]!`,
    };
  }

  const available = position.qtyOnHand - position.qtyReserved;

  if (requestedQty <= 0) {
    return {
      isValid: false,
      availableQty: available,
      errorMessage: `Kuantitas harus lebih besar dari 0!`,
    };
  }

  if (requestedQty > available) {
    return {
      isValid: false,
      availableQty: available,
      errorMessage: `Stok tidak mencukupi! Tersedia: ${available} pcs, Diminta: ${requestedQty} pcs.`,
    };
  }

  return {
    isValid: true,
    availableQty: available,
  };
}

export function advanceDefectStatus(
  defect: DefectTrackerItem,
  newStatus: DefectStatus,
  actionLabel: string,
  note: string,
  pic: string
): DefectTrackerItem {
  const now = new Date().toISOString();
  let nextIteration = defect.repairIteration;

  // If sending to vendor for repair, increase repair counter
  if (newStatus === 'DIKIRIM_KE_VENDOR') {
    nextIteration = defect.repairIteration + 1;
  }

  const newHistoryEntry = {
    date: now,
    action: actionLabel,
    repairIteration: nextIteration,
    note,
    pic,
  };

  return {
    ...defect,
    status: newStatus,
    repairIteration: nextIteration,
    history: [newHistoryEntry, ...defect.history],
    lastUpdated: now,
    resolvedDate:
      newStatus === 'SELESAI_DIPERBAIKI' || newStatus === 'SCRAP_WRITE_OFF'
        ? now
        : defect.resolvedDate,
  };
}

export function allocatePreOrdersOnInbound(
  preOrders: PreOrderItem[],
  inboundSku: string,
  incomingQty: number
): {
  updatedPreOrders: PreOrderItem[];
  allocatedTotal: number;
  remainingInboundStock: number;
} {
  let remainingStock = incomingQty;
  let totalAllocated = 0;

  const updatedPreOrders = preOrders.map((po) => {
    if (po.sku !== inboundSku || po.status !== 'MENUNGGU_BARANG' || remainingStock <= 0) {
      return po;
    }

    const needed = po.requestedQty - po.allocatedQty;
    const canAllocate = Math.min(needed, remainingStock);

    if (canAllocate > 0) {
      const newAllocated = po.allocatedQty + canAllocate;
      remainingStock -= canAllocate;
      totalAllocated += canAllocate;

      const isFullyAllocated = newAllocated >= po.requestedQty;
      return {
        ...po,
        allocatedQty: newAllocated,
        status: isFullyAllocated ? ('SIAP_KIRIM' as const) : ('MENUNGGU_BARANG' as const),
      };
    }

    return po;
  });

  return {
    updatedPreOrders,
    allocatedTotal: totalAllocated,
    remainingInboundStock: remainingStock,
  };
}

export function generateNotifications(
  products: ProductSKU[],
  stockPositions: StockPosition[],
  defects: DefectTrackerItem[],
  preOrders: PreOrderItem[]
): AppNotification[] {
  const notifications: AppNotification[] = [];
  const now = new Date().toISOString();

  // Aggregate stock per SKU
  const skuStockMap = new Map<string, number>();
  for (const pos of stockPositions) {
    skuStockMap.set(pos.sku, (skuStockMap.get(pos.sku) || 0) + pos.qtyOnHand);
  }

  // 1. Check Out of Stock and Low Stock
  for (const prod of products) {
    const currentQty = skuStockMap.get(prod.sku) || 0;
    if (currentQty === 0) {
      notifications.push({
        id: `notif-out-${prod.sku}`,
        type: 'OUT_OF_STOCK',
        title: `Stok Habis: ${prod.sku}`,
        message: `Produk '${prod.name}' memiliki saldo 0 pcs di semua gudang. Segera buat PO restock ke vendor!`,
        severity: 'CRITICAL',
        timestamp: now,
        sku: prod.sku,
        read: false,
        actionTab: 'inbound',
      });
    } else if (currentQty <= prod.minStockAlert) {
      notifications.push({
        id: `notif-low-${prod.sku}`,
        type: 'LOW_STOCK',
        title: `Peringatan Low Stock: ${prod.sku}`,
        message: `Sisa stok '${prod.name}' tersisa ${currentQty} ${prod.unit} (Batas minimum: ${prod.minStockAlert} ${prod.unit}).`,
        severity: 'WARNING',
        timestamp: now,
        sku: prod.sku,
        read: false,
        actionTab: 'inbound',
      });
    }
  }

  // 2. Check Defect Items needing follow up
  const activeDefects = defects.filter(
    (d) => d.status === 'BARU_DITEMUKAN' || d.status === 'DIKIRIM_KE_VENDOR'
  );
  for (const def of activeDefects) {
    notifications.push({
      id: `notif-def-${def.id}`,
      type: 'DEFECT_ALERT',
      title: `Tindak Lanjut Defect: ${def.defectCode}`,
      message: `Terdapat ${def.qty} pcs [${def.sku}] status '${def.status.replace(/_/g, ' ')}' dari vendor ${def.vendorName}.`,
      severity: def.repairIteration > 1 ? 'CRITICAL' : 'WARNING',
      timestamp: def.lastUpdated,
      sku: def.sku,
      read: false,
      actionTab: 'defects',
    });
  }

  // 3. Check Pre-Orders ready to ship
  const readyPreOrders = preOrders.filter((po) => po.status === 'SIAP_KIRIM');
  for (const po of readyPreOrders) {
    notifications.push({
      id: `notif-po-${po.id}`,
      type: 'PREORDER_READY',
      title: `Pre-Order Siap Kirim: #${po.orderNo}`,
      message: `Pesanan customer '${po.customerName}' untuk ${po.requestedQty} pcs [${po.sku}] telah dialokasikan penuh. Segera lakukan Stock Out!`,
      severity: 'INFO',
      timestamp: po.orderDate,
      sku: po.sku,
      read: false,
      actionTab: 'pre-order',
    });
  }

  return notifications;
}

export function filterProductsAdvanced(
  products: ProductSKU[],
  stockPositions: StockPosition[],
  filters: {
    searchQuery: string;
    warehouseId: string; // 'ALL' or specific
    stockStatus: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    category: string;    // 'ALL' or specific
  }
): ProductSKU[] {
  const { searchQuery, warehouseId, stockStatus, category } = filters;

  // SKU stock map across selected warehouse (or all)
  const skuStockMap = new Map<string, number>();
  const skuWarehousesMap = new Map<string, Set<string>>();

  for (const pos of stockPositions) {
    if (warehouseId === 'ALL' || pos.warehouseId === warehouseId) {
      skuStockMap.set(pos.sku, (skuStockMap.get(pos.sku) || 0) + pos.qtyOnHand);
    }
    if (!skuWarehousesMap.has(pos.sku)) {
      skuWarehousesMap.set(pos.sku, new Set());
    }
    skuWarehousesMap.get(pos.sku)!.add(pos.warehouseId);
  }

  return products.filter((prod) => {
    // 1. Category
    if (category !== 'ALL' && prod.category !== category) {
      return false;
    }

    // 2. Warehouse check: if specific warehouse selected, must exist in that warehouse
    if (warehouseId !== 'ALL') {
      const whSet = skuWarehousesMap.get(prod.sku);
      if (!whSet || !whSet.has(warehouseId)) {
        return false;
      }
    }

    // 3. Search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const matchSku = prod.sku.toLowerCase().includes(query);
      const matchName = prod.name.toLowerCase().includes(query);
      const matchCategory = prod.category.toLowerCase().includes(query);
      if (!matchSku && !matchName && !matchCategory) {
        return false;
      }
    }

    // 4. Stock status filter
    if (stockStatus !== 'ALL') {
      const currentQty = skuStockMap.get(prod.sku) || 0;
      if (stockStatus === 'OUT_OF_STOCK' && currentQty !== 0) {
        return false;
      }
      if (stockStatus === 'LOW_STOCK' && (currentQty === 0 || currentQty > prod.minStockAlert)) {
        return false;
      }
      if (stockStatus === 'IN_STOCK' && currentQty <= prod.minStockAlert) {
        return false;
      }
    }

    return true;
  });
}

export function filterLogsByDateRange<T extends { timestamp: string }>(
  logs: T[],
  startDate?: string,
  endDate?: string
): T[] {
  if (!startDate && !endDate) return logs;

  return logs.filter((item) => {
    const itemDate = new Date(item.timestamp).getTime();
    if (startDate) {
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      if (itemDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }
    return true;
  });
}

// Vendor Invoice Shortage & Fulfillment Calculation
export interface VendorShortageSummary {
  hasShortage: boolean;
  fulfillmentType: 'FULL' | 'PARTIAL';
  totalOrdered: number;
  totalReceived: number;
  totalShortage: number;
  shortageDetails: Array<{
    sku: string;
    productName: string;
    orderedQty: number;
    receivedQty: number;
    shortageQty: number;
  }>;
}

export function calculateVendorShortageSummary(
  items: Array<{
    sku: string;
    productName: string;
    orderedQty: number;
    receivedQty: number;
  }>
): VendorShortageSummary {
  let totalOrdered = 0;
  let totalReceived = 0;
  const shortageDetails: Array<{
    sku: string;
    productName: string;
    orderedQty: number;
    receivedQty: number;
    shortageQty: number;
  }> = [];

  for (const item of items) {
    totalOrdered += item.orderedQty;
    totalReceived += item.receivedQty;
    const shortageQty = Math.max(0, item.orderedQty - item.receivedQty);
    if (shortageQty > 0) {
      shortageDetails.push({
        sku: item.sku,
        productName: item.productName,
        orderedQty: item.orderedQty,
        receivedQty: item.receivedQty,
        shortageQty,
      });
    }
  }

  const totalShortage = Math.max(0, totalOrdered - totalReceived);
  const hasShortage = totalShortage > 0;
  const fulfillmentType: 'FULL' | 'PARTIAL' = totalShortage === 0 ? 'FULL' : 'PARTIAL';

  return {
    hasShortage,
    fulfillmentType,
    totalOrdered,
    totalReceived,
    totalShortage,
    shortageDetails,
  };
}

// Stock Opname Calculation
export function calculateOpnameItemVariance(
  systemQtySnapshot: number,
  physicalCountQty: number | null,
  unitPrice: number
): {
  varianceQty: number;
  varianceStatus: 'MATCH' | 'SURPLUS' | 'DEFICIT' | 'UNCOUNTED';
  varianceValue: number;
} {
  if (physicalCountQty === null || physicalCountQty === undefined) {
    return {
      varianceQty: 0,
      varianceStatus: 'UNCOUNTED',
      varianceValue: 0,
    };
  }

  const varianceQty = physicalCountQty - systemQtySnapshot;
  let varianceStatus: 'MATCH' | 'SURPLUS' | 'DEFICIT' | 'UNCOUNTED' = 'MATCH';
  if (varianceQty > 0) {
    varianceStatus = 'SURPLUS';
  } else if (varianceQty < 0) {
    varianceStatus = 'DEFICIT';
  }

  const varianceValue = varianceQty * unitPrice;

  return {
    varianceQty,
    varianceStatus,
    varianceValue,
  };
}

// Audio Beep for Barcode Scanning
export function playScanSound(isSuccess = true) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSuccess) {
      // High-pitched pleasant beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      // Low alert buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Ignore audio errors on unsupported browsers
  }
}


