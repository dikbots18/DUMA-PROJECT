import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  ClipboardList,
  Scan,
  CheckCircle2,
  AlertTriangle,
  History,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { StockOpnameSession, StockOpnameItem } from '../types/inventory';
import { BarcodeScannerModal } from './BarcodeScannerModal';

export const StockOpnameView: React.FC = () => {
  const {
    stockOpnames,
    warehouses,
    startStockOpname,
    recordOpnamePhysicalCount,
    finalizeAndUnlockStockOpname,
    cancelStockOpname,
    isWarehouseLockedForOpname,
  } = useInventory();

  // Active session selection
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    const active = stockOpnames.find((s) => s.status === 'LOCKED_COUNTING');
    return active ? active.id : stockOpnames[0]?.id || '';
  });

  // Start Opname Form States
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>(warehouses[0]?.id || '');
  const [lockedByPic, setLockedByPic] = useState<string>('Auditor Internal DUMA');
  const [sessionNotes, setSessionNotes] = useState<string>('');

  // Search & Filter within session items
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [itemStatusFilter, setItemStatusFilter] = useState<'ALL' | 'UNCOUNTED' | 'DISCREPANCY' | 'MATCH'>('ALL');

  // Barcode Scanner Modal
  const [isBarcodeOpen, setIsBarcodeOpen] = useState<boolean>(false);

  // Finalize Approval Modal
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState<boolean>(false);
  const [approverPic, setApproverPic] = useState<string>('Manager Operasional Gudang');
  const [finalizeNotes, setFinalizeNotes] = useState<string>('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Find active or selected session
  const currentSession = stockOpnames.find((s) => s.id === selectedSessionId) || stockOpnames[0];

  // Start new opname session
  const handleStartOpname = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    const res = startStockOpname(targetWarehouseId, lockedByPic, sessionNotes);
    if (res.success && res.sessionId) {
      setSelectedSessionId(res.sessionId);
      setFeedbackMsg({ type: 'success', message: res.message });
      setSessionNotes('');
    } else {
      setFeedbackMsg({ type: 'error', message: res.message });
    }
  };

  // Record physical count for item
  const handlePhysicalCountChange = (sku: string, binCode: string, countQty: number) => {
    if (!currentSession || currentSession.status !== 'LOCKED_COUNTING') return;
    recordOpnamePhysicalCount(currentSession.id, sku, binCode, countQty);
  };

  // Barcode scanned in opname
  const handleBarcodeScanned = (scannedSku: string, countQty = 1) => {
    if (!currentSession || currentSession.status !== 'LOCKED_COUNTING') return;

    const targetItem = currentSession.items.find(
      (i) => i.sku.toUpperCase() === scannedSku.toUpperCase()
    );

    if (targetItem) {
      const currentPhysical = targetItem.physicalCountQty ?? 0;
      recordOpnamePhysicalCount(
        currentSession.id,
        targetItem.sku,
        targetItem.binCode,
        currentPhysical + countQty
      );
      setFeedbackMsg({
        type: 'success',
        message: `Barcode [${targetItem.sku}] terpindai! Jumlah fisik diperbarui menjadi ${currentPhysical + countQty} pcs.`,
      });
    } else {
      setFeedbackMsg({
        type: 'error',
        message: `SKU [${scannedSku}] tidak ada dalam daftar snapshot sesi audit ini!`,
      });
    }
  };

  // Finalize & Unlock
  const handleFinalizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    setFeedbackMsg(null);

    const res = finalizeAndUnlockStockOpname(currentSession.id, approverPic, finalizeNotes);
    if (res.success) {
      setFeedbackMsg({ type: 'success', message: res.message });
      setIsFinalizeModalOpen(false);
    } else {
      setFeedbackMsg({ type: 'error', message: res.message });
    }
  };

  // Cancel Opname
  const handleCancel = () => {
    if (!currentSession) return;
    if (
      window.confirm(
        `Apakah Anda yakin ingin membatalkan Stock Opname [${currentSession.sessionCode}]? Kunci stok akan dilepas tanpa mengubah saldo fisik.`
      )
    ) {
      cancelStockOpname(currentSession.id, 'Petugas Pembatalan');
      setFeedbackMsg({
        type: 'success',
        message: `Stock Opname [${currentSession.sessionCode}] dibatalkan dan kunci stok gudang dibuka kembali.`,
      });
    }
  };

  // Filter session items
  const filteredItems = (currentSession?.items || []).filter((item) => {
    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.toLowerCase();
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchName = item.productName.toLowerCase().includes(q);
      const matchBin = item.binCode.toLowerCase().includes(q);
      if (!matchSku && !matchName && !matchBin) return false;
    }

    if (itemStatusFilter === 'UNCOUNTED' && item.varianceStatus !== 'UNCOUNTED') return false;
    if (itemStatusFilter === 'MATCH' && item.varianceStatus !== 'MATCH') return false;
    if (
      itemStatusFilter === 'DISCREPANCY' &&
      item.varianceStatus !== 'SURPLUS' &&
      item.varianceStatus !== 'DEFICIT'
    )
      return false;

    return true;
  });

  const countedItemsCount = (currentSession?.items || []).filter(
    (i) => i.physicalCountQty !== null
  ).length;
  const uncountedItemsCount = (currentSession?.items || []).length - countedItemsCount;

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Stock Opname (Sistem Lock Stock Saldo Terakhir)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fitur Audit Fisik Barang dengan sistem penguncian stok (Lock Stock) dari saldo terakhir, hitung fisik dengan Barcode Scanner, deteksi selisih surplus/defisit, dan sinkronisasi saldo otomatis saat dibuka kunci.
          </p>
        </div>

        {currentSession && currentSession.status === 'LOCKED_COUNTING' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBarcodeOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition"
            >
              <Scan className="w-4 h-4" />
              Scan Barcode Hitung Fisik
            </button>
            <button
              onClick={() => setIsFinalizeModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition"
            >
              <Unlock className="w-4 h-4" />
              Selesai & Buka Kunci (Unlock)
            </button>
          </div>
        )}
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <p className="text-xs font-medium">{feedbackMsg.message}</p>
        </div>
      )}

      {/* Top Action & Lock Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create / Start Opname Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              Mulai Sesi Stock Opname Baru
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Lock Stock System
            </span>
          </div>

          <form onSubmit={handleStartOpname} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Gudang Yang Akan Diaudit <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {warehouses.map((w) => {
                  const locked = isWarehouseLockedForOpname(w.id);
                  return (
                    <option key={w.id} value={w.id} disabled={locked}>
                      {w.code} - {w.name} {locked ? '(Sedang Dikunci 🔒)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama PIC Auditor / Penanggung Jawab <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={lockedByPic}
                onChange={(e) => setLockedByPic(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan / Alasan Audit
              </label>
              <input
                type="text"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Contoh: Audit Tutup Buku Akhir Bulan"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition"
              >
                <Lock className="w-4 h-4" />
                Mulai Opname & Kunci Stok (Lock Stock)
              </button>
            </div>
          </form>
        </div>

        {/* Active Session Status & Summary (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Status Sesi Stock Opname Aktif
                </span>
                {currentSession && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      currentSession.status === 'LOCKED_COUNTING'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : currentSession.status === 'ADJUSTED_COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {currentSession.status === 'LOCKED_COUNTING' && (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                        STOK TERKUNCI (SEDANG HITUNG)
                      </>
                    )}
                    {currentSession.status === 'ADJUSTED_COMPLETED' && (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        SELESAI & SUDAH SINKRON (UNLOCKED)
                      </>
                    )}
                    {currentSession.status === 'CANCELLED' && 'DIBATALKAN'}
                  </span>
                )}
              </div>

              {/* Selector if multiple sessions exist */}
              {stockOpnames.length > 1 && (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {stockOpnames.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sessionCode} - {s.warehouseName} ({s.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {currentSession ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Gudang Audit</p>
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {currentSession.warehouseName}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">PIC: {currentSession.lockedByPic}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Snapshot Sistem</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {currentSession.totalSystemQty.toLocaleString('id-ID')} Pcs
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {currentSession.totalSkus} SKU Terkunci
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-700 uppercase">Hasil Hitung Fisik</p>
                  <p className="text-base font-bold text-blue-900 mt-0.5">
                    {currentSession.totalPhysicalQty.toLocaleString('id-ID')} Pcs
                  </p>
                  <p className="text-[10px] text-blue-600 mt-1">
                    {countedItemsCount} / {currentSession.totalSkus} SKU Dihitung
                  </p>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    currentSession.totalVarianceQty === 0
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
                      : currentSession.totalVarianceQty > 0
                      ? 'bg-indigo-50 border-indigo-100 text-indigo-900'
                      : 'bg-rose-50 border-rose-100 text-rose-900'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase">Total Selisih Fisik</p>
                  <p className="text-base font-bold mt-0.5">
                    {currentSession.totalVarianceQty > 0 ? '+' : ''}
                    {currentSession.totalVarianceQty.toLocaleString('id-ID')} Pcs
                  </p>
                  <p className="text-[10px] opacity-80 mt-1">
                    Nilai: Rp {currentSession.totalVarianceValue.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                Belum ada sesi Stock Opname yang pernah dijalankan. Mulai sesi audit pada form sebelah kiri.
              </p>
            )}
          </div>

          {currentSession && currentSession.status === 'LOCKED_COUNTING' && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md font-medium border border-amber-200">
                ⚠️ Transaksi pengeluaran dari gudang ini diblokir sementara agar saldo fisik tidak berubah saat dihitung.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-semibold rounded-lg transition"
                >
                  Batalkan Audit
                </button>
                <button
                  type="button"
                  onClick={() => setIsBarcodeOpen(true)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
                >
                  <Scan className="w-3.5 h-3.5" />
                  Scan Barcode
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Opname Items Count Sheet */}
      {currentSession && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Header Filter & Search */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                placeholder="Cari SKU, nama produk, atau BIN..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-500 font-medium">Filter Baris:</span>
              <button
                onClick={() => setItemStatusFilter('ALL')}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                  itemStatusFilter === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border text-slate-700 hover:bg-slate-100'
                }`}
              >
                Semua ({currentSession.items.length})
              </button>
              <button
                onClick={() => setItemStatusFilter('UNCOUNTED')}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                  itemStatusFilter === 'UNCOUNTED'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border text-amber-800 hover:bg-amber-50'
                }`}
              >
                Belum Dihitung ({uncountedItemsCount})
              </button>
              <button
                onClick={() => setItemStatusFilter('DISCREPANCY')}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                  itemStatusFilter === 'DISCREPANCY'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white border text-rose-800 hover:bg-rose-50'
                }`}
              >
                Ada Selisih
              </button>
              <button
                onClick={() => setItemStatusFilter('MATCH')}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                  itemStatusFilter === 'MATCH'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                Cocok (Match)
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Kode SKU</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Nama Produk</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Lokasi BIN</th>
                  <th className="py-2.5 px-3 w-32 text-center">
                    Stok Sistem Terkunci (Lock Snapshot)
                  </th>
                  <th className="py-2.5 px-3 w-36 text-center">
                    Hitung Fisik (Physical Count)
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center">Selisih (Variance)</th>
                  <th className="py-2.5 px-3 w-28 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Nilai Selisih (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredItems.map((item, idx) => {
                  const isCounting = currentSession.status === 'LOCKED_COUNTING';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.varianceStatus === 'SURPLUS'
                          ? 'bg-blue-50/30'
                          : item.varianceStatus === 'DEFICIT'
                          ? 'bg-rose-50/30'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        {item.sku}
                      </td>

                      <td className="py-2.5 px-3 font-medium">
                        {item.productName}
                        {item.scannedAt && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Scanned: {new Date(item.scannedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {item.binCode}
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold text-slate-700 bg-slate-50/60">
                        {item.systemQtySnapshot} Pcs
                      </td>

                      {/* Physical count input */}
                      <td className="py-2.5 px-3 text-center">
                        {isCounting ? (
                          <input
                            type="number"
                            min={0}
                            placeholder="Hitung..."
                            value={item.physicalCountQty ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseInt(e.target.value) || 0;
                              if (val !== null) {
                                handlePhysicalCountChange(item.sku, item.binCode, val);
                              }
                            }}
                            className={`w-24 px-2 py-1 text-xs font-bold text-center border rounded-lg focus:ring-1 focus:ring-blue-500 bg-white ${
                              item.physicalCountQty === null
                                ? 'border-amber-300 bg-amber-50/50'
                                : 'border-slate-300'
                            }`}
                          />
                        ) : (
                          <span className="font-bold text-slate-900">
                            {item.physicalCountQty ?? '-'} Pcs
                          </span>
                        )}
                      </td>

                      {/* Variance */}
                      <td className="py-2.5 px-3 text-center font-bold">
                        {item.physicalCountQty === null ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span
                            className={
                              item.varianceQty > 0
                                ? 'text-indigo-600'
                                : item.varianceQty < 0
                                ? 'text-rose-600'
                                : 'text-emerald-600'
                            }
                          >
                            {item.varianceQty > 0 ? `+${item.varianceQty}` : item.varianceQty} Pcs
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {item.varianceStatus === 'MATCH' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Cocok &check;
                          </span>
                        )}
                        {item.varianceStatus === 'SURPLUS' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            Surplus (+)
                          </span>
                        )}
                        {item.varianceStatus === 'DEFICIT' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Defisit (-)
                          </span>
                        )}
                        {item.varianceStatus === 'UNCOUNTED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Belum Hitung
                          </span>
                        )}
                      </td>

                      {/* Variance value */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        {item.varianceValue !== 0 ? (
                          <span
                            className={
                              item.varianceValue > 0 ? 'text-indigo-600' : 'text-rose-600'
                            }
                          >
                            {item.varianceValue > 0 ? '+' : ''}
                            Rp {item.varianceValue.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-slate-400">Rp 0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for Physical Counting */}
      <BarcodeScannerModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        onScan={(sku, qty) => handleBarcodeScanned(sku, qty)}
        title="Scan Barcode Hitung Fisik Stock Opname"
        subtitle="Setiap scan barcode akan menambahkan kuantitas hitung fisik SKU secara otomatis"
        targetWarehouseId={currentSession?.warehouseId}
      />

      {/* Modal Finalize & Unlock Stock Opname */}
      {isFinalizeModalOpen && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Unlock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Konfirmasi Selesai & Buka Kunci Stok (Unlock)
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Sesi: {currentSession.sessionCode} &bull; Gudang: {currentSession.warehouseName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFinalizeModalOpen(false)}
                className="p-1 text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFinalizeSubmit} className="p-5 space-y-4">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Pemberitahuan Sinkronisasi Saldo Fisik:
                </p>
                <p className="text-[11px] text-emerald-800">
                  Setelah disetujui, saldo sistem pada gudang ini akan langsung disesuaikan dengan hasil hitung fisik. Kunci stok gudang akan otomatis dilepas sehingga transaksi pengeluaran dan mutasi dapat beroperasi kembali secara normal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-500">Total Dihitung:</span>
                  <p className="font-bold text-slate-800">
                    {countedItemsCount} dari {currentSession.totalSkus} SKU
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Total Selisih Bersih:</span>
                  <p className="font-bold text-slate-800">
                    {currentSession.totalVarianceQty > 0 ? '+' : ''}
                    {currentSession.totalVarianceQty} Pcs (Rp{' '}
                    {currentSession.totalVarianceValue.toLocaleString('id-ID')})
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama PIC Supervisor / Approver <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={approverPic}
                  onChange={(e) => setApproverPic(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Persetujuan & Penyesuaian
                </label>
                <textarea
                  rows={2}
                  value={finalizeNotes}
                  onChange={(e) => setFinalizeNotes(e.target.value)}
                  placeholder="Catatan hasil audit fisik, tindak lanjut selisih, dll."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFinalizeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Setujui, Sinkron Stok & Buka Kunci
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
