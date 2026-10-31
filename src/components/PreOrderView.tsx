import React, { useState } from 'react';
import {
  ClockAlert,
  Plus,
  Search,
  CheckCircle2,
  PackageCheck,
  Send,
  X,
  AlertCircle,
  Truck,
  Filter,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { PreOrderStatus, PreOrderItem } from '../types/inventory';

export const PreOrderView: React.FC = () => {
  const {
    preOrders,
    products,
    warehouses,
    bins,
    stockPositions,
    addPreOrder,
    updatePreOrderStatus,
    fulfillPreOrder,
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fulfillModalItem, setFulfillModalItem] = useState<PreOrderItem | null>(null);

  // Form states for New Pre-Order
  const [orderNo, setOrderNo] = useState('');
  const [channel, setChannel] = useState('Shopee Official Store');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedSku, setSelectedSku] = useState(products[0]?.sku || '');
  const [requestedQty, setRequestedQty] = useState<number>(1);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [etaDate, setEtaDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');

  // Fulfill modal states
  const [fulfillWh, setFulfillWh] = useState(warehouses[0]?.id || '');
  const [fulfillBin, setFulfillBin] = useState('BIN-A1-01');
  const [fulfillPic, setFulfillPic] = useState('Admin Dispatch');
  const [fulfillError, setFulfillError] = useState('');

  const filteredOrders = preOrders.filter((po) => {
    const matchStatus = selectedStatus === 'ALL' || po.status === selectedStatus;
    const matchSearch =
      po.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.productName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalWaiting = preOrders.filter((p) => p.status === 'MENUNGGU_BARANG').length;
  const totalReady = preOrders.filter((p) => p.status === 'SIAP_KIRIM').length;
  const totalFulfilled = preOrders.filter((p) => p.status === 'SUDAH_DIKIRIM').length;

  const handleCreatePreOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNo.trim() || !customerName.trim()) return;

    const prod = products.find((p) => p.sku === selectedSku);

    addPreOrder({
      orderNo: orderNo.trim().toUpperCase(),
      channel,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      sku: selectedSku,
      productName: prod?.name || selectedSku,
      requestedQty: Number(requestedQty),
      orderDate,
      etaDate,
      notes: notes.trim(),
    });

    setIsAddModalOpen(false);
    setOrderNo('');
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
  };

  const handleConfirmFulfillment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fulfillModalItem) return;
    setFulfillError('');

    const res = fulfillPreOrder(fulfillModalItem.id, fulfillWh, fulfillBin, fulfillPic);
    if (res.success) {
      setFulfillModalItem(null);
    } else {
      setFulfillError(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Stock Out Khusus Pre-Order Item</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded-md uppercase">
              Pre-Order Queue
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen pesanan pelanggan yang status fisiknya belum ready di gudang. Otomatis alokasikan & kirim saat barang tiba.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Input Pesanan Pre-Order</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Semua Pre-Order
          </span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{preOrders.length} Pesanan</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Menunggu Stok Ready
          </span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{totalWaiting} Pesanan</p>
          <span className="text-[10px] text-slate-400">Dalam proses produksi/vendor</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Stok Siap Kirim (Ready)
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{totalReady} Pesanan</p>
          <span className="text-[10px] text-slate-400">Teralokasi, siap packing & dispatch</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Sudah Terkirim (Fulfilled)
          </span>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">{totalFulfilled} Pesanan</p>
          <span className="text-[10px] text-slate-400">Stock out selesai diproses</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No Order, Customer, atau SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 shrink-0">Filter Status:</span>
          {(['ALL', 'MENUNGGU_BARANG', 'SIAP_KIRIM', 'SUDAH_DIKIRIM'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedStatus === st
                  ? 'bg-purple-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL'
                ? 'Semua'
                : st === 'MENUNGGU_BARANG'
                ? 'Menunggu Ready'
                : st === 'SIAP_KIRIM'
                ? 'Siap Kirim'
                : 'Sudah Terkirim'}
            </button>
          ))}
        </div>
      </div>

      {/* Pre-Order Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">No. Pesanan PO</th>
                <th className="px-4 py-3">Channel & Customer</th>
                <th className="px-4 py-3">SKU & Produk</th>
                <th className="px-4 py-3 text-center">Qty Diminta</th>
                <th className="px-4 py-3 text-center">Teralokasi</th>
                <th className="px-4 py-3 text-center">Status Barang</th>
                <th className="px-4 py-3 text-center">Estimasi Tiba (ETA)</th>
                <th className="px-4 py-3 text-right">Aksi Outbound</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada pesanan Pre-Order yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-purple-900">
                        {po.orderNo}
                        <div className="text-[10px] text-slate-400 font-normal">
                          Tgl: {po.orderDate}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{po.customerName}</div>
                        <div className="text-[10px] text-slate-400">
                          {po.channel} {po.customerPhone && `• ${po.customerPhone}`}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-900">{po.sku}</span>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{po.productName}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">
                        {po.requestedQty} Pcs
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-purple-700">
                        {po.allocatedQty} Pcs
                      </td>
                      <td className="px-4 py-3 text-center">
                        {po.status === 'MENUNGGU_BARANG' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Menunggu Produksi
                          </span>
                        )}
                        {po.status === 'SIAP_KIRIM' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 animate-pulse">
                            Stok Ready
                          </span>
                        )}
                        {po.status === 'SUDAH_DIKIRIM' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Terkirim (Fulfilled)
                          </span>
                        )}
                        {po.status === 'DIBATALKAN' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            Dibatalkan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-600">
                        {po.etaDate}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {po.status === 'SIAP_KIRIM' && (
                          <button
                            onClick={() => {
                              setFulfillModalItem(po);
                              setFulfillError('');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-xs transition inline-flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Kirim (Stock Out)</span>
                          </button>
                        )}
                        {po.status === 'MENUNGGU_BARANG' && (
                          <button
                            onClick={() => updatePreOrderStatus(po.id, 'SIAP_KIRIM')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[10px] transition"
                            title="Tandai secara manual bahwa barang sudah ready di gudang"
                          >
                            Tandai Ready
                          </button>
                        )}
                        {po.status !== 'SUDAH_DIKIRIM' && po.status !== 'DIBATALKAN' && (
                          <button
                            onClick={() => updatePreOrderStatus(po.id, 'DIBATALKAN')}
                            className="px-2 py-1 text-slate-400 hover:text-rose-600 text-[10px] transition"
                          >
                            Batal
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Input Pesanan Pre-Order Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ClockAlert className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Catat Pesanan Pre-Order Baru</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePreOrder} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Pesanan / Invoice *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PO-ORD-9020"
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Channel Penjualan
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="Shopee Official Store">Shopee Official Store</option>
                    <option value="TikTok Shop Live">TikTok Shop Live</option>
                    <option value="Tokopedia Official">Tokopedia Official</option>
                    <option value="WhatsApp B2B Corporate">WhatsApp B2B / Custom Order</option>
                    <option value="Offline Store / Event">Offline Store / Event Exhibition</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Customer / PIC *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama pemesan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Produk / SKU PO *
                  </label>
                  <select
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
                  >
                    {products.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        [{p.sku}] - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Qty Pesanan *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={requestedQty}
                    onChange={(e) => setRequestedQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Order Masuk
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Ready (ETA) *
                  </label>
                  <input
                    type="date"
                    required
                    value={etaDate}
                    onChange={(e) => setEtaDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold text-purple-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Pesanan / Request Custom
                </label>
                <textarea
                  rows={2}
                  placeholder="Pesanan kloter 2, customer minta diselipkan kartu ucapan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  Simpan Antrean PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fulfill / Eksekusi Stock Out Pre-Order */}
      {fulfillModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Kirim Pesanan Pre-Order #{fulfillModalItem.orderNo}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Eksekusi Stock Out resmi untuk pesanan yang telah ready
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFulfillModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmFulfillment} className="p-5 space-y-4">
              {fulfillError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fulfillError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{fulfillModalItem.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Produk:</span>
                  <span className="font-semibold text-slate-900">{fulfillModalItem.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Qty yang Dikirim:</span>
                  <span className="font-bold text-emerald-700">
                    {fulfillModalItem.requestedQty} Pcs
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ambil dari Gudang Mana *
                </label>
                <select
                  value={fulfillWh}
                  onChange={(e) => {
                    setFulfillWh(e.target.value);
                    const b = bins.find((x) => x.warehouseId === e.target.value);
                    setFulfillBin(b?.code || 'BIN-A1-01');
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ambil dari Lokasi BIN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="BIN-A1-01"
                  value={fulfillBin}
                  onChange={(e) => setFulfillBin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Petugas Dispatch (PIC) *
                </label>
                <input
                  type="text"
                  required
                  value={fulfillPic}
                  onChange={(e) => setFulfillPic(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setFulfillModalItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Kirim & Kurangi Stok Gudang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
