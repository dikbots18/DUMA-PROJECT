import React, { useState } from 'react';
import {
  ArrowDownToDot,
  Scan,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ClockAlert,
  ArrowRightLeft,
  Building,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { InboundType, INBOUND_TYPE_LABELS, InboundLineItem } from '../types/inventory';
import { BarcodeScannerModal } from './BarcodeScannerModal';

export const InboundView: React.FC = () => {
  const {
    products,
    warehouses,
    bins,
    suppliers,
    stockPositions,
    preOrders,
    handleMultiItemStockIn,
    inbounds,
    setActiveTab,
  } = useInventory();

  // Header form states
  const [inboundType, setInboundType] = useState<InboundType>('PEMBELIAN_VENDOR');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[0]?.id || '');
  const [sourceOrVendor, setSourceOrVendor] = useState(suppliers[0]?.name || '');
  const [pic, setPic] = useState('Staff Gudang Inbound');
  const [globalNotes, setGlobalNotes] = useState('');
  const [autoAllocatePreOrder, setAutoAllocatePreOrder] = useState(true);

  // Multi-item rows
  const [lineItems, setLineItems] = useState<InboundLineItem[]>([
    {
      id: `line-${Date.now()}-1`,
      sku: products[0]?.sku || '',
      productName: products[0]?.name || '',
      qty: 50,
      targetBinCode: 'BIN-A1-01',
      notes: '',
    },
  ]);

  // Barcode Scanner Modal State
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Status/Result notification
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter available bins for the selected warehouse
  const whBins = bins.filter((b) => b.warehouseId === targetWarehouseId);
  const defaultBin = whBins[0]?.code || 'BIN-A1-01';

  // Add a new blank row
  const handleAddRow = (prefilledSku?: string, prefilledQty = 1) => {
    const skuToUse = prefilledSku || products[0]?.sku || '';
    const prod = products.find((p) => p.sku === skuToUse);
    const newLine: InboundLineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sku: skuToUse,
      productName: prod?.name || skuToUse,
      qty: prefilledQty,
      targetBinCode: defaultBin,
      notes: '',
    };
    setLineItems((prev) => [...prev, newLine]);
  };

  // Remove a row
  const handleRemoveRow = (id: string) => {
    if (lineItems.length === 1) {
      setResultMsg({ type: 'error', text: 'Minimal harus ada 1 baris item dalam transaksi!' });
      return;
    }
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update a row
  const handleUpdateRow = (id: string, field: keyof InboundLineItem, value: any) => {
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

  // Handle scanned barcode from modal
  const handleBarcodeScanned = (scannedSku: string, countQty = 1) => {
    const prod = products.find((p) => p.sku.toUpperCase() === scannedSku.toUpperCase());
    const validSku = prod ? prod.sku : scannedSku;

    // Check if this SKU already exists in our table
    const existingIndex = lineItems.findIndex(
      (item) => item.sku.toUpperCase() === validSku.toUpperCase()
    );

    if (existingIndex >= 0) {
      // Increment quantity
      setLineItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, qty: item.qty + countQty }
            : item
        )
      );
    } else {
      // Add new row with scanned SKU
      handleAddRow(validSku, countQty);
    }
  };

  // Total summary calculations
  const totalUnits = lineItems.reduce((acc, row) => acc + (Number(row.qty) || 0), 0);
  const totalDistinctSkus = new Set(lineItems.map((r) => r.sku).filter(Boolean)).size;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResultMsg(null);

    // Validation
    if (lineItems.length === 0) {
      setResultMsg({ type: 'error', text: 'Tambahkan setidaknya 1 baris item SKU!' });
      return;
    }

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
    }

    const res = handleMultiItemStockIn({
      invoiceNo: invoiceNo.trim() || undefined as any,
      type: inboundType,
      targetWarehouseId,
      sourceOrVendor: sourceOrVendor.trim() || 'Internal Gudang',
      pic: pic.trim() || 'Staff Inbound',
      notes: globalNotes.trim(),
      autoAllocatePreOrders: autoAllocatePreOrder,
      items: lineItems.map((item) => ({
        sku: item.sku,
        productName: item.productName,
        qty: Number(item.qty),
        targetBinCode: item.targetBinCode || defaultBin,
        notes: item.notes,
      })),
    });

    if (res.success) {
      setResultMsg({ type: 'success', text: res.message });
      setInvoiceNo('');
      setGlobalNotes('');
      // Reset to 1 fresh row
      setLineItems([
        {
          id: `line-${Date.now()}`,
          sku: products[0]?.sku || '',
          productName: products[0]?.name || '',
          qty: 10,
          targetBinCode: defaultBin,
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
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <ArrowDownToDot className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Stock In / Inbound Penerimaan Barang
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mendukung Input Multi-SKU, Scan Barcode Cepat (Kamera/Scanner USB), dan 5 Jenis Transaksi Masuk Resmi PT Duma Kreasi Indonesia.
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
            onClick={() => setActiveTab('log-inbound')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Buku Log Inbound &rarr;
          </button>
        </div>
      </div>

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
              1. Informasi Dokumen & Jenis Transaksi Masuk
            </h3>
            <span className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">
              Dropdown Jenis Transaksi Resmi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Jenis Transaksi Dropdown (User Requirement) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jenis Transaksi Masuk <span className="text-rose-500">*</span>
              </label>
              <select
                value={inboundType}
                onChange={(e) => setInboundType(e.target.value as InboundType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="PEMBELIAN_VENDOR">Pembelian Dari Vendor</option>
                <option value="RETUR_DEFECT">Retur Defect</option>
                <option value="RETUR_PEMINJAMAN">Retur Peminjaman</option>
                <option value="TRANSFER_GUDANG_LAIN">Transfer Dari Gudang Lain</option>
                <option value="LABELING">Labeling</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Tipe: {INBOUND_TYPE_LABELS[inboundType] || inboundType}
              </p>
            </div>

            {/* Gudang Tujuan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gudang Tujuan Masuk <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* No. Dokumen / Surat Jalan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                No. Faktur / Surat Jalan (SJ)
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Contoh: SJ-202610-8809"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Asal Barang / Vendor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Asal Barang / Vendor / Mitra
              </label>
              <input
                type="text"
                value={sourceOrVendor}
                onChange={(e) => setSourceOrVendor(e.target.value)}
                placeholder="Nama Vendor / Ekspedisi"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Petugas PIC Inbound
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
                Catatan Penerimaan (Global)
              </label>
              <input
                type="text"
                value={globalNotes}
                onChange={(e) => setGlobalNotes(e.target.value)}
                placeholder="Kondisi kemasan, nomor polisi armada, dll."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAllocatePreOrder}
                onChange={(e) => setAutoAllocatePreOrder(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 font-medium">
                Alokasikan stok masuk secara otomatis ke antrean pesanan Pre-Order (FIFO) jika ada permintaan tertunda.
              </span>
            </label>
          </div>
        </div>

        {/* Multi-SKU Items Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                2. Daftar Item SKU Masuk (Multi-SKU Input)
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {lineItems.length} Baris
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bisa menambahkan lebih dari 1 SKU sekaligus dalam 1 nomor surat jalan / faktur.
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
                  <th className="py-2.5 px-3 w-28 text-center">Qty Masuk</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Lokasi BIN Target</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Catatan Baris</th>
                  <th className="py-2.5 px-3 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {lineItems.map((item, idx) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>

                      {/* SKU Input / Dropdown */}
                      <td className="py-2 px-3">
                        {products.length > 0 ? (
                          <div className="space-y-1">
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
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={item.sku}
                            onChange={(e) => handleUpdateRow(item.id, 'sku', e.target.value)}
                            placeholder="Input Kode SKU"
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
                          placeholder="Nama Item Produk"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </td>

                      {/* Qty Masuk */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            handleUpdateRow(item.id, 'qty', Math.max(1, parseInt(e.target.value) || 0))
                          }
                          className="w-24 px-2 py-1.5 text-xs font-bold text-center border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </td>

                      {/* BIN Target */}
                      <td className="py-2 px-3">
                        <select
                          value={item.targetBinCode}
                          onChange={(e) => handleUpdateRow(item.id, 'targetBinCode', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                        >
                          {whBins.length > 0 ? (
                            whBins.map((b) => (
                              <option key={b.id} value={b.code}>
                                {b.code} ({b.zone})
                              </option>
                            ))
                          ) : (
                            <option value="BIN-A1-01">BIN-A1-01 (Default)</option>
                          )}
                        </select>
                      </td>

                      {/* Catatan Baris */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleUpdateRow(item.id, 'notes', e.target.value)}
                          placeholder="Batch / lot / info baris"
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
                Total Kuantitas Masuk:{' '}
                <strong className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-sm">
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
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Simpan & Posting Stock In ({totalUnits} Pcs)
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Barcode Scanner Modal Component */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onScan={(sku, qty) => handleBarcodeScanned(sku, qty)}
        title="Scan Barcode Produk Masuk (Stock In)"
        subtitle="Arahkan kamera ke barcode SKU atau gunakan barcode scanner fisik USB / Bluetooth"
        targetWarehouseId={targetWarehouseId}
      />
    </div>
  );
};
