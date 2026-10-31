import React, { useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  MapPin,
  Phone,
  User,
  Boxes,
  Layers,
  X,
  Package,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Warehouse } from '../types/inventory';

export const WarehouseLocationsView: React.FC = () => {
  const { warehouses, stockPositions, products, bins, addWarehouse } = useInventory();

  const [isAddWhModalOpen, setIsAddWhModalOpen] = useState(false);
  const [selectedWhDetail, setSelectedWhDetail] = useState<Warehouse | null>(null);

  // Form states
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whPic, setWhPic] = useState('');
  const [whPhone, setWhPhone] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whCapacity, setWhCapacity] = useState<number>(10000);
  const [whNotes, setWhNotes] = useState('');
  const [whError, setWhError] = useState('');

  const handleSaveWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim() || !whCode.trim()) {
      setWhError('Kode dan Nama Gudang wajib diisi!');
      return;
    }

    const newWh: Warehouse = {
      id: `WH-${whCode.trim().toUpperCase()}`,
      code: whCode.trim().toUpperCase(),
      name: whName.trim(),
      pic: whPic.trim() || 'Admin Gudang',
      phone: whPhone.trim(),
      address: whAddress.trim(),
      capacityMax: Number(whCapacity) || 10000,
      notes: whNotes.trim(),
    };

    addWarehouse(newWh);
    setIsAddWhModalOpen(false);
    setWhCode('');
    setWhName('');
    setWhPic('');
    setWhPhone('');
    setWhAddress('');
    setWhNotes('');
    setWhError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Lokasi Gudang & Kapasitas Regional</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelacakan kuantitas stok per gudang, manajemen kapasitas penyimpanan, dan penambahan hub gudang baru
          </p>
        </div>
        <button
          onClick={() => setIsAddWhModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Gudang Baru</span>
        </button>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {warehouses.map((wh) => {
          const whStock = stockPositions
            .filter((sp) => sp.warehouseId === wh.id)
            .reduce((acc, s) => acc + s.qtyOnHand, 0);

          const whBins = bins.filter((b) => b.warehouseId === wh.id);

          const uniqueSkusInWh = new Set(
            stockPositions
              .filter((sp) => sp.warehouseId === wh.id && sp.qtyOnHand > 0)
              .map((sp) => sp.sku)
          ).size;

          const percentFilled = Math.min(100, Math.round((whStock / wh.capacityMax) * 100));

          return (
            <div
              key={wh.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-blue-400 transition"
            >
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <WarehouseIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                        {wh.code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{wh.name}</h3>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Penggunaan Kapasitas:</span>
                    <span className="font-bold text-slate-900">
                      {whStock.toLocaleString('id-ID')} / {wh.capacityMax.toLocaleString('id-ID')} Pcs
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentFilled > 85
                          ? 'bg-rose-500'
                          : percentFilled > 60
                          ? 'bg-blue-600'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Sisa: {(wh.capacityMax - whStock).toLocaleString('id-ID')} Pcs</span>
                    <span className="font-semibold text-slate-700">{percentFilled}% Terisi</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Jumlah SKU Aktif
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {uniqueSkusInWh} SKU
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Total Rak BIN
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {whBins.length} Lokasi
                    </span>
                  </div>
                </div>

                {/* Address & Contact */}
                <div className="text-xs text-slate-500 space-y-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>PIC: {wh.pic}</span>
                  </div>
                  {wh.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{wh.phone}</span>
                    </div>
                  )}
                  {wh.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{wh.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setSelectedWhDetail(wh)}
                  className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition"
                >
                  Lihat Daftar Stok Gudang Ini &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Tambah Gudang Baru */}
      {isAddWhModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Tambah Lokasi Gudang Baru</h3>
              </div>
              <button
                onClick={() => setIsAddWhModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWarehouse} className="p-5 space-y-4">
              {whError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {whError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Gudang *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SMG-01"
                    value={whCode}
                    onChange={(e) => setWhCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kapasitas Maksimal (Pcs) *
                  </label>
                  <input
                    type="number"
                    min={100}
                    value={whCapacity}
                    onChange={(e) => setWhCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Gudang / Hub *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gudang Hub Distribusi Semarang"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama PIC Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    placeholder="Nama kepala gudang"
                    value={whPic}
                    onChange={(e) => setWhPic(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={whPhone}
                    onChange={(e) => setWhPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Gudang
                </label>
                <textarea
                  rows={2}
                  placeholder="Jalan, Kawasan Industri, Kota, Provinsi..."
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Operasional
                </label>
                <input
                  type="text"
                  placeholder="Akses truk tronton, jam operasional..."
                  value={whNotes}
                  onChange={(e) => setWhNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddWhModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  Simpan Gudang Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Stok per Gudang Terpilih */}
      {selectedWhDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedWhDetail.name}</h3>
                  <p className="text-xs text-slate-500">
                    Daftar stok yang saat ini tersimpan di {selectedWhDetail.name} ({selectedWhDetail.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWhDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Kode SKU</th>
                    <th className="px-3 py-2">Nama Barang</th>
                    <th className="px-3 py-2">Lokasi BIN</th>
                    <th className="px-3 py-2 text-center">Stok Fisik</th>
                    <th className="px-3 py-2 text-center">Defect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockPositions
                    .filter((sp) => sp.warehouseId === selectedWhDetail.id && sp.qtyOnHand > 0)
                    .map((pos) => {
                      const prod = products.find((p) => p.sku === pos.sku);
                      return (
                        <tr key={pos.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">{pos.sku}</td>
                          <td className="px-3 py-2 text-slate-700 font-medium">{prod?.name || '-'}</td>
                          <td className="px-3 py-2 font-mono text-blue-700 font-semibold">
                            {pos.binCode}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-900">
                            {pos.qtyOnHand}
                          </td>
                          <td className="px-3 py-2 text-center text-rose-600 font-semibold">
                            {pos.qtyDefect > 0 ? pos.qtyDefect : '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedWhDetail(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
