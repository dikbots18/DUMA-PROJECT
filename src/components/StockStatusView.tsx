import React, { useState } from 'react';
import {
  Layers,
  Search,
  Warehouse as WarehouseIcon,
  ArrowRightLeft,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { StockPosition } from '../types/inventory';

export const StockStatusView: React.FC = () => {
  const { stockPositions, products, warehouses, bins, handleRelocateBin, setActiveTab } = useInventory();

  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DEFECT_ONLY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [relocateItem, setRelocateItem] = useState<StockPosition | null>(null);
  const [crossWhSku, setCrossWhSku] = useState<string | null>(null);

  // Relocation modal state
  const [targetBin, setTargetBin] = useState('');
  const [relocQty, setRelocQty] = useState(1);
  const [relocPic, setRelocPic] = useState('Petugas Gudang');
  const [relocNotes, setRelocNotes] = useState('');
  const [relocMsg, setRelocMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter stock positions
  const filteredPositions = stockPositions.filter((pos) => {
    // 1. Warehouse filter
    if (selectedWarehouse !== 'ALL' && pos.warehouseId !== selectedWarehouse) {
      return false;
    }

    // 2. Search query (SKU, BIN, Name)
    const prod = products.find((p) => p.sku === pos.sku);
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchSearch =
        pos.sku.toLowerCase().includes(q) ||
        pos.binCode.toLowerCase().includes(q) ||
        (prod && prod.name.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    // 3. Stock status filter ('in stock', 'low stock', 'out of stock', defect)
    if (selectedStatus !== 'ALL') {
      const available = pos.qtyOnHand - pos.qtyReserved;
      const minAlert = prod?.minStockAlert || 10;
      if (selectedStatus === 'OUT_OF_STOCK' && pos.qtyOnHand !== 0) return false;
      if (selectedStatus === 'LOW_STOCK' && (pos.qtyOnHand === 0 || pos.qtyOnHand > minAlert)) return false;
      if (selectedStatus === 'IN_STOCK' && (pos.qtyOnHand <= minAlert || available <= 0)) return false;
      if (selectedStatus === 'DEFECT_ONLY' && pos.qtyDefect <= 0) return false;
    }

    return true;
  });

  // Calculate totals
  const totalOnHand = filteredPositions.reduce((acc, p) => acc + p.qtyOnHand, 0);
  const totalReserved = filteredPositions.reduce((acc, p) => acc + p.qtyReserved, 0);
  const totalDefect = filteredPositions.reduce((acc, p) => acc + p.qtyDefect, 0);
  const totalAvailable = totalOnHand - totalReserved;

  const handleOpenRelocate = (pos: StockPosition) => {
    setRelocateItem(pos);
    const availableBins = bins.filter(
      (b) => b.warehouseId === pos.warehouseId && b.code !== pos.binCode
    );
    setTargetBin(availableBins[0]?.code || 'BIN-A1-02');
    setRelocQty(1);
    setRelocNotes('');
    setRelocMsg(null);
  };

  const handleExecuteRelocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relocateItem) return;

    const res = handleRelocateBin({
      sku: relocateItem.sku,
      qty: Number(relocQty),
      warehouseId: relocateItem.warehouseId,
      fromBinCode: relocateItem.binCode,
      toBinCode: targetBin,
      pic: relocPic,
      notes: relocNotes,
    });

    if (res.success) {
      setRelocMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        setRelocateItem(null);
      }, 1400);
    } else {
      setRelocMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Status Stock & Lokasi BIN</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelacakan real-time lokasi barang pada BIN rak, stok cadangan, barang defect, dan mutasi antar BIN
          </p>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Stok Fisik (On-Hand)
          </span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {totalOnHand.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">Pcs</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Stok Siap Jual (Available)
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">
            {totalAvailable.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">Pcs</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Terpesan (Pre-Order / Hold)
          </span>
          <p className="text-2xl font-extrabold text-purple-600 mt-1">
            {totalReserved.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">Pcs</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Karantina Defect QC
          </span>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">
            {totalDefect.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">Pcs</span>
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari SKU, Nama Barang, atau Kode BIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-medium text-slate-700"
            >
              <option value="ALL">Semua Lokasi Gudang</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
            >
              <option value="ALL">Semua Status Stok</option>
              <option value="IN_STOCK">🟢 In Stock (Siap Jual)</option>
              <option value="LOW_STOCK">🟠 Low Stock (Menipis)</option>
              <option value="OUT_OF_STOCK">🔴 Out of Stock (Habis = 0)</option>
              <option value="DEFECT_ONLY">⚠️ Karantina Defect</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3">Kode BIN</th>
                <th className="px-4 py-3">Kode SKU</th>
                <th className="px-4 py-3">Nama Produk</th>
                <th className="px-4 py-3 text-center">Stok Fisik</th>
                <th className="px-4 py-3 text-center">Terpesan (PO)</th>
                <th className="px-4 py-3 text-center">Defect</th>
                <th className="px-4 py-3 text-center">Siap Jual</th>
                <th className="px-4 py-3 text-right">Aksi Relokasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 space-y-2">
                    <p className="font-semibold text-slate-600 text-sm">
                      {stockPositions.length === 0
                        ? 'Belum ada stok barang yang terdaftar di lokasi rak BIN (PT Duma Kreasi Indonesia).'
                        : 'Tidak ada posisi stok yang cocok dengan kriteria filter & pencarian.'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Gunakan menu Stock In untuk mencatat barang masuk atau buat SKU baru terlebih dahulu.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => setActiveTab('inbound')}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
                      >
                        <span>+ Input Stock In Barang</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPositions.map((pos) => {
                  const wh = warehouses.find((w) => w.id === pos.warehouseId);
                  const prod = products.find((p) => p.sku === pos.sku);
                  const available = pos.qtyOnHand - pos.qtyReserved;
                  const isDefectBin = pos.binCode.includes('DEF');

                  return (
                    <tr
                      key={pos.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isDefectBin ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <WarehouseIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{wh?.name || pos.warehouseId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            isDefectBin
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {pos.binCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{pos.sku}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-medium text-slate-900">{prod?.name || '-'}</span>
                        <div className="text-[10px] text-slate-400">{prod?.category}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">
                        {pos.qtyOnHand}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-purple-700">
                        {pos.qtyReserved > 0 ? pos.qtyReserved : '-'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-rose-600">
                        {pos.qtyDefect > 0 ? pos.qtyDefect : '-'}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">
                        {available}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenRelocate(pos)}
                          disabled={available <= 0}
                          className="px-2.5 py-1 inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none text-slate-700 rounded font-semibold text-[11px] transition"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                          <span>Pindah BIN</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relocation Modal */}
      {relocateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Relokasi / Pindah Rak BIN</h3>
              </div>
              <button
                onClick={() => setRelocateItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteRelocation} className="p-5 space-y-4">
              {relocMsg && (
                <div
                  className={`p-3 text-xs rounded-lg flex items-center gap-2 ${
                    relocMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {relocMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{relocMsg.text}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU Barang:</span>
                  <span className="font-mono font-bold text-slate-900">{relocateItem.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">BIN Asal:</span>
                  <span className="font-mono font-bold text-blue-700">{relocateItem.binCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stok Tersedia di BIN Asal:</span>
                  <span className="font-bold text-emerald-700">
                    {relocateItem.qtyOnHand - relocateItem.qtyReserved} Pcs
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih BIN Tujuan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BIN-A1-02 atau BIN-B2-01"
                  value={targetBin}
                  onChange={(e) => setTargetBin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Qty yang Dipindahkan *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={relocateItem.qtyOnHand - relocateItem.qtyReserved}
                    value={relocQty}
                    onChange={(e) => setRelocQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Petugas (PIC) *
                  </label>
                  <input
                    type="text"
                    required
                    value={relocPic}
                    onChange={(e) => setRelocPic(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan / Catatan Pemindahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Pemindahan ke rak dekat jalur packing harian"
                  value={relocNotes}
                  onChange={(e) => setRelocNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRelocateItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  Konfirmasi Pindah BIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
