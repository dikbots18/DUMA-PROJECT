import {
  ProductSKU,
  StockPosition,
  SupplierPartner,
  InboundLog,
  OutboundLog,
  PreOrderItem,
  DefectTrackerItem,
  Warehouse,
  BinLocation,
  ImportPreviewRow,
  BulkImportResult,
} from '../types/inventory';

/**
 * Robust CSV parser that handles:
 * - RFC 4180 standard quotes and escaped quotes ("" -> ")
 * - Comma (,) and Semicolon (;) delimiters
 * - CRLF, LF, and CR newlines
 * - Multi-line field values inside quotes
 * - Trims byte order mark (BOM \uFEFF)
 */
export function parseCSV(rawText: string): string[][] {
  if (!rawText || !rawText.trim()) return [];

  // Remove BOM if present
  let text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;

  // Auto-detect delimiter from the first non-empty line: comma or semicolon
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        insideQuote = !insideQuote;
      }
    } else if (char === delimiter && !insideQuote) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      // Handle CRLF or standalone \r / \n
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.length > 0 && currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Push final field/row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Serializes headers and rows into clean RFC-4180 CSV with UTF-8 BOM
 */
export function serializeCSV(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));

  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers browser download for a given file
 */
export function triggerFileDownload(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// -----------------------------------------------------------------------------
// TEMPLATES FOR DOWNLOAD
// -----------------------------------------------------------------------------

export const TEMPLATES = {
  PRODUCTS: {
    filename: 'Template_Import_Master_SKU_PT_Duma_Kreasi.csv',
    headers: [
      'Kode_SKU',
      'Nama_Produk',
      'Kategori',
      'Satuan',
      'Harga_Beli_HPP',
      'Harga_Jual',
      'Min_Stock_Alert',
      'Deskripsi',
      'ID_Gudang_Awal',
      'Kode_BIN_Awal',
      'Qty_Stok_Awal',
    ],
    sampleRows: [
      [
        'DKI-APP-001',
        'Kemeja Katun Signature Duma Kreasi (Navy M)',
        'Apparel & Pakaian',
        'Pcs',
        '95000',
        '195000',
        '20',
        'Bahan katun combed 30s premium warna navy',
        'WH-DKI01',
        'BIN-A1-01',
        '50',
      ],
      [
        'DKI-APP-002',
        'Polo Shirt Bordir Duma Kreasi (Putih L)',
        'Apparel & Pakaian',
        'Pcs',
        '65000',
        '145000',
        '25',
        'Polo lacoste cvc 24s dengan bordir logo resmi',
        'WH-DKI01',
        'BIN-A1-02',
        '100',
      ],
      [
        'DKI-MERCH-003',
        'Tote Bag Kanvas Duma Kreasi Eco-Series',
        'Merchandise & Promosi',
        'Pcs',
        '35000',
        '79000',
        '15',
        'Souvenir perusahaan bahan kanvas tebal 14oz',
        'WH-DKI02',
        'BIN-CBG-01',
        '30',
      ],
    ],
  },

  STOCK_INITIAL: {
    filename: 'Template_Import_Posisi_Stok_PT_Duma_Kreasi.csv',
    headers: ['Kode_SKU', 'ID_Gudang', 'Kode_BIN', 'Qty_OnHand'],
    sampleRows: [
      ['DKI-APP-001', 'WH-DKI01', 'BIN-A1-01', '50'],
      ['DKI-APP-002', 'WH-DKI01', 'BIN-A1-02', '75'],
      ['DKI-MERCH-003', 'WH-DKI02', 'BIN-CBG-01', '30'],
    ],
  },

  SUPPLIERS: {
    filename: 'Template_Import_Mitra_Supplier_PT_Duma_Kreasi.csv',
    headers: [
      'Kode_Supplier',
      'Nama_Perusahaan',
      'Kategori',
      'PIC_Kontak',
      'Nomor_Telepon',
      'Email',
      'Alamat',
      'Termin_Pembayaran',
    ],
    sampleRows: [
      [
        'VND-DKI-01',
        'PT Mitra Tekstil Kreasi Nusantara',
        'PRODUK_JADI',
        'Ahmad Kurniawan',
        '0812-7788-9900',
        'ahmad@mitrakreasi.com',
        'Kawasan Industri Cikarang Blok B No. 12',
        'NET 30 Hari',
      ],
      [
        'VND-DKI-02',
        'CV Box & Packaging Mandiri',
        'PACKAGING',
        'Dewi Anggraini',
        '0813-1122-3344',
        'order@boxpackaging.id',
        'Jl. Daan Mogot KM 14, Jakarta Barat',
        'Cash On Delivery (COD)',
      ],
    ],
  },

  INBOUND_BATCH: {
    filename: 'Template_Import_Batch_Inbound_PT_Duma_Kreasi.csv',
    headers: [
      'No_Surat_Jalan',
      'Tipe_Inbound',
      'Kode_SKU',
      'Qty_Masuk',
      'ID_Gudang_Tujuan',
      'Kode_BIN_Tujuan',
      'Asal_Vendor',
      'Petugas_PIC',
      'Catatan',
    ],
    sampleRows: [
      [
        'PO-DKI-202610-01',
        'VENDOR_PURCHASE',
        'DKI-APP-001',
        '100',
        'WH-DKI01',
        'BIN-A1-01',
        'PT Mitra Tekstil Kreasi Nusantara',
        'Staff QC Duma',
        'Penerimaan Batch 1 Produksi',
      ],
      [
        'TRF-CBG-001',
        'INTER_WAREHOUSE_IN',
        'DKI-APP-002',
        '25',
        'WH-DKI02',
        'BIN-CBG-01',
        'Gudang Utama Jakarta',
        'PIC Gudang Cabang',
        'Transfer stok kebutuhan cabang',
      ],
    ],
  },
};

// -----------------------------------------------------------------------------
// ROW PARSERS & VALIDATORS
// -----------------------------------------------------------------------------

export interface ParsedProductRow {
  product: ProductSKU;
  initialWarehouseId?: string;
  initialBinCode?: string;
  initialQty?: number;
}

export function parseAndValidateProductsCSV(
  rows: string[][],
  existingProducts: ProductSKU[],
  warehouses: Warehouse[],
  bins: BinLocation[]
): ImportPreviewRow<ParsedProductRow>[] {
  if (rows.length < 2) return [];

  // Header matching (case-insensitive & stripped of whitespace/special chars)
  const headerMap = new Map<string, number>();
  rows[0].forEach((h, idx) => {
    const key = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    headerMap.set(key, idx);
  });

  const getCol = (row: string[], ...aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = headerMap.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (idx !== undefined && row[idx] !== undefined) {
        return row[idx].trim();
      }
    }
    return '';
  };

  const results: ImportPreviewRow<ParsedProductRow>[] = [];
  const existingSkuSet = new Set(existingProducts.map((p) => p.sku.toUpperCase()));
  const batchSkuSet = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c)) continue;

    const errors: string[] = [];
    const sku = getCol(row, 'kodesku', 'sku', 'kode').toUpperCase();
    const name = getCol(row, 'namaproduk', 'namabarang', 'nama', 'name');
    const category = getCol(row, 'kategori', 'category') || 'Umum';
    const unit = getCol(row, 'satuan', 'unit') || 'Pcs';
    const buyPriceStr = getCol(row, 'hargabelihpp', 'hargabeli', 'hpp', 'buyprice');
    const sellPriceStr = getCol(row, 'hargajual', 'sellprice', 'harga');
    const minAlertStr = getCol(row, 'minstockalert', 'minalert', 'batasmin', 'min');
    const description = getCol(row, 'deskripsi', 'description', 'keterangan');

    const warehouseId = getCol(row, 'idgudangawal', 'idgudang', 'gudangawal', 'warehouseid');
    const binCode = getCol(row, 'kodebinawal', 'kodebin', 'binawal', 'bincode');
    const initialQtyStr = getCol(row, 'qtystokawal', 'stokawal', 'qtyawal', 'initialqty');

    if (!sku) errors.push('Kode SKU wajib diisi');
    if (!name) errors.push('Nama Produk wajib diisi');

    if (sku) {
      if (batchSkuSet.has(sku)) {
        errors.push(`SKU '${sku}' duplikat di dalam berkas impor yang sama`);
      }
      batchSkuSet.add(sku);
    }

    const buyPrice = buyPriceStr ? parseFloat(buyPriceStr.replace(/[^0-9.-]/g, '')) : 0;
    const sellPrice = sellPriceStr ? parseFloat(sellPriceStr.replace(/[^0-9.-]/g, '')) : 0;
    const minAlert = minAlertStr ? parseInt(minAlertStr.replace(/[^0-9-]/g, ''), 10) : 10;
    const initialQty = initialQtyStr ? parseInt(initialQtyStr.replace(/[^0-9-]/g, ''), 10) : 0;

    if (isNaN(buyPrice) || buyPrice < 0) errors.push('Harga Beli harus berupa angka positif');
    if (isNaN(sellPrice) || sellPrice < 0) errors.push('Harga Jual harus berupa angka positif');
    if (isNaN(minAlert) || minAlert < 0) errors.push('Batas Min Alert harus berupa angka non-negatif');
    if (initialQtyStr && (isNaN(initialQty) || initialQty < 0)) errors.push('Qty Stok Awal harus berupa angka non-negatif');

    if (warehouseId) {
      const whExists = warehouses.some((w) => w.id === warehouseId || w.code === warehouseId);
      if (!whExists) errors.push(`ID Gudang '${warehouseId}' tidak ditemukan di sistem`);
    }

    if (binCode && warehouseId) {
      const binExists = bins.some(
        (b) => b.code.toUpperCase() === binCode.toUpperCase() && (b.warehouseId === warehouseId || !warehouseId)
      );
      if (!binExists) errors.push(`Kode BIN '${binCode}' tidak terdaftar di gudang '${warehouseId}'`);
    }

    const parsedData: ParsedProductRow = {
      product: {
        sku: sku || `SKU-UNKNOWN-${i}`,
        name: name || 'Produk Baru',
        category,
        unit,
        buyPrice: isNaN(buyPrice) ? 0 : buyPrice,
        sellPrice: isNaN(sellPrice) ? 0 : sellPrice,
        minStockAlert: isNaN(minAlert) ? 10 : minAlert,
        description,
        createdAt: new Date().toISOString().slice(0, 10),
      },
      initialWarehouseId: warehouseId || undefined,
      initialBinCode: binCode || undefined,
      initialQty: initialQty > 0 ? initialQty : undefined,
    };

    results.push({
      rowNumber: i,
      data: parsedData,
      isValid: errors.length === 0,
      errors,
    });
  }

  return results;
}

export interface ParsedStockRow {
  sku: string;
  warehouseId: string;
  binCode: string;
  qtyOnHand: number;
}

export function parseAndValidateStockCSV(
  rows: string[][],
  existingProducts: ProductSKU[],
  warehouses: Warehouse[],
  bins: BinLocation[]
): ImportPreviewRow<ParsedStockRow>[] {
  if (rows.length < 2) return [];

  const headerMap = new Map<string, number>();
  rows[0].forEach((h, idx) => {
    headerMap.set(h.toLowerCase().replace(/[^a-z0-9]/g, ''), idx);
  });

  const getCol = (row: string[], ...aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = headerMap.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (idx !== undefined && row[idx] !== undefined) return row[idx].trim();
    }
    return '';
  };

  const results: ImportPreviewRow<ParsedStockRow>[] = [];
  const validSkuSet = new Set(existingProducts.map((p) => p.sku.toUpperCase()));

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c)) continue;

    const errors: string[] = [];
    const sku = getCol(row, 'kodesku', 'sku').toUpperCase();
    const warehouseId = getCol(row, 'idgudang', 'warehouseid', 'gudang');
    const binCode = getCol(row, 'kodebin', 'bin', 'bincode').toUpperCase();
    const qtyStr = getCol(row, 'qtyonhand', 'qty', 'stok');

    if (!sku) {
      errors.push('Kode SKU wajib diisi');
    } else if (!validSkuSet.has(sku)) {
      errors.push(`SKU '${sku}' tidak terdaftar di Master Katalog`);
    }

    if (!warehouseId) {
      errors.push('ID Gudang wajib diisi');
    } else if (!warehouses.some((w) => w.id === warehouseId || w.code === warehouseId)) {
      errors.push(`Gudang '${warehouseId}' tidak terdaftar`);
    }

    if (!binCode) {
      errors.push('Kode BIN wajib diisi');
    }

    const qty = parseInt(qtyStr.replace(/[^0-9-]/g, ''), 10);
    if (isNaN(qty) || qty < 0) {
      errors.push('Qty On-Hand harus angka bulat non-negatif');
    }

    results.push({
      rowNumber: i,
      data: {
        sku,
        warehouseId,
        binCode,
        qtyOnHand: isNaN(qty) ? 0 : qty,
      },
      isValid: errors.length === 0,
      errors,
    });
  }

  return results;
}

export function parseAndValidateSuppliersCSV(
  rows: string[][],
  existingSuppliers: SupplierPartner[]
): ImportPreviewRow<SupplierPartner>[] {
  if (rows.length < 2) return [];

  const headerMap = new Map<string, number>();
  rows[0].forEach((h, idx) => {
    headerMap.set(h.toLowerCase().replace(/[^a-z0-9]/g, ''), idx);
  });

  const getCol = (row: string[], ...aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = headerMap.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (idx !== undefined && row[idx] !== undefined) return row[idx].trim();
    }
    return '';
  };

  const results: ImportPreviewRow<SupplierPartner>[] = [];
  const existingCodes = new Set(existingSuppliers.map((s) => s.code.toUpperCase()));
  const batchCodes = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c)) continue;

    const errors: string[] = [];
    const code = getCol(row, 'kodesupplier', 'kode', 'code', 'vendorcode').toUpperCase();
    const name = getCol(row, 'namaperusahaan', 'nama', 'namasupplier', 'name');
    const categoryRaw = getCol(row, 'kategori', 'category').toUpperCase();
    const picName = getCol(row, 'pickontak', 'pic', 'picname') || 'Admin Supplier';
    const phone = getCol(row, 'nomortelepon', 'telepon', 'phone', 'hp') || '-';
    const email = getCol(row, 'email', 'surel') || '-';
    const address = getCol(row, 'alamat', 'address') || '-';
    const paymentTerms = getCol(row, 'terminpembayaran', 'termin', 'paymentterms') || 'NET 30 Hari';

    if (!code) errors.push('Kode Supplier wajib diisi');
    if (!name) errors.push('Nama Perusahaan Supplier wajib diisi');

    if (code) {
      if (batchCodes.has(code)) errors.push(`Kode Supplier '${code}' duplikat dalam file impor`);
      batchCodes.add(code);
    }

    let category: 'BAHAN_BAKU' | 'PRODUK_JADI' | 'PACKAGING' | 'EKSPEDISI' = 'PRODUK_JADI';
    if (categoryRaw.includes('BAHAN')) category = 'BAHAN_BAKU';
    else if (categoryRaw.includes('PACK') || categoryRaw.includes('KEMASAN')) category = 'PACKAGING';
    else if (categoryRaw.includes('EKSPEDISI') || categoryRaw.includes('KURIR') || categoryRaw.includes('LOGISTIK'))
      category = 'EKSPEDISI';

    results.push({
      rowNumber: i,
      data: {
        id: `SUP-${Date.now()}-${i}`,
        code: code || `VND-${i}`,
        name: name || 'Supplier Baru',
        category,
        picName,
        phone,
        email,
        address,
        paymentTerms,
        rating: 5,
        notes: 'Diimpor via Bulk Import',
      },
      isValid: errors.length === 0,
      errors,
    });
  }

  return results;
}

// -----------------------------------------------------------------------------
// EXPORT GENERATORS
// -----------------------------------------------------------------------------

export function exportProductsCSV(products: ProductSKU[], stockPositions: StockPosition[]): string {
  const stockMap = new Map<string, number>();
  stockPositions.forEach((sp) => {
    stockMap.set(sp.sku, (stockMap.get(sp.sku) || 0) + sp.qtyOnHand);
  });

  const headers = [
    'Kode_SKU',
    'Nama_Produk',
    'Kategori',
    'Satuan',
    'Harga_Beli_HPP',
    'Harga_Jual',
    'Total_Stok_OnHand',
    'Min_Stock_Alert',
    'Status_Stok',
    'Deskripsi',
    'Tanggal_Dibuat',
  ];

  const rows = products.map((p) => {
    const stock = stockMap.get(p.sku) || 0;
    const status = stock === 0 ? 'Out of Stock' : stock <= p.minStockAlert ? 'Low Stock' : 'In Stock';
    return [
      p.sku,
      p.name,
      p.category,
      p.unit,
      p.buyPrice,
      p.sellPrice,
      stock,
      p.minStockAlert,
      status,
      p.description || '',
      p.createdAt,
    ];
  });

  return serializeCSV(headers, rows);
}

export function exportStockPositionsCSV(
  stockPositions: StockPosition[],
  products: ProductSKU[],
  warehouses: Warehouse[]
): string {
  const prodMap = new Map(products.map((p) => [p.sku, p.name]));
  const whMap = new Map(warehouses.map((w) => [w.id, w.name]));

  const headers = [
    'Kode_SKU',
    'Nama_Produk',
    'ID_Gudang',
    'Nama_Gudang',
    'Kode_BIN',
    'Stok_OnHand',
    'Stok_Reserved_PO',
    'Stok_Defect',
    'Stok_Available',
    'Terakhir_Update',
  ];

  const rows = stockPositions.map((sp) => [
    sp.sku,
    prodMap.get(sp.sku) || 'Unknown SKU',
    sp.warehouseId,
    whMap.get(sp.warehouseId) || sp.warehouseId,
    sp.binCode,
    sp.qtyOnHand,
    sp.qtyReserved,
    sp.qtyDefect,
    Math.max(0, sp.qtyOnHand - sp.qtyReserved),
    sp.lastUpdated,
  ]);

  return serializeCSV(headers, rows);
}

export function exportInboundLogsCSV(inbounds: InboundLog[]): string {
  const headers = [
    'Waktu_Penerimaan',
    'No_Surat_Jalan_Faktur',
    'Jenis_Inbound',
    'Kode_SKU',
    'Nama_Produk',
    'Qty_Masuk',
    'Gudang_Tujuan',
    'BIN_Tujuan',
    'Asal_Pengirim_Vendor',
    'Petugas_PIC',
    'Catatan',
  ];

  const rows = inbounds.map((i) => [
    i.timestamp,
    i.invoiceNo,
    i.type,
    i.sku,
    i.productName,
    i.qty,
    i.targetWarehouseId,
    i.targetBinCode,
    i.sourceOrVendor,
    i.pic,
    i.notes || '',
  ]);

  return serializeCSV(headers, rows);
}

export function exportOutboundLogsCSV(outbounds: OutboundLog[]): string {
  const headers = [
    'Waktu_Pengeluaran',
    'No_Transaksi_Kirim',
    'Jenis_Outbound',
    'Kode_SKU',
    'Nama_Produk',
    'Qty_Keluar',
    'Gudang_Asal',
    'BIN_Asal',
    'Tujuan_Penerima',
    'Petugas_PIC',
    'Catatan',
  ];

  const rows = outbounds.map((o) => [
    o.timestamp,
    o.transactionNo,
    o.type,
    o.sku,
    o.productName,
    o.qty,
    o.sourceWarehouseId,
    o.sourceBinCode,
    o.destinationOrCustomer,
    o.pic,
    o.notes || '',
  ]);

  return serializeCSV(headers, rows);
}

export function exportSuppliersCSV(suppliers: SupplierPartner[]): string {
  const headers = [
    'Kode_Supplier',
    'Nama_Perusahaan',
    'Kategori',
    'PIC_Kontak',
    'Nomor_Telepon',
    'Email',
    'Alamat',
    'Termin_Pembayaran',
    'Rating',
    'Catatan',
  ];

  const rows = suppliers.map((s) => [
    s.code,
    s.name,
    s.category,
    s.picName,
    s.phone,
    s.email,
    s.address,
    s.paymentTerms,
    s.rating,
    s.notes || '',
  ]);

  return serializeCSV(headers, rows);
}

export function exportPreOrdersCSV(preOrders: PreOrderItem[]): string {
  const headers = [
    'No_PO',
    'Customer_Pembeli',
    'Sales_Channel',
    'Kode_SKU',
    'Nama_Produk',
    'Qty_Dipesan',
    'Target_Ready_Date',
    'Gudang_Alokasi',
    'Status_Fulfillment',
    'Tanggal_Dibuat',
  ];

  const rows = preOrders.map((po) => [
    po.poNumber,
    po.customerName,
    po.salesChannel,
    po.sku,
    po.productName,
    po.qtyOrdered,
    po.targetReadyDate,
    po.allocatedWarehouseId || 'Semua Gudang',
    po.status,
    po.createdAt,
  ]);

  return serializeCSV(headers, rows);
}

export function exportDefectsCSV(defects: DefectTrackerItem[]): string {
  const headers = [
    'No_Tiket_QC',
    'Kode_SKU',
    'Nama_Produk',
    'Qty_Defect',
    'ID_Gudang',
    'Sumber_Deteksi',
    'Nama_Vendor',
    'Tipe_Defect',
    'Siklus_Perbaikan_Ke',
    'Status_QC',
    'Tanggal_Ditemukan',
    'Terakhir_Update',
  ];

  const rows = defects.map((d) => [
    d.ticketNo,
    d.sku,
    d.productName,
    d.qty,
    d.warehouseId,
    d.detectedFrom,
    d.vendorName,
    d.defectType,
    d.repairIteration,
    d.status,
    d.dateReported,
    d.lastUpdated,
  ]);

  return serializeCSV(headers, rows);
}
