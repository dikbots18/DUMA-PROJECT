import React, { useState } from 'react';
import {
  Handshake,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building,
  Star,
  Warehouse as WarehouseIcon,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { SupplierPartner, Warehouse } from '../types/inventory';

export const PartnersSuppliersView: React.FC = () => {
  const { suppliers, addSupplier, addWarehouse } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);

  // Supplier form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplierPartner['category']>('PRODUK_JADI');
  const [picName, setPicName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('NET 30 Hari');
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Warehouse form state
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whPic, setWhPic] = useState('');
  const [whPhone, setWhPhone] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whCapacity, setWhCapacity] = useState<number>(10000);

  const filteredSuppliers = suppliers.filter((s) => {
    const matchCat = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.picName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama Supplier / Mitra wajib diisi!');
      return;
    }

    const vendorCode =
      code.trim().toUpperCase() ||
      `VND-${Math.floor(100 + Math.random() * 900)}`;

    const newSupplier: SupplierPartner = {
      id: `SUP-${Date.now()}`,
      code: vendorCode,
      name: name.trim(),
      category,
      picName: picName.trim() || 'PIC Supplier',
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      paymentTerms,
      rating: Number(rating) || 5,
      notes: notes.trim(),
    };

    addSupplier(newSupplier);
    setIsAddSupplierModalOpen(false);
    setCode('');
    setName('');
    setPicName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    setErrorMsg('');
  };

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim() || !whCode.trim()) return;

    const newWh: Warehouse = {
      id: `WH-${whCode.trim().toUpperCase()}`,
      code: whCode.trim().toUpperCase(),
      name: whName.trim(),
      pic: whPic.trim() || 'Kepala Gudang',
      phone: whPhone.trim(),
      address: whAddress.trim(),
      capacityMax: Number(whCapacity) || 10000,
      notes: 'Ditambahkan via menu Manajemen Mitra & Gudang',
    };

    addWarehouse(newWh);
    setIsAddWarehouseModalOpen(false);
    setWhCode('');
    setWhName('');
    setWhPic('');
    setWhPhone('');
    setWhAddress('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Mitra / Supplier & Gudang</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan data pabrik konveksi, supplier bahan baku, kemasan packaging, serta penambahan unit gudang baru
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddWarehouseModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <WarehouseIcon className="w-4 h-4 text-blue-600" />
            <span>+ Tambah Gudang Baru</span>
          </button>
          <button
            onClick={() => setIsAddSupplierModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Supplier Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pabrik, vendor, atau PIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 shrink-0">Kategori:</span>
          {(['ALL', 'PRODUK_JADI', 'BAHAN_BAKU', 'PACKAGING', 'JASA_KONVEKSI'] as const).map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL'
                  ? 'Semua Mitra'
                  : cat === 'PRODUK_JADI'
                  ? 'Produk Jadi'
                  : cat === 'BAHAN_BAKU'
                  ? 'Bahan Baku'
                  : cat === 'PACKAGING'
                  ? 'Packaging'
                  : 'Jasa Konveksi'}
              </button>
            )
          )}
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSuppliers.map((sup) => (
          <div
            key={sup.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-400 transition"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {sup.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                      {sup.category.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{sup.name}</h3>
                </div>
                {/* Rating */}
                <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  <span className="text-xs font-bold">{sup.rating}.0</span>
                </div>
              </div>

              {sup.notes && (
                <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {sup.notes}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 text-[10px] block">PIC Kontak:</span>
                  <span className="font-semibold text-slate-800">{sup.picName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Termin Pembayaran (TOP):</span>
                  <span className="font-semibold text-slate-800">{sup.paymentTerms}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                {sup.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{sup.phone}</span>
                  </div>
                )}
                {sup.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{sup.email}</span>
                  </div>
                )}
                {sup.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{sup.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Tambah Supplier Baru */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Input Data Mitra / Supplier Baru</h3>
              </div>
              <button
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Supplier
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: VND-GARMENT-05"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Mitra
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value="PRODUK_JADI">Produk Jadi / Garment</option>
                    <option value="BAHAN_BAKU">Bahan Baku Kain & Benang</option>
                    <option value="PACKAGING">Packaging & Dus Kardus</option>
                    <option value="JASA_KONVEKSI">Jasa CMT / Sablon</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Perusahaan / Supplier / Pabrik *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Sinar Tekstil Nusantara"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama PIC Marketing / Pabrik
                  </label>
                  <input
                    type="text"
                    placeholder="Nama kontak person"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / Telp
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Termin Pembayaran (TOP)
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value="NET 14 Hari">NET 14 Hari</option>
                    <option value="NET 30 Hari">NET 30 Hari</option>
                    <option value="NET 45 Hari">NET 45 Hari</option>
                    <option value="COD / Cash Saat Tiba">COD (Cash on Delivery)</option>
                    <option value="DP 50%, Pelunasan NET 14">DP 50%, Pelunasan NET 14</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rating Kualitas Vendor
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value={5}>⭐️⭐️⭐️⭐️⭐️ (5.0 - Sangat Baik)</option>
                    <option value={4}>⭐️⭐️⭐️⭐️ (4.0 - Bagus)</option>
                    <option value={3}>⭐️⭐️⭐️ (3.0 - Standar)</option>
                    <option value={2}>⭐️⭐️ (2.0 - Perlu Evaluasi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Kantor / Pabrik
                </label>
                <textarea
                  rows={2}
                  placeholder="Kawasan Industri, Kota, Provinsi..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Produk / Kapasitas Produksi
                </label>
                <input
                  type="text"
                  placeholder="Kapasitas 10.000 pcs/bulan, minimal order 200 pcs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  Simpan Data Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Gudang Baru */}
      {isAddWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Input Data Gudang Baru</h3>
              </div>
              <button
                onClick={() => setIsAddWarehouseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Gudang *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: MDN-01"
                    value={whCode}
                    onChange={(e) => setWhCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kapasitas (Pcs) *
                  </label>
                  <input
                    type="number"
                    min={100}
                    value={whCapacity}
                    onChange={(e) => setWhCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Gudang *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gudang Hub Medan & Sumatra Utara"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIC Gudang
                  </label>
                  <input
                    type="text"
                    placeholder="Nama penanggung jawab"
                    value={whPic}
                    onChange={(e) => setWhPic(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No Telepon
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={whPhone}
                    onChange={(e) => setWhPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddWarehouseModalOpen(false)}
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
    </div>
  );
};
