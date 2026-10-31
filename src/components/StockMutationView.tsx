import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Search,
  Download,
  Printer,
  Calendar,
  Building,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { calculateSkuMutationLedger } from '../utils/inventoryCalculations';

export const StockMutationView: React.FC = () => {
  const { products, stockPositions, inbounds, outbounds, warehouses } = useInventory();

  const [selectedSku, setSelectedSku] = useState(products[0]?.sku || '');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('ALL');

  const selectedProduct = products.find((p) => p.sku === selectedSku);

  // Calculate full mutation ledger for this SKU
  const mutationData = calculateSkuMutationLedger(
    selectedSku,
    stockPositions,
    inbounds,
    outbounds
  );

  // Optional warehouse filter on records
  const filteredRecords = mutationData.records.filter((rec) => {
    if (selectedWarehouseFilter === 'ALL') return true;
    return rec.warehouseId === selectedWarehouseFilter;
  });

  const openingStock =
    mutationData.records.length > 0
      ? mutationData.records[0].runningBalance -
        mutationData.records[0].qtyIn +
        mutationData.records[0].qtyOut
      : mutationData.currentStock;

  const exportCSV = () => {
    const headers = [
      'Tanggal & Waktu',
      'No Referensi',
      'Arah Mutasi',
      'Sub Tipe',
      'Gudang',
      'Lokasi BIN',
      'Pihak Terkait / Rekanan',
      'Masuk (+)',
      'Keluar (-)',
      'Saldo Akhir Berjalan',
      'Petugas PIC',
      'Catatan',
    ];

    const rows = filteredRecords.map((r) => [
      `"${new Date(r.timestamp).toLocaleString('id-ID')}"`,
      r.referenceNo,
      r.type,
      r.subType,
      r.warehouseId,
      r.binCode,
      `"${r.sourceOrDestination.replace(/"/g, '""')}"`,
      r.qtyIn,
      r.qtyOut,
      r.runningBalance,
      `"${r.pic}"`,
      `"${r.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kartu_Mutasi_SKU_${selectedSku}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mutasi Semua Stock (Buku Besar SKU)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit saldo awal, arus masuk (+), arus keluar (-), dan running balance kronologis per SKU
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kartu Stok</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* SKU Selector & Filter Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Pilih SKU Barang untuk Melihat Riwayat Mutasi:
          </label>
          <select
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>
                [{p.sku}] - {p.name} ({p.category})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Filter Gudang Spesifik:
          </label>
          <select
            value={selectedWarehouseFilter}
            onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">Semua Gudang Terhubung</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger KPI Cards for Selected SKU */}
      {selectedProduct && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Saldo Stok Awal
            </span>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">
              {openingStock} <span className="text-xs font-normal text-slate-500">{selectedProduct.unit}</span>
            </p>
            <span className="text-[10px] text-slate-400">Sebelum transaksi tercatat</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Masuk (+)
            </span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              +{mutationData.totalIn} <span className="text-xs font-normal text-slate-500">{selectedProduct.unit}</span>
            </p>
            <span className="text-[10px] text-slate-400">Inbound PO, retur & transfer in</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Keluar (-)
            </span>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">
              -{mutationData.totalOut} <span className="text-xs font-normal text-slate-500">{selectedProduct.unit}</span>
            </p>
            <span className="text-[10px] text-slate-400">Penjualan harian & transfer out</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
              Sisa Saldo Berjalan (On-Hand)
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {mutationData.currentStock} <span className="text-xs font-bold text-blue-700">{selectedProduct.unit}</span>
            </p>
            <span className="text-[10px] text-emerald-700 font-semibold">
              Kondisi Fisik Terverifikasi
            </span>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Kartu Mutasi & Audit Trail: [{selectedSku}] - {selectedProduct?.name}
            </h3>
          </div>
          <span className="text-xs text-slate-500">{filteredRecords.length} Baris Pergerakan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Tanggal & Jam</th>
                <th className="px-4 py-3">No. Referensi Dokumen</th>
                <th className="px-4 py-3">Tipe Mutasi</th>
                <th className="px-4 py-3">Lokasi Gudang & BIN</th>
                <th className="px-4 py-3">Pihak Rekanan / Tujuan</th>
                <th className="px-4 py-3 text-center">Masuk (+)</th>
                <th className="px-4 py-3 text-center">Keluar (-)</th>
                <th className="px-4 py-3 text-center bg-slate-100/60 font-bold">
                  Saldo Berjalan
                </th>
                <th className="px-4 py-3">Petugas & Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Belum ada pergerakan stok untuk SKU ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isIn = rec.type === 'INBOUND';
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {new Date(rec.timestamp).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(rec.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {rec.referenceNo}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isIn
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isIn ? (
                            <ArrowDownRight className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          <span>{rec.subType}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{rec.warehouseId}</div>
                        <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1 rounded">
                          {rec.binCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium truncate max-w-xs">{rec.sourceOrDestination}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">
                        {rec.qtyIn > 0 ? `+${rec.qtyIn}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">
                        {rec.qtyOut > 0 ? `-${rec.qtyOut}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center font-extrabold text-slate-900 bg-slate-50 font-mono text-[13px]">
                        {rec.runningBalance}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-semibold text-slate-800">{rec.pic}</div>
                        <div className="text-[10px] text-slate-400 italic truncate max-w-xs">
                          {rec.notes}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
