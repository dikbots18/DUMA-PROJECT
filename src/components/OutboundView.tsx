import React, { useState } from 'react';
import {
  ArrowUpFromDot,
  Scan,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Lock,
  Building,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { OutboundType, OUTBOUND_TYPE_LABELS, OutboundLineItem } from '../types/inventory';
import { BarcodeScannerModal } from './BarcodeScannerModal';

export const OutboundView: React.FC = () => {
  const {
    products,
    warehouses,
    bins,
    stockPositions,
    handleMultiItemStockOut,
    isWarehouseLockedForOpname,
    setActiveTab,
  } = useInventory();

  // Header form states
  const [outboundType, setOutboundType] = useState<OutboundType>('SALES_PENJUALAN');
  const [transactionNo, setTransactionNo] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || '');
  const [destinationOrCustomer, setDestinationOrCustomer] = useState('Customer / Order Marketplace');
  const [pic, setPic] = useState('Staff Dispatch Outbound');
  const [globalNotes, setGlobalNotes] = useState('');

  // Multi-item rows
  const [lineItems, setLineItems] = useState<OutboundLineItem[]>([
    {
      id: `line-${Date.now()}-1`,
      sku: products[0]?.sku || '',
      productName: products[0]?.name || '',
      qty: 1,
      sourceBinCode: 'BIN-A1-01',
      notes: '',
    },
  ]);

  // Barcode Scanner Modal State
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Result / alert message
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter available bins for the selected warehouse
  const whBins = bins.filter((b) => b.warehouseId === sourceWarehouseId);
  const defaultBin = whBins[0]?.code || 'BIN-A1-01';

  // Check if current warehouse is locked by Stock Opname
  const isLocked = isWarehouseLockedForOpname(sourceWarehouseId);

  // Helper to compute available stock for a given sku + warehouse + bin
  const getAvailableStock = (sku: string, binCode: string) => {
    const pos = stockPositions.find(
      (sp) => sp.sku === sku && sp.warehouseId === sourceWarehouseId && sp.binCode === binCode
    );
    if (!pos) return 0;
    return Math.max(0, pos.qtyOnHand - (pos.qtyReserved || 0));
  };

  // Add a new row
  const handleAddRow = (prefilledSku?: string, prefilledQty = 1) => {
    const skuToUse = prefilledSku || products[0]?.sku || '';
    const prod = products.find((p) => p.sku === skuToUse);
    const newLine: OutboundLineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sku: skuToUse,
      productName: prod?.name || skuToUse,
      qty: prefilledQty,
      sourceBinCode: defaultBin,
      notes: '',
    };
    setLineItems((prev) => [...prev, newLine]);
  };

  // Remove a row
  const handleRemoveRow = (id: string) => {
    if (lineItems.length === 1) {
      setResultMsg({ type: 'error', text: 'Minimal harus ada 1 baris item dalam transaksi pengeluaran!' });
      return;
    }
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update a row
  const handleUpdateRow = (id: string, field: keyof OutboundLineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === 'sku') {
          const prod = products.find((p) => p.sku === value);
          return {
            ...item,
            sku: value,
            productName: prod?.name || item.productName,
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  // Handle scanned barcode
  const handleBarcodeScanned = (scannedSku: string, countQty = 1) => {
    const prod = products.find((p) => p.sku.toUpperCase() === scannedSku.toUpperCase());
    const validSku = prod ? prod.sku : scannedSku;

    const existingIndex = lineItems.findIndex(
      (item) => item.sku.toUpperCase() === validSku.toUpperCase()
    );

    if (existingIndex >= 0) {
      setLineItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, qty: item.qty + countQty }
            : item
        )
      );
    } else {
      handleAddRow(validSku, countQty);
    }
  };

  // Calculations
  const totalUnits = lineItems.reduce((acc, row) => acc + (Number(row.qty) || 0), 0);
  const totalDistinctSkus = new Set(lineItems.map((r) => r.sku).filter(Boolean)).size;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResultMsg(null);

    if (isLocked) {
      setResultMsg({
        type: 'error',
        text: 'Gudang ini sedang dalam status LOCK STOCK untuk Stock Opname! Pengeluaran stok dilarang sementara.',
      });
      return;
    }

    if (lineItems.length === 0) {
      setResultMsg({ type: 'error', text: 'Tambahkan setidaknya 1 baris item SKU!' });
      return;
    }

    // Check stock sufficiency for each item
    for (let i = 0; i < lineItems.length; i++) {
      const row = lineItems[i];
      if (!row.sku.trim()) {
        setResultMsg({ type: 'error', text: `Baris ke-${i + 1}: Kode SKU tidak boleh kosong!` });
        return;
      }
      if (!row.qty || row.qty <= 0) {
        setResultMsg({ type: 'error', text: `Baris ke-${i + 1} (${row.sku}): Kuantitas harus lebih besar dari 0!` });
        return;
      }
      const available = getAvailableStock(row.sku, row.sourceBinCode);
      if (row.qty > available) {
        setResultMsg({
          type: 'error',
          text: `Baris ke-${i + 1} (${row.sku}): Stok di BIN ${row.sourceBinCode} tidak mencukupi! Tersedia: ${available} pcs, diminta: ${row.qty} pcs.`,
        });
        return;
      }
    }

    const res = handleMultiItemStockOut({
      transactionNo: transactionNo.trim() || undefined as any,
      type: outboundType,
      sourceWarehouseId,
      destinationOrCustomer: destinationOrCustomer.trim() || 'Customer Eksternal',
      pic: pic.trim() || 'Staff Outbound',
      notes: globalNotes.trim(),
      items: lineItems.map((item) => ({
        sku: item.sku,
        productName: item.productName,
        qty: Number(item.qty),
        sourceBinCode: item.sourceBinCode || defaultBin,
        notes: item.notes,
      })),
    });

    if (res.success) {
      setResultMsg({ type: 'success', text: res.message });
      setTransactionNo('');
      setGlobalNotes('');
      // Reset to 1 fresh row
      setLineItems([
        {
          id: `line-${Date.now()}`,
          sku: products[0]?.sku || '',
          productName: products[0]?.name || '',
          qty: 1,
          sourceBinCode: defaultBin,
          notes: '',
        },
      ]);
    } else {
      setResultMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <ArrowUpFromDot className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Stock Out / Outbound Pengeluaran Barang
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Input Multi-SKU, Scan Barcode, Validasi Stok Fisik Real-time, dan 11 Jenis Transaksi Keluar Resmi PT Duma Kreasi Indonesia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBarcodeModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition"
          >
            <Scan className="w-4 h-4" />
            Scan Barcode (Multi-SKU)
          </button>
          <button
            onClick={() => setActiveTab('log-outbound')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Buku Log Outbound &rarr;
          </button>
        </div>
      </div>

      {/* Lock Stock Alert Warning Banner */}
      {isLocked && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-3 text-amber-900 animate-in fade-in">
          <Lock className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">
              Gudang Sedang Dikunci (LOCK STOCK) untuk Audit Stock Opname!
            </p>
            <p className="mt-0.5 text-amber-800">
              Seluruh transaksi pengeluaran dari gudang ini dibekukan sementara hingga proses Stock Opname selesai disinkronkan dan dibuka kunci oleh PIC audit.
            </p>
          </div>
        </div>
      )}

      {resultMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in duration-200 ${
            resultMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {resultMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <p className="text-xs font-medium">{resultMsg.text}</p>
        </div>
      )}

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Metadata Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Informasi Pengeluaran & Jenis Transaksi Keluar
            </h3>
            <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200">
              11 Pilihan Transaksi Resmi DUMA
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Jenis Transaksi Keluar Dropdown (User Requirement) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jenis Transaksi Keluar <span className="text-rose-500">*</span>
              </label>
              <select
                value={outboundType}
                onChange={(e) => setOutboundType(e.target.value as OutboundType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="SALES_PENJUALAN">Sales / Penjualan</option>
                <option value="RETUR_DEFECT_VENDOR">Retur Defect Dari Vendor</option>
                <option value="TRANSFER_DUMA_PS">Transfer Stock Duma PS</option>
                <option value="TRANSFER_DUMA_PI">Transfer Stock Duma PI</option>
                <option value="PO_WEB">PO Web</option>
                <option value="PO_PI">PO PI</option>
                <option value="PO_PS">PO PS</option>
                <option value="PO_BAZAAR">PO Bazaar</option>
                <option value="PEMINJAMAN">Peminjaman</option>
                <option value="EXCHANGE">Exchange</option>
                <option value="ENDORSE">Endorse</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Tipe: {OUTBOUND_TYPE_LABELS[outboundType] || outboundType}
              </p>
            </div>

            {/* Gudang Asal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gudang Asal Pengeluaran <span className="text-rose-500">*</span>
              </label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name} {isWarehouseLockedForOpname(w.id) ? '(LOCKED 🔒)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* No. Transaksi / SJ Keluar */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                No. Transaksi / Surat Jalan Keluar
              </label>
              <input
                type="text"
                value={transactionNo}
                onChange={(e) => setTransactionNo(e.target.value)}
                placeholder="Contoh: DO-202610-0901"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Tujuan Pengiriman / Customer / Channel */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tujuan / Customer / Toko / Channel
              </label>
              <input
                type="text"
                value={destinationOrCustomer}
                onChange={(e) => setDestinationOrCustomer(e.target.value)}
                placeholder="Nama Pembeli / Cabang / KOL"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Petugas PIC Outbound
              </label>
              <input
                type="text"
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Pengeluaran (Global)
              </label>
              <input
                type="text"
                value={globalNotes}
                onChange={(e) => setGlobalNotes(e.target.value)}
                placeholder="Ekspedisi, no. resi, instruksi handling, dll."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Multi-SKU Items Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                2. Daftar Item SKU Keluar (Multi-SKU Input)
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  {lineItems.length} Baris
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pilih atau scan SKU. Kuantitas akan langsung divalidasi terhadap sisa stok on-hand di BIN terkait.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(true)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
              >
                <Scan className="w-3.5 h-3.5" />
                Scan Tambah Baris
              </button>
              <button
                type="button"
                onClick={() => handleAddRow()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris SKU Manual
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Kode SKU</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Nama Produk / Item</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Lokasi BIN Asal</th>
                  <th className="py-2.5 px-3 w-28 text-center">Stok Tersedia</th>
                  <th className="py-2.5 px-3 w-28 text-center">Qty Keluar</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Catatan Baris</th>
                  <th className="py-2.5 px-3 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {lineItems.map((item, idx) => {
                  const availableQty = getAvailableStock(item.sku, item.sourceBinCode);
                  const isStockSufficient = availableQty >= (Number(item.qty) || 0);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !isStockSufficient ? 'bg-rose-50/50' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>

                      {/* SKU Dropdown */}
                      <td className="py-2 px-3">
                        {products.length > 0 ? (
                          <select
                            value={item.sku}
                            onChange={(e) => handleUpdateRow(item.id, 'sku', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500"
                          >
                            {products.map((p) => (
                              <option key={p.sku} value={p.sku}>
                                {p.sku} - {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={item.sku}
                            onChange={(e) => handleUpdateRow(item.id, 'sku', e.target.value)}
                            placeholder="Kode SKU"
                            className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                          />
                        )}
                      </td>

                      {/* Nama Produk */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleUpdateRow(item.id, 'productName', e.target.value)}
                          placeholder="Nama Item"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </td>

                      {/* BIN Asal */}
                      <td className="py-2 px-3">
                        <select
                          value={item.sourceBinCode}
                          onChange={(e) => handleUpdateRow(item.id, 'sourceBinCode', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                        >
                          {whBins.length > 0 ? (
                            whBins.map((b) => (
                              <option key={b.id} value={b.code}>
                                {b.code} ({b.zone})
                              </option>
                            ))
                          ) : (
                            <option value="BIN-A1-01">BIN-A1-01</option>
                          )}
                        </select>
                      </td>

                      {/* Stok Tersedia On-Hand */}
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-xs ${
                            availableQty === 0
                              ? 'bg-rose-100 text-rose-800'
                              : availableQty <= 10
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {availableQty} Pcs
                        </span>
                      </td>

                      {/* Qty Keluar */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            handleUpdateRow(item.id, 'qty', Math.max(1, parseInt(e.target.value) || 0))
                          }
                          className={`w-24 px-2 py-1.5 text-xs font-bold text-center border rounded-lg focus:ring-1 focus:ring-blue-500 bg-white ${
                            !isStockSufficient ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300'
                          }`}
                        />
                        {!isStockSufficient && (
                          <p className="text-[10px] text-rose-600 font-bold mt-0.5">Kurang!</p>
                        )}
                      </td>

                      {/* Catatan Baris */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleUpdateRow(item.id, 'notes', e.target.value)}
                          placeholder="No. pesanan / catatan"
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </td>

                      {/* Delete */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Summary & Submit */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <span className="font-medium text-slate-600">
                Total Baris: <strong className="text-slate-900">{lineItems.length}</strong>
              </span>
              <span className="font-medium text-slate-600">
                SKU Berbeda: <strong className="text-slate-900">{totalDistinctSkus}</strong>
              </span>
              <span className="font-medium text-slate-600">
                Total Kuantitas Keluar:{' '}
                <strong className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md text-sm">
                  {totalUnits.toLocaleString('id-ID')} Pcs
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddRow()}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
              >
                + Tambah Baris
              </button>
              <button
                type="submit"
                disabled={isLocked}
                className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 ${
                  isLocked
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Simpan & Posting Stock Out ({totalUnits} Pcs)
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onScan={(sku, qty) => handleBarcodeScanned(sku, qty)}
        title="Scan Barcode Produk Keluar (Stock Out)"
        subtitle="Arahkan kamera ke barcode SKU atau tembak scanner USB untuk auto-fill kuantitas"
        targetWarehouseId={sourceWarehouseId}
      />
    </div>
  );
};
