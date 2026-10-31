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
} from '../types/inventory';

// Default clean initial state for PT Duma Kreasi Indonesia
// Seluruh data barang, stock, log, dan PO dikosongkan sesuai instruksi user!
export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'WH-DKI01',
    code: 'DKI-01',
    name: 'Gudang Utama PT Duma Kreasi Indonesia (Jakarta)',
    pic: 'Staff Inventaris Duma Kreasi',
    phone: '0812-0000-1111',
    address: 'Kawasan Pergudangan & Industri PT Duma Kreasi Indonesia, Jakarta',
    capacityMax: 50000,
    notes: 'Hub logistik utama penerimaan dan pengiriman',
  },
  {
    id: 'WH-DKI02',
    code: 'DKI-02',
    name: 'Gudang Cabang Distribusi Regional',
    pic: 'PIC Gudang Cabang',
    phone: '0813-0000-2222',
    address: 'Hub Distribusi Regional PT Duma Kreasi Indonesia',
    capacityMax: 25000,
    notes: 'Fulfillment pesanan wilayah',
  },
];

export const INITIAL_BINS: BinLocation[] = [
  // BIN Rak Standar Gudang Utama
  { id: 'bin-1', warehouseId: 'WH-DKI01', code: 'BIN-A1-01', zone: 'Zona A (Fast Moving)', rack: 'Rak 1', tier: 'Tingkat 1', maxCapacity: 1000 },
  { id: 'bin-2', warehouseId: 'WH-DKI01', code: 'BIN-A1-02', zone: 'Zona A (Fast Moving)', rack: 'Rak 1', tier: 'Tingkat 2', maxCapacity: 1000 },
  { id: 'bin-3', warehouseId: 'WH-DKI01', code: 'BIN-B1-01', zone: 'Zona B (Medium Moving)', rack: 'Rak 1', tier: 'Tingkat 1', maxCapacity: 800 },
  { id: 'bin-4', warehouseId: 'WH-DKI01', code: 'BIN-B1-02', zone: 'Zona B (Medium Moving)', rack: 'Rak 1', tier: 'Tingkat 2', maxCapacity: 800 },
  { id: 'bin-5', warehouseId: 'WH-DKI01', code: 'BIN-DEF-01', zone: 'Karantina Defect QC', rack: 'Rak QC', tier: 'Tingkat 1', maxCapacity: 500 },
  // BIN Rak Gudang Cabang
  { id: 'bin-6', warehouseId: 'WH-DKI02', code: 'BIN-CBG-01', zone: 'Zona Utama Cabang', rack: 'Rak 1', tier: 'Tingkat 1', maxCapacity: 1000 },
  { id: 'bin-7', warehouseId: 'WH-DKI02', code: 'BIN-CBG-DEF', zone: 'Karantina Defect Cabang', rack: 'Rak QC', tier: 'Tingkat 1', maxCapacity: 300 },
];

// Kosongkan seluruh produk, stok, log transaksi, pre-order, dan defect sesuai permintaan user
export const INITIAL_PRODUCTS: ProductSKU[] = [];
export const INITIAL_STOCK_POSITIONS: StockPosition[] = [];
export const INITIAL_INBOUND_LOGS: InboundLog[] = [];
export const INITIAL_OUTBOUND_LOGS: OutboundLog[] = [];
export const INITIAL_PRE_ORDERS: PreOrderItem[] = [];
export const INITIAL_DEFECTS: DefectTrackerItem[] = [];
export const INITIAL_SUPPLIERS: SupplierPartner[] = [];
export const INITIAL_VENDOR_INVOICES: any[] = [];
export const INITIAL_STOCK_OPNAMES: any[] = [];

