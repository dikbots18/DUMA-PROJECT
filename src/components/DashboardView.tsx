import React from 'react';
import {
  Boxes,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  ClockAlert,
  PlusCircle,
  ArrowDownToDot,
  ArrowUpFromDot,
  Layers,
  ChevronRight,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const DashboardView: React.FC = () => {
  const { summary, products, stockPositions, warehouses, inbounds, outbounds, setActiveTab } =
    useInventory();

  // Find products that are low in stock
  const skuStockMap = new Map<string, number>();
  for (const pos of stockPositions) {
    skuStockMap.set(pos.sku, (skuStockMap.get(pos.sku) || 0) + pos.qtyOnHand);
  }

  const lowStockList = products
    .map((prod) => {
      const currentQty = skuStockMap.get(prod.sku) || 0;
      return {
        ...prod,
        currentQty,
        deficit: Math.max(0, prod.minStockAlert - currentQty),
      };
    })
    .filter((item) => item.currentQty <= item.minStockAlert)
    .sort((a, b) => b.deficit - a.deficit);

  // Recent 6 transactions combined (inbounds & outbounds)
  const recentActivities = [
    ...inbounds.map((i) => ({
      id: i.id,
      timestamp: i.timestamp,
      direction: 'IN' as const,
      sku: i.sku,
      name: i.productName,
      qty: i.qty,
      sourceTarget: i.sourceOrVendor,
      code: i.invoiceNo,
    })),
    ...outbounds.map((o) => ({
      id: o.id,
      timestamp: o.timestamp,
      direction: 'OUT' as const,
      sku: o.sku,
      name: o.productName,
      qty: o.qty,
      sourceTarget: o.destinationOrCustomer,
      code: o.transactionNo,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  // Warehouse breakdown calculation
  const warehouseBreakdowns = warehouses.map((wh) => {
    const whStock = stockPositions
      .filter((sp) => sp.warehouseId === wh.id)
      .reduce((acc, s) => acc + s.qtyOnHand, 0);
    const percentFilled = Math.min(100, Math.round((whStock / wh.capacityMax) * 100));
    return {
      ...wh,
      currentStock: whStock,
      percentFilled,
    };
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard Informasi Inventaris</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rangkuman stok real-time, sirkulasi barang masuk & keluar, status gudang, dan peringatan kritis
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('inbound')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <ArrowDownToDot className="w-4 h-4" />
            <span>Stock In Baru</span>
          </button>
          <button
            onClick={() => setActiveTab('outbound')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <ArrowUpFromDot className="w-4 h-4" />
            <span>Stock Out Baru</span>
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah SKU</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sisa Stock On-Hand */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Rangkuman Sisa Stock
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {summary.totalStockOnHand.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-medium text-slate-500">Pcs Total</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Tersebar di {warehouses.length} Gudang Regional</span>
          </p>
        </div>

        {/* Total SKU / Produk */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Katalog Produk
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {summary.totalUniqueSKUs}
            </span>
            <span className="text-xs font-medium text-slate-500">Master SKU Aktif</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Nilai Stok: Rp {summary.totalEstimatedStockValue.toLocaleString('id-ID')}
          </p>
        </div>

        {/* Produk Masuk (Inbound) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Produk Masuk (Inbound)
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">
              +{summary.totalIncomingMonth.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-medium text-slate-500">Pcs Diterima</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Dari Vendor, Retur & Transfer Gudang
          </p>
        </div>

        {/* Produk Keluar (Outbound) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Produk Keluar (Outbound)
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600">
              -{summary.totalOutgoingMonth.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-medium text-slate-500">Pcs Terkirim</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Penjualan Marketplace & Relokasi
          </p>
        </div>
      </div>

      {/* Secondary KPI Row: Low Stock SKU, Pre-Order Queue, Defect Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Low Stock Alert Banner */}
        <div
          onClick={() => setActiveTab('catalog')}
          className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
            summary.lowStockItemsCount > 0
              ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-50'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500 text-white shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Peringatan Low Stock
              </p>
              <p className="text-lg font-extrabold text-amber-800">
                {summary.lowStockItemsCount} SKU Butuh Restock
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-500" />
        </div>

        {/* Pre-Order Pending Queue */}
        <div
          onClick={() => setActiveTab('pre-order')}
          className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
            summary.totalPendingPOCount > 0
              ? 'bg-purple-50/70 border-purple-300 hover:bg-purple-50'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-600 text-white shadow-xs">
              <ClockAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                Antrean Pre-Order
              </p>
              <p className="text-lg font-extrabold text-purple-800">
                {summary.totalPendingPOCount} Pcs Menunggu Ready
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-purple-500" />
        </div>

        {/* Defect Goods QC Status */}
        <div
          onClick={() => setActiveTab('defects')}
          className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
            summary.totalDefectCount > 0
              ? 'bg-rose-50/70 border-rose-300 hover:bg-rose-50'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-600 text-white shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                Barang Defect (QC)
              </p>
              <p className="text-lg font-extrabold text-rose-800">
                {summary.totalDefectCount} Pcs Perlu Ditindaklanjuti
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-rose-500" />
        </div>
      </div>

      {/* Main Content Split: Low Stock Table & Warehouse Capacities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Low Stock SKU Table (2 Columns wide) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Daftar SKU Stok Kritis (Di Bawah Minimum Alert)
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('catalog')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              Lihat Semua SKU &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            {lowStockList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Semua stok produk berada dalam batas aman (tidak ada low stock).
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">SKU & Nama Barang</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3 text-center">Stok Saat Ini</th>
                    <th className="px-4 py-3 text-center">Batas Min</th>
                    <th className="px-4 py-3 text-center">Defisit</th>
                    <th className="px-4 py-3 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockList.map((item) => (
                    <tr key={item.sku} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.sku}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.name}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.category}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-600">
                        {item.currentQty} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {item.minStockAlert} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          -{item.deficit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setActiveTab('inbound')}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md font-semibold text-[11px] transition"
                        >
                          Restock PO
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Multi-Warehouse Capacity & Recent Activity */}
        <div className="space-y-6">
          {/* Warehouse Occupancy */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Kapasitas Gudang Regional</h3>
              </div>
              <button
                onClick={() => setActiveTab('warehouses')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Detail &rarr;
              </button>
            </div>

            <div className="space-y-4">
              {warehouseBreakdowns.map((wh) => (
                <div key={wh.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{wh.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {wh.currentStock.toLocaleString('id-ID')} / {wh.capacityMax.toLocaleString('id-ID')} Pcs
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        wh.percentFilled > 85
                          ? 'bg-rose-500'
                          : wh.percentFilled > 60
                          ? 'bg-blue-600'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${wh.percentFilled}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>PIC: {wh.pic}</span>
                    <span className="font-semibold">{wh.percentFilled}% Terisi</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Movement Ticker */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Pergerakan Stok Terkini</h3>
              <button
                onClick={() => setActiveTab('stock-mutation')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Semua Mutasi &rarr;
              </button>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Belum ada riwayat pergerakan stok tercatat.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start justify-between text-xs border-b border-slate-50 pb-2">
                    <div className="flex items-start gap-2 truncate">
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md shrink-0 uppercase ${
                          act.direction === 'IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {act.direction === 'IN' ? 'IN' : 'OUT'}
                      </span>
                      <div className="truncate">
                        <p className="font-semibold text-slate-900 truncate">{act.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{act.sourceTarget}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`font-bold ${
                          act.direction === 'IN' ? 'text-emerald-600' : 'text-blue-600'
                        }`}
                      >
                        {act.direction === 'IN' ? '+' : '-'}
                        {act.qty} Pcs
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {new Date(act.timestamp).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
