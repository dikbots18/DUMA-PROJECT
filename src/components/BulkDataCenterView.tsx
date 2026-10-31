import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileCode,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Database,
  RefreshCw,
  ArrowRight,
  Package,
  Boxes,
  Handshake,
  ClockAlert,
  ArrowDownToDot,
  ArrowUpFromDot,
  Wrench,
  Copy,
  Check,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import {
  parseCSV,
  TEMPLATES,
  triggerFileDownload,
  parseAndValidateProductsCSV,
  parseAndValidateStockCSV,
  parseAndValidateSuppliersCSV,
  exportProductsCSV,
  exportStockPositionsCSV,
  exportInboundLogsCSV,
  exportOutboundLogsCSV,
  exportSuppliersCSV,
  exportPreOrdersCSV,
  exportDefectsCSV,
  ParsedProductRow,
  ParsedStockRow,
} from '../utils/csvImportExport';
import { ImportPreviewRow, BulkImportEntity, SupplierPartner } from '../types/inventory';

export const BulkDataCenterView: React.FC = () => {
  const {
    products,
    stockPositions,
    warehouses,
    bins,
    suppliers,
    inbounds,
    outbounds,
    preOrders,
    defects,
    bulkImportProducts,
    bulkImportStockPositions,
    bulkImportSuppliers,
    bulkRestoreDatabase,
    setActiveTab,
  } = useInventory();

  // Active Main Tab: 'IMPORT' or 'EXPORT'
  const [activeMainTab, setActiveMainTab] = useState<'IMPORT' | 'EXPORT'>('IMPORT');

  // Import Sub-states
  const [selectedEntity, setSelectedEntity] = useState<BulkImportEntity>('PRODUCTS');
  const [importMode, setImportMode] = useState<'MERGE' | 'REPLACE'>('MERGE');
  const [rawText, setRawText] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<'FILE' | 'PASTE'>('FILE');
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Preview & Validation State
  const [previewProducts, setPreviewProducts] = useState<ImportPreviewRow<ParsedProductRow>[]>([]);
  const [previewStocks, setPreviewStocks] = useState<ImportPreviewRow<ParsedStockRow>[]>([]);
  const [previewSuppliers, setPreviewSuppliers] = useState<ImportPreviewRow<SupplierPartner>[]>([]);
  const [jsonBackupPayload, setJsonBackupPayload] = useState<any>(null);

  // Status feedback
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // TEMPLATE DOWNLOAD
  // ---------------------------------------------------------------------------
  const handleDownloadTemplate = (entity: BulkImportEntity) => {
    if (entity === 'PRODUCTS') {
      const template = TEMPLATES.PRODUCTS;
      const csv =
        '\uFEFF' +
        template.headers.join(',') +
        '\r\n' +
        template.sampleRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
      triggerFileDownload(csv, template.filename);
    } else if (entity === 'STOCK_INITIAL') {
      const template = TEMPLATES.STOCK_INITIAL;
      const csv =
        '\uFEFF' +
        template.headers.join(',') +
        '\r\n' +
        template.sampleRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
      triggerFileDownload(csv, template.filename);
    } else if (entity === 'SUPPLIERS') {
      const template = TEMPLATES.SUPPLIERS;
      const csv =
        '\uFEFF' +
        template.headers.join(',') +
        '\r\n' +
        template.sampleRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
      triggerFileDownload(csv, template.filename);
    } else if (entity === 'INBOUND_BATCH') {
      const template = TEMPLATES.INBOUND_BATCH;
      const csv =
        '\uFEFF' +
        template.headers.join(',') +
        '\r\n' +
        template.sampleRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
      triggerFileDownload(csv, template.filename);
    }
  };

  // ---------------------------------------------------------------------------
  // PROCESS INPUT TEXT / CSV
  // ---------------------------------------------------------------------------
  const processRawData = (content: string, name = 'input.csv') => {
    setFileName(name);
    setRawText(content);
    setImportResult(null);

    if (selectedEntity === 'FULL_BACKUP_JSON') {
      try {
        const parsed = JSON.parse(content);
        setJsonBackupPayload(parsed);
      } catch (err: any) {
        setImportResult({
          success: false,
          message: `Berkas JSON tidak valid: ${err.message}`,
        });
      }
      return;
    }

    const rows = parseCSV(content);
    if (rows.length < 2) {
      setImportResult({
        success: false,
        message: 'Berkas CSV harus memiliki minimal 1 baris header dan 1 baris data.',
      });
      setPreviewProducts([]);
      setPreviewStocks([]);
      setPreviewSuppliers([]);
      return;
    }

    if (selectedEntity === 'PRODUCTS') {
      const validated = parseAndValidateProductsCSV(rows, products, warehouses, bins);
      setPreviewProducts(validated);
    } else if (selectedEntity === 'STOCK_INITIAL') {
      const validated = parseAndValidateStockCSV(rows, products, warehouses, bins);
      setPreviewStocks(validated);
    } else if (selectedEntity === 'SUPPLIERS') {
      const validated = parseAndValidateSuppliersCSV(rows, suppliers);
      setPreviewSuppliers(validated);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processRawData(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processRawData(content, file.name);
    };
    reader.readAsText(file);
  };

  // ---------------------------------------------------------------------------
  // COMMIT IMPORT
  // ---------------------------------------------------------------------------
  const handleExecuteImport = () => {
    setIsProcessing(true);
    setImportResult(null);

    setTimeout(() => {
      try {
        if (selectedEntity === 'PRODUCTS') {
          const validRows = previewProducts.filter((r) => r.isValid).map((r) => r.data);
          if (validRows.length === 0) {
            setImportResult({ success: false, message: 'Tidak ada baris data produk yang valid untuk diimpor.' });
            setIsProcessing(false);
            return;
          }
          const res = bulkImportProducts(validRows, importMode);
          setImportResult(res);
          setPreviewProducts([]);
          setRawText('');
          setFileName('');
        } else if (selectedEntity === 'STOCK_INITIAL') {
          const validRows = previewStocks.filter((r) => r.isValid).map((r) => r.data);
          if (validRows.length === 0) {
            setImportResult({ success: false, message: 'Tidak ada baris posisi stok yang valid untuk diimpor.' });
            setIsProcessing(false);
            return;
          }
          const res = bulkImportStockPositions(validRows);
          setImportResult(res);
          setPreviewStocks([]);
          setRawText('');
          setFileName('');
        } else if (selectedEntity === 'SUPPLIERS') {
          const validRows = previewSuppliers.filter((r) => r.isValid).map((r) => r.data);
          if (validRows.length === 0) {
            setImportResult({ success: false, message: 'Tidak ada data supplier yang valid untuk diimpor.' });
            setIsProcessing(false);
            return;
          }
          const res = bulkImportSuppliers(validRows, importMode);
          setImportResult(res);
          setPreviewSuppliers([]);
          setRawText('');
          setFileName('');
        } else if (selectedEntity === 'FULL_BACKUP_JSON') {
          if (!jsonBackupPayload) {
            setImportResult({ success: false, message: 'Data JSON cadangan belum diunggah.' });
            setIsProcessing(false);
            return;
          }
          const res = bulkRestoreDatabase(jsonBackupPayload);
          setImportResult(res);
          setJsonBackupPayload(null);
          setRawText('');
          setFileName('');
        }
      } catch (err: any) {
        setImportResult({ success: false, message: `Terjadi kesalahan impor: ${err.message}` });
      } finally {
        setIsProcessing(false);
      }
    }, 400);
  };

  // ---------------------------------------------------------------------------
  // EXPORT HANDLERS
  // ---------------------------------------------------------------------------
  const handleExportFullJSON = () => {
    const payload = {
      version: '3.0',
      exportDate: new Date().toISOString(),
      company: 'PT DUMA KREASI INDONESIA',
      products,
      warehouses,
      bins,
      stockPositions,
      suppliers,
      inbounds,
      outbounds,
      preOrders,
      defects,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    triggerFileDownload(
      jsonStr,
      `WMS_DumaKreasi_FULL_BACKUP_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8;'
    );
  };

  const handleExportProducts = () => {
    const csv = exportProductsCSV(products, stockPositions);
    triggerFileDownload(csv, `Katalog_Master_SKU_DumaKreasi_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportStocks = () => {
    const csv = exportStockPositionsCSV(stockPositions, products, warehouses);
    triggerFileDownload(csv, `Posisi_Stok_Gudang_BIN_DumaKreasi_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportInbounds = () => {
    const csv = exportInboundLogsCSV(inbounds);
    triggerFileDownload(csv, `Log_Barang_Masuk_DumaKreasi_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportOutbounds = () => {
    const csv = exportOutboundLogsCSV(outbounds);
    triggerFileDownload(csv, `Log_Barang_Keluar_DumaKreasi_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportSuppliers = () => {
    const csv = exportSuppliersCSV(suppliers);
    triggerFileDownload(csv, `Daftar_Mitra_Supplier_DumaKreasi_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportPreOrders = () => {
    const csv = exportPreOrdersCSV(preOrders);
    triggerFileDownload(csv, `Daftar_PreOrder_DumaKreasi_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportDefects = () => {
    const csv = exportDefectsCSV(defects);
    triggerFileDownload(csv, `Laporan_Defect_QC_DumaKreasi_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportAllCSVs = () => {
    handleExportProducts();
    setTimeout(handleExportStocks, 200);
    setTimeout(handleExportInbounds, 400);
    setTimeout(handleExportOutbounds, 600);
    setTimeout(handleExportSuppliers, 800);
    setTimeout(handleExportPreOrders, 1000);
    setTimeout(handleExportDefects, 1200);
  };

  // Preview stats calculation
  const currentPreviewCount =
    selectedEntity === 'PRODUCTS'
      ? previewProducts.length
      : selectedEntity === 'STOCK_INITIAL'
      ? previewStocks.length
      : selectedEntity === 'SUPPLIERS'
      ? previewSuppliers.length
      : jsonBackupPayload
      ? 1
      : 0;

  const validCount =
    selectedEntity === 'PRODUCTS'
      ? previewProducts.filter((p) => p.isValid).length
      : selectedEntity === 'STOCK_INITIAL'
      ? previewStocks.filter((s) => s.isValid).length
      : selectedEntity === 'SUPPLIERS'
      ? previewSuppliers.filter((s) => s.isValid).length
      : jsonBackupPayload
      ? 1
      : 0;

  const invalidCount = currentPreviewCount - validCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded uppercase tracking-wider">
              Pusat Manajemen Data Massal
            </span>
            <span className="text-xs text-slate-400 font-mono">BULK-ENGINE-v3</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Impor Massal & Ekspor Data Inventaris</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unggah ratusan SKU atau stok awal sekaligus via berkas CSV, unduh template resmi, dan ekspor seluruh basis data PT Duma Kreasi Indonesia
          </p>
        </div>

        {/* Tab Switcher: Import vs Export */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveMainTab('IMPORT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeMainTab === 'IMPORT'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Impor Data Massal</span>
          </button>
          <button
            onClick={() => setActiveMainTab('EXPORT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeMainTab === 'EXPORT'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor & Cadangan Data</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: BULK IMPORT TAB */}
      {/* ===================================================================== */}
      {activeMainTab === 'IMPORT' && (
        <div className="space-y-6">
          {/* PANDUAN LENGKAP PENGISIAN BULK IMPORT: 4 KOLOM PALING PENTING */}
          <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-blue-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-800/60">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-500/20 rounded-xl text-blue-300 border border-blue-400/30">
                  <FileSpreadsheet className="w-5 h-5 text-blue-300" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    PANDUAN LENGKAP BULK IMPORT: 4 KOLOM UTAMA & WAJIB DIISI
                  </h3>
                  <p className="text-xs text-blue-200/80 mt-0.5">
                    Pastikan tabel CSV atau Excel Anda memiliki 4 data pokok berikut agar impor terbaca 100% valid ke dalam sistem WMS Duma Kreasi Indonesia.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                Format Resmi DUMA WMS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Kolom 1: KODE SKU */}
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 hover:border-blue-400/50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 uppercase tracking-wider">
                    Kolom 1: Wajib Unik
                  </span>
                  <span className="text-emerald-400 font-bold">&check;</span>
                </div>
                <h4 className="font-bold text-white text-sm">KODE SKU</h4>
                <p className="text-blue-100/70 text-[11px] mt-1">
                  Nama header: <code className="text-amber-300 font-mono">sku</code> atau <code className="text-amber-300 font-mono">Kode SKU</code>.
                </p>
                <div className="mt-2 p-2 bg-black/30 rounded-lg text-[11px] font-mono text-blue-200 border border-white/5">
                  Contoh: DKI-TSH-001, DKI-APP-NAVY-L
                </div>
              </div>

              {/* Kolom 2: NAMA ITEM */}
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 hover:border-blue-400/50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 uppercase tracking-wider">
                    Kolom 2: Wajib Diisi
                  </span>
                  <span className="text-emerald-400 font-bold">&check;</span>
                </div>
                <h4 className="font-bold text-white text-sm">NAMA ITEM / BARANG</h4>
                <p className="text-blue-100/70 text-[11px] mt-1">
                  Nama header: <code className="text-amber-300 font-mono">name</code> atau <code className="text-amber-300 font-mono">Nama Produk</code>.
                </p>
                <div className="mt-2 p-2 bg-black/30 rounded-lg text-[11px] font-mono text-indigo-200 border border-white/5 truncate">
                  Contoh: Kemeja Signature Navy L
                </div>
              </div>

              {/* Kolom 3: QTY */}
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 hover:border-blue-400/50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 uppercase tracking-wider">
                    Kolom 3: Angka Bulat
                  </span>
                  <span className="text-emerald-400 font-bold">&check;</span>
                </div>
                <h4 className="font-bold text-white text-sm">QTY (KUANTITAS FISIK)</h4>
                <p className="text-blue-100/70 text-[11px] mt-1">
                  Nama header: <code className="text-amber-300 font-mono">qty</code>, <code className="text-amber-300 font-mono">initialQty</code>, atau <code className="text-amber-300 font-mono">stokAwal</code>.
                </p>
                <div className="mt-2 p-2 bg-black/30 rounded-lg text-[11px] font-mono text-emerald-200 border border-white/5">
                  Contoh: 150, 500 (Pcs fisik masuk)
                </div>
              </div>

              {/* Kolom 4: LOKASI GUDANG */}
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 hover:border-blue-400/50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 uppercase tracking-wider">
                    Kolom 4: Gudang Mana
                  </span>
                  <span className="text-emerald-400 font-bold">&check;</span>
                </div>
                <h4 className="font-bold text-white text-sm">LOKASI GUDANG (Gudang Mana)</h4>
                <p className="text-blue-100/70 text-[11px] mt-1">
                  Nama header: <code className="text-amber-300 font-mono">warehouseId</code> atau <code className="text-amber-300 font-mono">Gudang</code>.
                </p>
                <div className="mt-2 p-2 bg-black/30 rounded-lg text-[11px] font-mono text-purple-200 border border-white/5">
                  Contoh: WH-DKI01 (Gudang Utama)
                </div>
              </div>
            </div>

            {/* Referensi Gudang Terdaftar */}
            <div className="p-3 bg-blue-950/60 rounded-xl border border-blue-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">Daftar Kode Gudang Resmi DUMA:</span>
                <span className="text-slate-200">
                  {warehouses.map((w) => `${w.id} (${w.name})`).join(' | ')}
                </span>
              </div>
              <span className="text-blue-300 font-medium">
                Sistem otomatis memetakan nama gudang yang cocok.
              </span>
            </div>
          </div>

          {/* Step 1 & 2: Entity & Mode Selection Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Entity Type Picker */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  1. Pilih Jenis Data Yang Akan Diimpor:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      id: 'PRODUCTS',
                      label: 'Master SKU & Katalog',
                      icon: Package,
                      desc: 'SKU, Harga, Batas Min, Stok Awal',
                    },
                    {
                      id: 'STOCK_INITIAL',
                      label: 'Saldo Stok / BIN',
                      icon: Boxes,
                      desc: 'Qty Fisik per Gudang & BIN',
                    },
                    {
                      id: 'SUPPLIERS',
                      label: 'Mitra & Supplier',
                      icon: Handshake,
                      desc: 'Profil vendor, kontak, & termin',
                    },
                    {
                      id: 'FULL_BACKUP_JSON',
                      label: 'Restore Backup JSON',
                      icon: Database,
                      desc: 'Pulihkan seluruh database sistem',
                    },
                  ].map((ent) => {
                    const Icon = ent.icon;
                    const isSelected = selectedEntity === ent.id;
                    return (
                      <button
                        key={ent.id}
                        type="button"
                        onClick={() => {
                          setSelectedEntity(ent.id as BulkImportEntity);
                          setPreviewProducts([]);
                          setPreviewStocks([]);
                          setPreviewSuppliers([]);
                          setJsonBackupPayload(null);
                          setRawText('');
                          setFileName('');
                          setImportResult(null);
                        }}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                            {ent.label}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{ent.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Import Mode: Merge vs Replace */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  2. Metode Penulisan Data:
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                      importMode === 'MERGE'
                        ? 'bg-blue-50/50 border-blue-400'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'MERGE'}
                      onChange={() => setImportMode('MERGE')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Gabungkan / Merge (Direkomendasikan)</p>
                      <p className="text-[11px] text-slate-500">
                        Tambahkan item baru & perbarui data jika SKU/Kode sudah ada tanpa menghapus data lainnya.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                      importMode === 'REPLACE'
                        ? 'bg-rose-50/50 border-rose-400'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'REPLACE'}
                      onChange={() => setImportMode('REPLACE')}
                      className="mt-0.5 text-rose-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-rose-900">Timpa Seluruh Data (Replace)</p>
                      <p className="text-[11px] text-slate-500">
                        Ganti seluruh data tabel terpilih dengan baris yang ada di berkas impor ini.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Template Banner */}
            {selectedEntity !== 'FULL_BACKUP_JSON' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">
                      Gunakan Template Resmi PT DUMA KREASI INDONESIA:
                    </span>
                    <p className="text-slate-500 text-[11px]">
                      Kolom sudah dikonfigurasi agar sesuai dengan format database gudang, termasuk header dan contoh pengisian.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(selectedEntity)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Template CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* Step 3: File Upload / Paste Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                3. Masukkan Berkas atau Teks Data:
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setInputMethod('FILE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    inputMethod === 'FILE'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Unggah Berkas (.csv / .json)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('PASTE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    inputMethod === 'PASTE'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tempel / Paste Teks CSV
                </button>
              </div>
            </div>

            {inputMethod === 'FILE' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/60'
                    : fileName
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept={selectedEntity === 'FULL_BACKUP_JSON' ? '.json' : '.csv,text/csv'}
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                {fileName ? (
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Berkas Terpilih: {fileName}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Klik kembali untuk mengganti berkas, atau periksa pratinjau validasi di bawah.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Klik untuk memilih berkas atau seret berkas ke area ini
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Format yang didukung: {selectedEntity === 'FULL_BACKUP_JSON' ? '.JSON' : '.CSV'} (Pemisah koma atau titik koma)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => processRawData(e.target.value, 'Pasted_Data.csv')}
                  placeholder={
                    selectedEntity === 'PRODUCTS'
                      ? 'Kode_SKU,Nama_Produk,Kategori,Satuan,Harga_Beli_HPP,Harga_Jual,Min_Stock_Alert\nDKI-APP-001,Kemeja Katun,Pakaian,Pcs,95000,195000,20'
                      : 'Tempel teks format CSV di sini...'
                  }
                  className="w-full p-3 font-mono text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400">
                  Data otomatis divalidasi dan diurai begitu teks ditempel.
                </p>
              </div>
            )}
          </div>

          {/* Feedback Toast */}
          {importResult && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200 ${
                importResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {importResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{importResult.message}</span>
              </div>
              {importResult.success && selectedEntity === 'PRODUCTS' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition shrink-0"
                >
                  Buka Katalog &rarr;
                </button>
              )}
            </div>
          )}

          {/* Step 4: Preview & Validation Table */}
          {currentPreviewCount > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold text-slate-900">
                    Pratinjau & Validasi Data ({currentPreviewCount} Baris):
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                    {validCount} Siap Diimpor
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                      {invalidCount} Bermasalah
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewProducts([]);
                      setPreviewStocks([]);
                      setPreviewSuppliers([]);
                      setJsonBackupPayload(null);
                      setRawText('');
                      setFileName('');
                    }}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={validCount === 0 || isProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isProcessing ? 'Memproses Impor...' : `Impor ${validCount} Data Valid Sekarang`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Table rendering based on entity */}
              <div className="overflow-x-auto max-h-80">
                {selectedEntity === 'PRODUCTS' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Baris</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Kode SKU</th>
                        <th className="px-3 py-2.5">Nama Produk</th>
                        <th className="px-3 py-2.5">Kategori</th>
                        <th className="px-3 py-2.5 text-right">HPP</th>
                        <th className="px-3 py-2.5 text-right">Harga Jual</th>
                        <th className="px-3 py-2.5 text-center">Batas Min</th>
                        <th className="px-3 py-2.5 text-center">Stok Awal</th>
                        <th className="px-3 py-2.5">Catatan / Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewProducts.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={row.isValid ? 'hover:bg-slate-50/70' : 'bg-rose-50/40'}
                        >
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                            #{row.rowNumber}
                          </td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3" /> Error
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">
                            {row.data.product.sku}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {row.data.product.name}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{row.data.product.category}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            Rp {row.data.product.buyPrice.toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            Rp {row.data.product.sellPrice.toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2 text-center">{row.data.product.minStockAlert}</td>
                          <td className="px-3 py-2 text-center font-bold text-blue-600">
                            {row.data.initialQty || 0}
                          </td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <span className="text-[11px] text-emerald-700">Siap disimpan</span>
                            ) : (
                              <span className="text-[11px] text-rose-700 font-medium">
                                {row.errors.join('; ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {selectedEntity === 'STOCK_INITIAL' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Baris</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Kode SKU</th>
                        <th className="px-3 py-2.5">ID Gudang</th>
                        <th className="px-3 py-2.5">Kode BIN</th>
                        <th className="px-3 py-2.5 text-center">Qty On-Hand</th>
                        <th className="px-3 py-2.5">Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewStocks.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={row.isValid ? 'hover:bg-slate-50/70' : 'bg-rose-50/40'}
                        >
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                            #{row.rowNumber}
                          </td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3" /> Error
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">{row.data.sku}</td>
                          <td className="px-3 py-2 text-slate-800">{row.data.warehouseId}</td>
                          <td className="px-3 py-2 font-mono text-slate-800">{row.data.binCode}</td>
                          <td className="px-3 py-2 text-center font-bold text-blue-600">
                            {row.data.qtyOnHand} Pcs
                          </td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <span className="text-[11px] text-emerald-700">Valid</span>
                            ) : (
                              <span className="text-[11px] text-rose-700 font-medium">
                                {row.errors.join('; ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {selectedEntity === 'SUPPLIERS' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Baris</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Kode Supplier</th>
                        <th className="px-3 py-2.5">Nama Perusahaan</th>
                        <th className="px-3 py-2.5">Kategori</th>
                        <th className="px-3 py-2.5">PIC</th>
                        <th className="px-3 py-2.5">Telepon</th>
                        <th className="px-3 py-2.5">Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewSuppliers.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={row.isValid ? 'hover:bg-slate-50/70' : 'bg-rose-50/40'}
                        >
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                            #{row.rowNumber}
                          </td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3" /> Error
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">{row.data.code}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{row.data.name}</td>
                          <td className="px-3 py-2 text-slate-600">{row.data.category}</td>
                          <td className="px-3 py-2 text-slate-700">{row.data.picName}</td>
                          <td className="px-3 py-2 text-slate-600">{row.data.phone}</td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <span className="text-[11px] text-emerald-700">Valid</span>
                            ) : (
                              <span className="text-[11px] text-rose-700 font-medium">
                                {row.errors.join('; ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {selectedEntity === 'FULL_BACKUP_JSON' && jsonBackupPayload && (
                  <div className="p-4 bg-slate-50 rounded-lg text-xs space-y-2">
                    <p className="font-bold text-slate-800">Rangkuman Berkas JSON Cadangan:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-400">Produk:</span>{' '}
                        <strong>{jsonBackupPayload.products?.length || 0} SKU</strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-400">Gudang:</span>{' '}
                        <strong>{jsonBackupPayload.warehouses?.length || 0} Lokasi</strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-400">Posisi Stok:</span>{' '}
                        <strong>{jsonBackupPayload.stockPositions?.length || 0} Posisi</strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-400">Log Inbound:</span>{' '}
                        <strong>{jsonBackupPayload.inbounds?.length || 0} Baris</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: BULK EXPORT TAB */}
      {/* ===================================================================== */}
      {activeMainTab === 'EXPORT' && (
        <div className="space-y-6">
          {/* Full Database Backup Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">Cadangan Database Penuh (Full JSON Backup)</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/30 text-blue-300 rounded border border-blue-400/30">
                  Semua Tabel & Riwayat
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                Unduh seluruh status master data, pergerakan stok, log masuk/keluar, antrean pre-order, dan riwayat defect PT Duma Kreasi Indonesia dalam 1 file JSON terstruktur untuk keamanan data & migrasi.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportFullJSON}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md transition shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Full Backup JSON</span>
            </button>
          </div>

          {/* Modular CSV Exports Grid */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ekspor Berkas Spreadsheet (.CSV) per Modul</h3>
                <p className="text-xs text-slate-500">
                  Dapat langsung dibuka di Microsoft Excel, Google Sheets, atau aplikasi analitik lainnya dengan format UTF-8 rapi
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportAllCSVs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Semua Berkas CSV Sekaligus</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Master SKU */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <Package className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold text-slate-500">{products.length} SKU</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-3">Katalog Master SKU</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kode SKU, nama, kategori, HPP, harga jual, total stok on-hand, dan batas alert.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportProducts}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor SKU (CSV)</span>
                </button>
              </div>

              {/* 2. Stock Positions */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <Boxes className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold text-slate-500">{stockPositions.length} Penempatan</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-3">Status Stok Gudang & BIN</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rincian alokasi fisik barang di setiap BIN rak, stok cadangan PO, defect, dan siap jual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportStocks}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Stok & BIN (CSV)</span>
                </button>
              </div>

              {/* 3. Inbounds */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-teal-100 text-teal-700">
                      <ArrowDownToDot className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold text-slate-500">{inbounds.length} Transaksi</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-3">Buku Log Barang Masuk (Inbound)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Riwayat penerimaan pembelian vendor, retur customer, pengembalian KOL, dan transfer masuk.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportInbounds}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Log Inbound (CSV)</span>
                </button>
              </div>

              {/* 4. Outbounds */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                      <ArrowUpFromDot className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold text-slate-500">{outbounds.length} Transaksi</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-3">Buku Log Barang Keluar (Outbound)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Riwayat pengiriman penjualan marketplace, retur ke pabrik, dan relokasi BIN.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportOutbounds}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Log Outbound (CSV)</span>
                </button>
              </div>

              {/* 5. Pre-Orders */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-purple-100 text-purple-700">
                      <ClockAlert className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold text-slate-500">{preOrders.length} Antrean</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-3">Antrean Pre-Order & Backorder</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pesanan pembeli yang menunggu stok ready, tanggal target fulfillment, dan alokasi gudang.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportPreOrders}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Pre-Order (CSV)</span>
                </button>
              </div>

              {/* 6. Defect Tracker */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-rose-100 text-rose-700">
                      <Wrench className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold text-slate-500">{defects.length} Tiket QC</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-3">Laporan Defect & Rekap QC</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Data barang cacat per vendor, siklus perbaikan ke-berapa, status tindakan, dan estimasi biaya.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportDefects}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Defect QC (CSV)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
