import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStockSummary,
  calculateSkuMutationLedger,
  validateStockAvailability,
  advanceDefectStatus,
  allocatePreOrdersOnInbound,
  generateNotifications,
  filterProductsAdvanced,
  filterLogsByDateRange,
  calculateVendorShortageSummary,
  calculateOpnameItemVariance,
} from './inventoryCalculations';
import {
  ProductSKU,
  StockPosition,
  InboundLog,
  OutboundLog,
  DefectTrackerItem,
  PreOrderItem,
} from '../types/inventory';

test('calculateStockSummary aggregates stock, valuation and alerts correctly', () => {
  const products: ProductSKU[] = [
    {
      sku: 'SKU-001',
      name: 'Kaos Polos Cotton 30s',
      category: 'Apparel',
      unit: 'Pcs',
      buyPrice: 35000,
      sellPrice: 75000,
      minStockAlert: 20,
      createdAt: '2026-01-01',
    },
    {
      sku: 'SKU-002',
      name: 'Kemeja Flannel Tartan',
      category: 'Apparel',
      unit: 'Pcs',
      buyPrice: 90000,
      sellPrice: 180000,
      minStockAlert: 15,
      createdAt: '2026-01-01',
    },
  ];

  const stockPositions: StockPosition[] = [
    {
      id: 'sp-1',
      sku: 'SKU-001',
      warehouseId: 'WH-01',
      binCode: 'BIN-A1',
      qtyOnHand: 15, // Below minStockAlert (20) -> should trigger low stock
      qtyReserved: 0,
      qtyDefect: 0,
      lastUpdated: '2026-10-01',
    },
    {
      id: 'sp-2',
      sku: 'SKU-002',
      warehouseId: 'WH-01',
      binCode: 'BIN-B1',
      qtyOnHand: 50,
      qtyReserved: 5,
      qtyDefect: 2,
      lastUpdated: '2026-10-01',
    },
  ];

  const inbounds: InboundLog[] = [
    {
      id: 'in-1',
      invoiceNo: 'INV-01',
      type: 'VENDOR_PURCHASE',
      sku: 'SKU-001',
      productName: 'Kaos Polos Cotton 30s',
      qty: 100,
      targetWarehouseId: 'WH-01',
      targetBinCode: 'BIN-A1',
      sourceOrVendor: 'PT Tekstil',
      pic: 'Budi',
      timestamp: '2026-10-01',
    },
  ];

  const outbounds: OutboundLog[] = [
    {
      id: 'out-1',
      transactionNo: 'TRX-01',
      type: 'DAILY_SALES',
      sku: 'SKU-001',
      productName: 'Kaos Polos Cotton 30s',
      qty: 30,
      sourceWarehouseId: 'WH-01',
      sourceBinCode: 'BIN-A1',
      destinationOrCustomer: 'Shopee Order',
      pic: 'Siti',
      timestamp: '2026-10-02',
    },
  ];

  const defects: DefectTrackerItem[] = [
    {
      id: 'def-1',
      defectCode: 'DEF-001',
      sku: 'SKU-002',
      productName: 'Kemeja Flannel Tartan',
      qty: 3,
      warehouseId: 'WH-01',
      detectedFrom: 'INBOUND_QC',
      vendorId: 'VND-01',
      vendorName: 'CV Konveksi',
      defectType: 'JAHITAN_RUSAK',
      repairIteration: 1,
      status: 'DIKIRIM_KE_VENDOR',
      history: [],
      dateReported: '2026-10-01',
      lastUpdated: '2026-10-01',
    },
  ];

  const preOrders: PreOrderItem[] = [
    {
      id: 'po-1',
      orderNo: 'PO-001',
      channel: 'Tokopedia',
      customerName: 'Ahmad',
      customerPhone: '0812345678',
      sku: 'SKU-001',
      productName: 'Kaos Polos Cotton 30s',
      requestedQty: 10,
      allocatedQty: 2,
      status: 'MENUNGGU_BARANG',
      orderDate: '2026-10-01',
      etaDate: '2026-11-01',
    },
  ];

  const summary = calculateStockSummary(
    products,
    stockPositions,
    inbounds,
    outbounds,
    defects,
    preOrders
  );

  assert.equal(summary.totalStockOnHand, 65);
  assert.equal(summary.totalUniqueSKUs, 2);
  assert.equal(summary.totalIncomingMonth, 100);
  assert.equal(summary.totalOutgoingMonth, 30);
  assert.equal(summary.lowStockItemsCount, 1); // SKU-001 has 15 <= 20
  assert.equal(summary.totalDefectCount, 3);
  assert.equal(summary.totalPendingPOCount, 8); // 10 - 2 = 8
  assert.equal(summary.totalEstimatedStockValue, 15 * 35000 + 50 * 90000);
});

test('calculateSkuMutationLedger builds chronological running balances correctly', () => {
  const stockPositions: StockPosition[] = [
    {
      id: 'sp-1',
      sku: 'SKU-TEST',
      warehouseId: 'WH-01',
      binCode: 'A1',
      qtyOnHand: 120,
      qtyReserved: 0,
      qtyDefect: 0,
      lastUpdated: '2026-10-05',
    },
  ];

  const inbounds: InboundLog[] = [
    {
      id: 'in-1',
      invoiceNo: 'SJ-001',
      type: 'VENDOR_PURCHASE',
      sku: 'SKU-TEST',
      productName: 'Barang Uji',
      qty: 100,
      targetWarehouseId: 'WH-01',
      targetBinCode: 'A1',
      sourceOrVendor: 'Vendor Alpha',
      pic: 'Rian',
      timestamp: '2026-10-01T10:00:00Z',
    },
    {
      id: 'in-2',
      invoiceNo: 'SJ-002',
      type: 'CUSTOMER_RETURN',
      sku: 'SKU-TEST',
      productName: 'Barang Uji',
      qty: 5,
      targetWarehouseId: 'WH-01',
      targetBinCode: 'A1',
      sourceOrVendor: 'Customer Retur',
      pic: 'Rian',
      timestamp: '2026-10-03T10:00:00Z',
    },
  ];

  const outbounds: OutboundLog[] = [
    {
      id: 'out-1',
      transactionNo: 'SO-001',
      type: 'DAILY_SALES',
      sku: 'SKU-TEST',
      productName: 'Barang Uji',
      qty: 25,
      sourceWarehouseId: 'WH-01',
      sourceBinCode: 'A1',
      destinationOrCustomer: 'Toko Cabang',
      pic: 'Dewi',
      timestamp: '2026-10-02T14:00:00Z',
    },
  ];

  const mutation = calculateSkuMutationLedger('SKU-TEST', stockPositions, inbounds, outbounds);

  assert.equal(mutation.currentStock, 120);
  assert.equal(mutation.totalIn, 105);
  assert.equal(mutation.totalOut, 25);
  assert.equal(mutation.records.length, 3);

  // Check chronological order
  assert.equal(mutation.records[0].subType, 'VENDOR_PURCHASE');
  assert.equal(mutation.records[1].subType, 'DAILY_SALES');
  assert.equal(mutation.records[2].subType, 'CUSTOMER_RETURN');

  // Check final running balance equals currentStock
  const lastRecord = mutation.records[mutation.records.length - 1];
  assert.equal(lastRecord.runningBalance, 120);
});

test('validateStockAvailability checks stock limits correctly', () => {
  const stockPositions: StockPosition[] = [
    {
      id: 'sp-1',
      sku: 'SKU-A',
      warehouseId: 'WH-01',
      binCode: 'BIN-01',
      qtyOnHand: 50,
      qtyReserved: 10, // Available = 40
      qtyDefect: 0,
      lastUpdated: '2026-10-01',
    },
  ];

  // Request 30 (valid <= 40)
  const validCheck = validateStockAvailability(stockPositions, 'SKU-A', 'WH-01', 'BIN-01', 30);
  assert.equal(validCheck.isValid, true);
  assert.equal(validCheck.availableQty, 40);

  // Request 45 (invalid > 40)
  const invalidCheck = validateStockAvailability(stockPositions, 'SKU-A', 'WH-01', 'BIN-01', 45);
  assert.equal(invalidCheck.isValid, false);
  assert.ok(invalidCheck.errorMessage?.includes('Stok tidak mencukupi'));

  // Request negative or zero
  const zeroCheck = validateStockAvailability(stockPositions, 'SKU-A', 'WH-01', 'BIN-01', 0);
  assert.equal(zeroCheck.isValid, false);

  // Missing location
  const missingCheck = validateStockAvailability(stockPositions, 'SKU-A', 'WH-99', 'BIN-01', 10);
  assert.equal(missingCheck.isValid, false);
});

test('advanceDefectStatus increments repair iteration and updates history', () => {
  const item: DefectTrackerItem = {
    id: 'def-1',
    defectCode: 'DEF-2026-001',
    sku: 'SKU-A',
    productName: 'Sepatu Boots Leather',
    qty: 5,
    warehouseId: 'WH-01',
    detectedFrom: 'INBOUND_QC',
    vendorId: 'VND-01',
    vendorName: 'Pabrik Kulit Garut',
    defectType: 'SOBEK_CACAT_KAIN',
    repairIteration: 1,
    status: 'PROSES_INVESTIGASI',
    history: [
      {
        date: '2026-10-01',
        action: 'Defect dicatat',
        repairIteration: 1,
        note: 'Ditemukan sol lepas',
        pic: 'QC Hadi',
      },
    ],
    dateReported: '2026-10-01',
    lastUpdated: '2026-10-01',
  };

  // Dispatch to vendor for repair: iteration should increment from 1 to 2
  const updated = advanceDefectStatus(
    item,
    'DIKIRIM_KE_VENDOR',
    'Kirim Ulang ke Vendor untuk Lem Ulang',
    'Surat Jalan Retur #SJ-VND-44',
    'Supervisor Doni'
  );

  assert.equal(updated.status, 'DIKIRIM_KE_VENDOR');
  assert.equal(updated.repairIteration, 2);
  assert.equal(updated.history.length, 2);
  assert.equal(updated.history[0].repairIteration, 2);
  assert.equal(updated.history[0].pic, 'Supervisor Doni');
});

test('allocatePreOrdersOnInbound fulfills pending pre-orders FIFO', () => {
  const preOrders: PreOrderItem[] = [
    {
      id: 'po-1',
      orderNo: 'ORD-001',
      channel: 'Shopee',
      customerName: 'Anisa',
      customerPhone: '0811111111',
      sku: 'SKU-HOODIE',
      productName: 'Hoodie Cotton Boxy',
      requestedQty: 10,
      allocatedQty: 0,
      status: 'MENUNGGU_BARANG',
      orderDate: '2026-10-01',
      etaDate: '2026-10-20',
    },
    {
      id: 'po-2',
      orderNo: 'ORD-002',
      channel: 'TikTok Shop',
      customerName: 'Bambang',
      customerPhone: '0822222222',
      sku: 'SKU-HOODIE',
      productName: 'Hoodie Cotton Boxy',
      requestedQty: 15,
      allocatedQty: 0,
      status: 'MENUNGGU_BARANG',
      orderDate: '2026-10-02',
      etaDate: '2026-10-25',
    },
  ];

  // Incoming 18 items:
  // Should completely allocate po-1 (10 items, status -> SIAP_KIRIM)
  // Should partially allocate po-2 (8 items, remaining needed = 7, status remains MENUNGGU_BARANG)
  // Remaining inbound = 0
  const result = allocatePreOrdersOnInbound(preOrders, 'SKU-HOODIE', 18);

  assert.equal(result.allocatedTotal, 18);
  assert.equal(result.remainingInboundStock, 0);

  const updated1 = result.updatedPreOrders.find((p) => p.id === 'po-1')!;
  assert.equal(updated1.allocatedQty, 10);
  assert.equal(updated1.status, 'SIAP_KIRIM');

  const updated2 = result.updatedPreOrders.find((p) => p.id === 'po-2')!;
  assert.equal(updated2.allocatedQty, 8);
  assert.equal(updated2.status, 'MENUNGGU_BARANG');
});

test('generateNotifications catches OUT_OF_STOCK and LOW_STOCK correctly', () => {
  const products: ProductSKU[] = [
    { sku: 'SKU-ZERO', name: 'Barang Habis', category: 'A', unit: 'Pcs', buyPrice: 10, sellPrice: 20, minStockAlert: 10, createdAt: '' },
    { sku: 'SKU-LOW', name: 'Barang Menipis', category: 'A', unit: 'Pcs', buyPrice: 10, sellPrice: 20, minStockAlert: 15, createdAt: '' },
    { sku: 'SKU-OK', name: 'Barang Aman', category: 'A', unit: 'Pcs', buyPrice: 10, sellPrice: 20, minStockAlert: 5, createdAt: '' },
  ];

  const stockPositions: StockPosition[] = [
    { id: '1', sku: 'SKU-ZERO', warehouseId: 'WH-1', binCode: 'A1', qtyOnHand: 0, qtyReserved: 0, qtyDefect: 0, lastUpdated: '' },
    { id: '2', sku: 'SKU-LOW', warehouseId: 'WH-1', binCode: 'A1', qtyOnHand: 8, qtyReserved: 0, qtyDefect: 0, lastUpdated: '' },
    { id: '3', sku: 'SKU-OK', warehouseId: 'WH-1', binCode: 'A1', qtyOnHand: 50, qtyReserved: 0, qtyDefect: 0, lastUpdated: '' },
  ];

  const notifs = generateNotifications(products, stockPositions, [], []);
  assert.equal(notifs.some(n => n.type === 'OUT_OF_STOCK' && n.sku === 'SKU-ZERO'), true);
  assert.equal(notifs.some(n => n.type === 'LOW_STOCK' && n.sku === 'SKU-LOW'), true);
  assert.equal(notifs.some(n => n.sku === 'SKU-OK'), false);
});

test('filterProductsAdvanced filters correctly by warehouse and stock status', () => {
  const products: ProductSKU[] = [
    { sku: 'SKU-1', name: 'Kaos Hitam', category: 'Kaos', unit: 'Pcs', buyPrice: 10, sellPrice: 20, minStockAlert: 10, createdAt: '' },
    { sku: 'SKU-2', name: 'Kemeja Putih', category: 'Kemeja', unit: 'Pcs', buyPrice: 10, sellPrice: 20, minStockAlert: 10, createdAt: '' },
    { sku: 'SKU-3', name: 'Celana Chino', category: 'Celana', unit: 'Pcs', buyPrice: 10, sellPrice: 20, minStockAlert: 10, createdAt: '' },
  ];

  const stockPositions: StockPosition[] = [
    { id: '1', sku: 'SKU-1', warehouseId: 'WH-JKT', binCode: 'A1', qtyOnHand: 50, qtyReserved: 0, qtyDefect: 0, lastUpdated: '' }, // IN_STOCK
    { id: '2', sku: 'SKU-2', warehouseId: 'WH-JKT', binCode: 'A2', qtyOnHand: 5, qtyReserved: 0, qtyDefect: 0, lastUpdated: '' },  // LOW_STOCK
    { id: '3', sku: 'SKU-3', warehouseId: 'WH-SBY', binCode: 'B1', qtyOnHand: 0, qtyReserved: 0, qtyDefect: 0, lastUpdated: '' },  // OUT_OF_STOCK
  ];

  // Test warehouse filter
  const jktOnly = filterProductsAdvanced(products, stockPositions, {
    searchQuery: '',
    warehouseId: 'WH-JKT',
    stockStatus: 'ALL',
    category: 'ALL',
  });
  assert.equal(jktOnly.length, 2);
  assert.equal(jktOnly.some(p => p.sku === 'SKU-3'), false);

  // Test low stock status filter
  const lowOnly = filterProductsAdvanced(products, stockPositions, {
    searchQuery: '',
    warehouseId: 'ALL',
    stockStatus: 'LOW_STOCK',
    category: 'ALL',
  });
  assert.equal(lowOnly.length, 1);
  assert.equal(lowOnly[0].sku, 'SKU-2');
});

test('filterLogsByDateRange filters accurately between bounds', () => {
  const logs = [
    { id: '1', timestamp: '2026-10-01T10:00:00Z', val: 'old' },
    { id: '2', timestamp: '2026-10-15T10:00:00Z', val: 'mid' },
    { id: '3', timestamp: '2026-10-28T10:00:00Z', val: 'new' },
  ];

  const filtered = filterLogsByDateRange(logs, '2026-10-10', '2026-10-20');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '2');
});

test('calculateVendorShortageSummary correctly detects partial fulfillment and item shortage details', () => {
  const items = [
    { sku: 'DKI-01', productName: 'T-Shirt Black', orderedQty: 100, receivedQty: 60 },
    { sku: 'DKI-02', productName: 'Hoodie Grey', orderedQty: 50, receivedQty: 50 },
  ];

  const summary = calculateVendorShortageSummary(items);
  assert.equal(summary.hasShortage, true);
  assert.equal(summary.fulfillmentType, 'PARTIAL');
  assert.equal(summary.totalOrdered, 150);
  assert.equal(summary.totalReceived, 110);
  assert.equal(summary.totalShortage, 40);
  assert.equal(summary.shortageDetails.length, 1);
  assert.equal(summary.shortageDetails[0].sku, 'DKI-01');
  assert.equal(summary.shortageDetails[0].shortageQty, 40);

  // Test full fulfillment
  const fulfilledItems = [
    { sku: 'DKI-01', productName: 'T-Shirt Black', orderedQty: 100, receivedQty: 100 },
    { sku: 'DKI-02', productName: 'Hoodie Grey', orderedQty: 50, receivedQty: 50 },
  ];
  const fulfilledSummary = calculateVendorShortageSummary(fulfilledItems);
  assert.equal(fulfilledSummary.hasShortage, false);
  assert.equal(fulfilledSummary.fulfillmentType, 'FULL');
  assert.equal(fulfilledSummary.totalShortage, 0);
  assert.equal(fulfilledSummary.shortageDetails.length, 0);
});

test('calculateOpnameItemVariance accurately identifies match, surplus, deficit and uncounted', () => {
  // Match
  const match = calculateOpnameItemVariance(50, 50, 100000);
  assert.equal(match.varianceQty, 0);
  assert.equal(match.varianceStatus, 'MATCH');
  assert.equal(match.varianceValue, 0);

  // Surplus
  const surplus = calculateOpnameItemVariance(50, 65, 100000);
  assert.equal(surplus.varianceQty, 15);
  assert.equal(surplus.varianceStatus, 'SURPLUS');
  assert.equal(surplus.varianceValue, 1500000);

  // Deficit
  const deficit = calculateOpnameItemVariance(50, 42, 100000);
  assert.equal(deficit.varianceQty, -8);
  assert.equal(deficit.varianceStatus, 'DEFICIT');
  assert.equal(deficit.varianceValue, -800000);

  // Uncounted
  const uncounted = calculateOpnameItemVariance(50, null, 100000);
  assert.equal(uncounted.varianceStatus, 'UNCOUNTED');
  assert.equal(uncounted.varianceQty, 0);
});


