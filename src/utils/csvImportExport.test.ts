import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCSV,
  serializeCSV,
  parseAndValidateProductsCSV,
  parseAndValidateStockCSV,
  exportProductsCSV,
} from './csvImportExport';
import { ProductSKU, Warehouse, BinLocation, StockPosition } from '../types/inventory';

test('parseCSV parses standard comma-separated text', () => {
  const csv = 'SKU,Name,Price\nDKI-001,Kemeja Putih,100000\nDKI-002,Celana Chino,150000';
  const rows = parseCSV(csv);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['SKU', 'Name', 'Price']);
  assert.deepEqual(rows[1], ['DKI-001', 'Kemeja Putih', '100000']);
  assert.deepEqual(rows[2], ['DKI-002', 'Celana Chino', '150000']);
});

test('parseCSV handles quotes, escaped quotes, and semicolons', () => {
  const csvWithQuotes = 'SKU;Description;Qty\r\n"DKI-001";"Kemeja ""Premium"" Combed";"25"';
  const rows = parseCSV(csvWithQuotes);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'DKI-001');
  assert.equal(rows[1][1], 'Kemeja "Premium" Combed');
  assert.equal(rows[1][2], '25');
});

test('serializeCSV produces valid RFC-4180 CSV with BOM', () => {
  const headers = ['Kode', 'Deskripsi', 'Harga'];
  const rows = [
    ['DKI-01', 'Kemeja, Warna "Navy"', 95000],
    ['DKI-02', 'Kaos Polos', 45000],
  ];
  const output = serializeCSV(headers, rows);
  assert.ok(output.startsWith('\uFEFF'));
  assert.ok(output.includes('"Kemeja, Warna ""Navy"""'));
});

test('parseAndValidateProductsCSV validates required fields and detects duplicate SKUs', () => {
  const warehouses: Warehouse[] = [
    {
      id: 'WH-DKI01',
      code: 'DKI-01',
      name: 'Gudang Utama DKI',
      pic: 'Staff',
      phone: '0812',
      address: 'Jakarta',
      capacityMax: 10000,
    },
  ];
  const bins: BinLocation[] = [
    { id: 'b1', warehouseId: 'WH-DKI01', code: 'BIN-A1-01', zone: 'A', rack: '1', tier: '1', maxCapacity: 500 },
  ];
  const existingProducts: ProductSKU[] = [
    {
      sku: 'EXISTING-01',
      name: 'Produk Lama',
      category: 'Apparel',
      unit: 'Pcs',
      buyPrice: 50000,
      sellPrice: 100000,
      minStockAlert: 10,
      createdAt: '2026-10-01',
    },
  ];

  const rawRows = [
    ['Kode_SKU', 'Nama_Produk', 'Kategori', 'Satuan', 'Harga_Beli_HPP', 'Harga_Jual', 'Min_Stock_Alert'],
    ['DKI-APP-001', 'Kemeja Katun Baru', 'Pakaian', 'Pcs', '80000', '150000', '15'],
    ['', 'Tanpa SKU', 'Pakaian', 'Pcs', '50000', '90000', '10'], // Missing SKU
    ['DKI-APP-001', 'Duplikat SKU', 'Pakaian', 'Pcs', '80000', '150000', '15'], // Duplicate SKU
    ['DKI-APP-002', 'Harga Negatif', 'Pakaian', 'Pcs', '-1000', '50000', '10'], // Negative price
  ];

  const results = parseAndValidateProductsCSV(rawRows, existingProducts, warehouses, bins);
  assert.equal(results.length, 4);

  // Row 1 should be valid
  assert.equal(results[0].isValid, true);
  assert.equal(results[0].data.product.sku, 'DKI-APP-001');

  // Row 2 missing SKU
  assert.equal(results[1].isValid, false);
  assert.ok(results[1].errors.some((e) => e.includes('SKU wajib diisi')));

  // Row 3 duplicate SKU
  assert.equal(results[2].isValid, false);
  assert.ok(results[2].errors.some((e) => e.includes('duplikat')));

  // Row 4 negative price
  assert.equal(results[3].isValid, false);
  assert.ok(results[3].errors.some((e) => e.includes('Harga Beli harus berupa angka')));
});

test('parseAndValidateStockCSV flags unregistered SKUs and non-existent warehouses', () => {
  const existingProducts: ProductSKU[] = [
    {
      sku: 'DKI-APP-001',
      name: 'Kemeja Katun',
      category: 'Apparel',
      unit: 'Pcs',
      buyPrice: 50000,
      sellPrice: 100000,
      minStockAlert: 10,
      createdAt: '2026-10-01',
    },
  ];
  const warehouses: Warehouse[] = [
    {
      id: 'WH-DKI01',
      code: 'DKI-01',
      name: 'Gudang Utama',
      pic: 'Staff',
      phone: '0812',
      address: 'Jakarta',
      capacityMax: 5000,
    },
  ];
  const bins: BinLocation[] = [];

  const rawRows = [
    ['Kode_SKU', 'ID_Gudang', 'Kode_BIN', 'Qty_OnHand'],
    ['DKI-APP-001', 'WH-DKI01', 'BIN-A1-01', '40'], // Valid
    ['UNKNOWN-SKU', 'WH-DKI01', 'BIN-A1-01', '20'], // Unknown SKU
    ['DKI-APP-001', 'WH-NONEXISTENT', 'BIN-A1-01', '10'], // Unknown Warehouse
  ];

  const results = parseAndValidateStockCSV(rawRows, existingProducts, warehouses, bins);
  assert.equal(results.length, 3);
  assert.equal(results[0].isValid, true);
  assert.equal(results[1].isValid, false);
  assert.ok(results[1].errors.some((e) => e.includes('tidak terdaftar di Master Katalog')));
  assert.equal(results[2].isValid, false);
  assert.ok(results[2].errors.some((e) => e.includes('tidak terdaftar')));
});

test('exportProductsCSV computes stock and statuses accurately', () => {
  const products: ProductSKU[] = [
    {
      sku: 'DKI-APP-001',
      name: 'Kemeja',
      category: 'Apparel',
      unit: 'Pcs',
      buyPrice: 50000,
      sellPrice: 100000,
      minStockAlert: 20,
      createdAt: '2026-10-01',
    },
    {
      sku: 'DKI-APP-002',
      name: 'Kaos',
      category: 'Apparel',
      unit: 'Pcs',
      buyPrice: 30000,
      sellPrice: 70000,
      minStockAlert: 15,
      createdAt: '2026-10-01',
    },
  ];
  const stockPositions: StockPosition[] = [
    { id: '1', sku: 'DKI-APP-001', warehouseId: 'WH-1', binCode: 'B1', qtyOnHand: 15, qtyReserved: 0, qtyDefect: 0, lastUpdated: '2026-10-01' },
    // DKI-APP-002 has 0 stock positions -> 0 on hand
  ];

  const csv = exportProductsCSV(products, stockPositions);
  assert.ok(csv.includes('DKI-APP-001'));
  assert.ok(csv.includes('Low Stock')); // 15 <= 20
  assert.ok(csv.includes('DKI-APP-002'));
  assert.ok(csv.includes('Out of Stock')); // 0
});
