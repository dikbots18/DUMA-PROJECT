import React, { useState } from 'react';
import {
  CodeXml,
  Copy,
  Check,
  Download,
  ExternalLink,
  X,
  FileSpreadsheet,
  Terminal,
  Send,
  Layers,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

interface AppsScriptSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppsScriptSyncModal: React.FC<AppsScriptSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    products,
    warehouses,
    bins,
    stockPositions,
    inbounds,
    outbounds,
    preOrders,
    defects,
    suppliers,
  } = useInventory();

  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'code' | 'json' | 'guide'>('code');

  if (!isOpen) return null;

  // Complete Google Apps Script (.gs) code template
  const appsScriptCode = `/**
 * ============================================================================
 * WMS DUMA KREASI INDONESIA - GOOGLE APPS SCRIPT SYNC & BACKEND ENGINE
 * PT Duma Kreasi Indonesia - Sistem Manajemen Inventaris Gudang, BIN, Pre-Order, & Defect Tracker
 * ============================================================================
 * Petunjuk Instalasi:
 * 1. Buka Google Sheets baru di https://sheets.new
 * 2. Klik menu 'Extensions' (Ekstensi) -> 'Apps Script'
 * 3. Hapus semua kode default, lalu Paste seluruh kode script ini
 * 4. Pada dropdown fungsi di atas, pilih 'setupAllSheets' lalu klik 'Run' (Jalankan)
 * 5. Berikan izin otorisasi Google jika diminta.
 * 6. Selesai! Semua sheet otomatis terbentuk dengan header dan rumus siap pakai.
 */

function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Sheet Master_SKU
  createSheetWithHeaders(ss, "Master_SKU", [
    "Kode_SKU", "Nama_Barang", "Kategori", "Satuan", "Harga_Beli_HPP", 
    "Harga_Jual", "Min_Stock_Alert", "Total_Stok_Fisik", "Status_Alert", "Catatan"
  ], [
    ["KMJ-OXF-WHT-M", "Kemeja Oxford Slim Fit Putih (M)", "Kemeja", "Pcs", 85000, 169000, 35, '=SUMIF(Status_Stok_BIN!A:A, A2, Status_Stok_BIN!E:E)', '=IF(H2<=G2, "LOW STOCK", "AMAN")', "Cotton 100%"]
  ]);

  // 2. Sheet Status_Stok_BIN
  createSheetWithHeaders(ss, "Status_Stok_BIN", [
    "Kode_SKU", "Nama_Produk", "ID_Gudang", "Kode_BIN", "Stok_OnHand", 
    "Stok_Reserved_PO", "Stok_Defect", "Stok_Available", "Update_Terakhir"
  ], [
    ["KMJ-OXF-WHT-M", "Kemeja Oxford Slim Fit Putih (M)", "WH-JKT01", "BIN-A1-01", 145, 15, 4, '=E2-F2', new Date()]
  ]);

  // 3. Sheet Lokasi_Gudang
  createSheetWithHeaders(ss, "Lokasi_Gudang", [
    "ID_Gudang", "Kode_Gudang", "Nama_Gudang", "PIC", "No_Telepon", 
    "Alamat", "Kapasitas_Max", "Stok_Tersimpan", "Persen_Terisi"
  ], [
    ["WH-JKT01", "JKT-01", "Gudang Utama Cakung", "Bambang Supriyanto", "0812-9988-7711", "Kawasan Cakung, Jaktim", 20000, '=SUMIF(Status_Stok_BIN!C:C, A2, Status_Stok_BIN!E:E)', '=H2/G2']
  ]);

  // 4. Sheet Log_Inbound
  createSheetWithHeaders(ss, "Log_Inbound", [
    "Waktu", "No_Referensi_PO", "Jenis_Inbound", "Kode_SKU", "Nama_Barang", 
    "Qty_Masuk", "Gudang_Tujuan", "Kode_BIN", "Sumber_Vendor", "PIC", "Catatan"
  ], [
    [new Date(), "PO-2026-0901", "VENDOR_PURCHASE", "KMJ-OXF-WHT-M", "Kemeja Oxford Slim Fit Putih (M)", 200, "WH-JKT01", "BIN-A1-01", "PT Garment Sentosa Bandung", "Rian QC", "Lolos inspeksi"]
  ]);

  // 5. Sheet Log_Outbound
  createSheetWithHeaders(ss, "Log_Outbound", [
    "Waktu", "No_Surat_Jalan_SO", "Jenis_Outbound", "Kode_SKU", "Nama_Barang", 
    "Qty_Keluar", "Gudang_Asal", "Kode_BIN_Asal", "Tujuan_Penerima", "PIC", "Catatan"
  ], [
    [new Date(), "SO-SHP-20261021-001", "DAILY_SALES", "KMJ-OXF-WHT-M", "Kemeja Oxford Slim Fit Putih (M)", 25, "WH-JKT01", "BIN-A1-01", "Shopee Mall #Batch-01", "Yanto Dispatch", "Pickup J&T Express"]
  ]);

  // 6. Sheet Pre_Order_Tracker
  createSheetWithHeaders(ss, "Pre_Order_Tracker", [
    "No_Pesanan_PO", "Channel", "Nama_Customer", "No_Telepon", "Kode_SKU", 
    "Nama_Produk", "Qty_Diminta", "Qty_Teralokasi", "Status_PO", "Tgl_Order", "ETA_Ready", "Catatan"
  ], [
    ["PO-ORD-9012", "Shopee Official", "Dian Anugrah", "0812-8877-6655", "KMJ-OXF-NVY-L", "Kemeja Oxford Navy (L)", 2, 0, "MENUNGGU_BARANG", "2026-10-24", "2026-11-05", "Kloter 2"]
  ]);

  // 7. Sheet Defect_Tracker (QC)
  createSheetWithHeaders(ss, "Defect_Tracker", [
    "Kode_Defect", "Kode_SKU", "Nama_Produk", "Qty_Defect", "ID_Gudang", 
    "Sumber_Temuan", "Vendor_Asal", "Jenis_Defect", "Perbaikan_Ke", "Status_Defect", "Tgl_Lapor", "Catatan_QC"
  ], [
    ["DEF-2026-10-01", "KMJ-OXF-WHT-M", "Kemeja Oxford Slim Fit Putih (M)", 4, "WH-JKT01", "INBOUND_QC", "PT Garment Sentosa Bandung", "JAHITAN_RUSAK", 1, "DIKIRIM_KE_VENDOR", new Date(), "Jahitan lengan kanan lepas"]
  ]);

  // 8. Sheet Mitra_Supplier
  createSheetWithHeaders(ss, "Mitra_Supplier", [
    "ID_Supplier", "Kode_Vendor", "Nama_Mitra", "Kategori", "PIC_Kontak", 
    "No_Telepon", "Email", "Alamat", "Termin_TOP", "Rating"
  ], [
    ["SUP-01", "VND-GARMENT-01", "PT Garment Sentosa Bandung", "PRODUK_JADI", "H. Dedi Mulyadi", "0811-2233-4455", "dedi@garmentsentosa.co.id", "Majalaya, Bandung", "NET 30 Hari", 5]
  ]);

  SpreadsheetApp.getUi().alert("Sukses! Seluruh 8 Sheet WMS Nusantara telah berhasil di-generate secara otomatis.");
}

function createSheetWithHeaders(ss, sheetName, headers, sampleRows) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  // Set Headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1e293b");
  headerRange.setFontColor("#ffffff");
  
  // Set Sample Rows
  if (sampleRows && sampleRows.length > 0) {
    const dataRange = sheet.getRange(2, 1, sampleRows.length, sampleRows[0].length);
    dataRange.setValues(sampleRows);
  }
  
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * Endpoint Webhook REST API untuk sinkronisasi otomatis
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "WMS Nusantara Google Apps Script API Ready",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.action === "LOG_INBOUND") {
      const sheet = ss.getSheetByName("Log_Inbound");
      sheet.appendRow([
        new Date(), data.invoiceNo, data.type, data.sku, data.productName,
        data.qty, data.targetWarehouseId, data.targetBinCode, data.sourceOrVendor,
        data.pic, data.notes
      ]);
    } else if (data.action === "LOG_OUTBOUND") {
      const sheet = ss.getSheetByName("Log_Outbound");
      sheet.appendRow([
        new Date(), data.transactionNo, data.type, data.sku, data.productName,
        data.qty, data.sourceWarehouseId, data.sourceBinCode, data.destinationOrCustomer,
        data.pic, data.notes
      ]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Sync Berhasil" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportFullJson = () => {
    const payload = {
      exportDate: new Date().toISOString(),
      appName: 'WMS Duma Kreasi Indonesia',
      products,
      warehouses,
      bins,
      stockPositions,
      inbounds,
      outbounds,
      preOrders,
      defects,
      suppliers,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `WMS_DumaKreasi_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Google Apps Script & Sheets Integration</h3>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-400 text-slate-900 font-bold rounded">
                  Apps Script Ready (.gs)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Hubungkan dan generate template Google Spreadsheet otomatis untuk inventaris Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-200 bg-slate-50 text-xs">
          <button
            onClick={() => setActiveSubTab('code')}
            className={`pb-2 px-3 font-semibold border-b-2 transition ${
              activeSubTab === 'code'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Source Code Apps Script (.gs)
          </button>
          <button
            onClick={() => setActiveSubTab('guide')}
            className={`pb-2 px-3 font-semibold border-b-2 transition ${
              activeSubTab === 'guide'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Langkah-Langkah Instalasi (1 Menit)
          </button>
          <button
            onClick={() => setActiveSubTab('json')}
            className={`pb-2 px-3 font-semibold border-b-2 transition ${
              activeSubTab === 'json'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Backup & Export Database JSON
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs">
          {activeSubTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-600">
                  Salin kode Apps Script di bawah ini, lalu tempelkan ke project Apps Script di Google Spreadsheet Anda:
                </p>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Kode Script'}</span>
                </button>
              </div>

              <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-emerald-400 max-h-96 overflow-y-auto">
                <pre>{appsScriptCode}</pre>
              </div>
            </div>
          )}

          {activeSubTab === 'guide' && (
            <div className="space-y-4 text-slate-700">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                <p className="font-bold">Cara Menjalankan Script di Google Sheets:</p>
                <ol className="list-decimal list-inside space-y-1.5 mt-2 text-xs">
                  <li>
                    Buka Google Sheets baru di tab peramban Anda (ketik{' '}
                    <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">sheets.new</code>)
                  </li>
                  <li>
                    Klik menu navigasi atas: <span className="font-semibold">Extensions (Ekstensi)</span> &rarr;{' '}
                    <span className="font-semibold">Apps Script</span>.
                  </li>
                  <li>
                    Hapus baris kode <code className="font-mono">myFunction()</code> default, lalu{' '}
                    <span className="font-semibold">Paste (Tempel)</span> kode dari tab "Source Code Apps Script".
                  </li>
                  <li>
                    Klik tombol <span className="font-semibold">Save (Simpan)</span> (ikon disket), lalu pilih fungsi{' '}
                    <code className="font-mono font-bold bg-slate-100 px-1 rounded">setupAllSheets</code> di sebelah tombol Run.
                  </li>
                  <li>
                    Klik <span className="font-bold text-emerald-700">Run (Jalankan)</span>. Izinkan popup otorisasi akun Google.
                  </li>
                  <li>
                    Kembali ke tab spreadsheet Anda: seluruh 8 tabel (Master SKU, BIN, Inbound, Outbound, Pre-Order, Defect Tracker) telah tersusun rapi dengan formula otomatis!
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
                <p className="font-bold">Keunggulan Integrasi Spreadsheet Ini:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                  <li>Rumus otomatis terpasang: SUMIF stok on-hand, validasi low stock, persentase kapasitas gudang.</li>
                  <li>Header warna profesional dengan auto-resize kolom.</li>
                  <li>Dapat disambungkan via Webhook POST URL jika ingin sinkronisasi tanpa batas.</li>
                </ul>
              </div>
            </div>
          )}

          {activeSubTab === 'json' && (
            <div className="space-y-4">
              <p className="text-slate-600">
                Anda juga dapat mengunduh seluruh data aplikasi saat ini (Katalog SKU, Stok BIN, Riwayat Inbound/Outbound, Defect QC, dan Supplier) dalam format file JSON untuk arsip atau impor ke sistem database lain:
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Arsip JSON Lengkap</h4>
                  <p className="text-slate-500 text-[11px]">
                    Berisi {products.length} SKU, {stockPositions.length} posisi BIN, {inbounds.length} log inbound, {outbounds.length} log outbound, dan {defects.length} defect log.
                  </p>
                </div>
                <button
                  onClick={exportFullJson}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>WMS Nusantara • Google Workspace Compatible</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
