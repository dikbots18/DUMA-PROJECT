import React, { useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  ArrowDownToDot,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { INBOUND_TYPE_LABELS } from '../types/inventory';

export const LogInboundView: React.FC = () => {
  const { inbounds, warehouses, setActiveTab } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredLogs = inbounds.filter((log) => {
    const matchType = selectedType === 'ALL' || log.type === selectedType;
    const matchWh = selectedWarehouse === 'ALL' || log.targetWarehouseId === selectedWarehouse;
    const matchSearch =
      log.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.sourceOrVendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.pic.toLowerCase().includes(searchQuery.toLowerCase());

    // Date range filter
    let matchDate = true;
    const logTime = new Date(log.timestamp).getTime();
    if (startDate) {
      const s = new Date(startDate).setHours(0, 0, 0, 0);
      if (logTime < s) matchDate = false;
    }
    if (endDate) {
      const e = new Date(endDate).setHours(23, 59, 59, 999);
      if (logTime > e) matchDate = false;
    }

    return matchType && matchWh && matchSearch && matchDate;
  });

  const setPresetDate = (days: number) => {
    if (days === 0) {
      // Today
      const todayStr = new Date().toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (days === -1) {
      // Clear
      setStartDate('');
      setEndDate('');
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    }
  };

  const exportCSV = () => {
    const headers = [
      'Waktu',
      'No Referensi',
      'Jenis Inbound',
      'SKU',
      'Nama Barang',
      'Qty Masuk',
      'Gudang Tujuan',
      'BIN Lokasi',
      'Sumber / Rekanan',
      'Petugas PIC',
      'Catatan',
    ];

    const rows = filteredLogs.map((l) => [
      `"${new Date(l.timestamp).toLocaleString('id-ID')}"`,
      l.invoiceNo,
      l.type,
      l.sku,
      `"${l.productName.replace(/"/g, '""')}"`,
      l.qty,
      l.targetWarehouseId,
      l.targetBinCode,
      `"${l.sourceOrVendor.replace(/"/g, '""')}"`,
      `"${l.pic}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Log_Inbound_WMS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Log Buku Barang Masuk (Inbound)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail & riwayat lengkap seluruh pergerakan barang yang masuk ke sistem gudang
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setActiveTab('inbound')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <ArrowDownToDot className="w-4 h-4" />
            <span>Input Inbound Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari No Dokumen, SKU, Vendor, atau PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="ALL">Semua Gudang Tujuan</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs w-full"
              title="Dari Tanggal"
            />
            <span>s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs w-full"
              title="Sampai Tanggal"
            />
          </div>
        </div>

        {/* Date Presets & Type Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-slate-400 mr-1">Preset Waktu:</span>
            <button
              onClick={() => setPresetDate(0)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-medium"
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPresetDate(7)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-medium"
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => setPresetDate(30)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-medium"
            >
              30 Hari Terakhir
            </button>
            {(startDate || endDate) && (
              <button
                onClick={() => setPresetDate(-1)}
                className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded text-[11px] font-semibold"
              >
                Reset Tanggal
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-500 shrink-0">Tipe Inbound:</span>
            {(
              [
                { id: 'ALL', label: 'Semua' },
                { id: 'PEMBELIAN_VENDOR', label: 'Beli Vendor' },
                { id: 'RETUR_DEFECT', label: 'Retur Defect' },
                { id: 'RETUR_PEMINJAMAN', label: 'Retur Pinjam' },
                { id: 'TRANSFER_GUDANG_LAIN', label: 'Transfer In' },
                { id: 'LABELING', label: 'Labeling' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
                  selectedType === t.id
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Waktu Penerimaan</th>
                <th className="px-4 py-3">No. Dokumen / PO</th>
                <th className="px-4 py-3">Tipe Masuk</th>
                <th className="px-4 py-3">SKU & Nama Barang</th>
                <th className="px-4 py-3 text-center">Qty Masuk</th>
                <th className="px-4 py-3">Gudang & Lokasi BIN</th>
                <th className="px-4 py-3">Sumber / Vendor</th>
                <th className="px-4 py-3">Petugas PIC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada log barang masuk yang cocok.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const wh = warehouses.find((w) => w.id === log.targetWarehouseId);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {new Date(log.timestamp).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          WIB
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {log.invoiceNo}
                      </td>
                      <td className="px-4 py-3">
                        {log.type === 'VENDOR_PURCHASE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Truck className="w-3 h-3" />
                            Beli Vendor
                          </span>
                        )}
                        {log.type === 'CUSTOMER_RETURN' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <RotateCcw className="w-3 h-3" />
                            Retur Pembeli
                          </span>
                        )}
                        {log.type === 'KOL_RETURN' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Sparkles className="w-3 h-3" />
                            Retur KOL
                          </span>
                        )}
                        {log.type === 'INTER_WAREHOUSE_IN' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowRightLeft className="w-3 h-3" />
                            Transfer In
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{log.sku}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{log.productName}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">
                        +{log.qty} Pcs
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{wh?.name || log.targetWarehouseId}</div>
                        <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1 rounded">
                          {log.targetBinCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium truncate max-w-xs">{log.sourceOrVendor}</div>
                        {log.notes && (
                          <div className="text-[10px] text-slate-400 italic truncate max-w-xs">
                            {log.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{log.pic}</td>
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
