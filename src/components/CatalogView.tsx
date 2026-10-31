import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Building,
  Layers,
  Edit2,
  X,
  CheckCircle2,
  UploadCloud,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { ProductSKU } from '../types/inventory';

export const CatalogView: React.FC = () => {
  const { products, warehouses, bins, stockPositions, addProduct, updateProduct, setActiveTab } =
    useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSkuDetail, setSelectedSkuDetail] = useState<ProductSKU | null>(null);

  // New SKU form state
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Apparel & Pakaian');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formBuyPrice, setFormBuyPrice] = useState<number>(50000);
  const [formSellPrice, setFormSellPrice] = useState<number>(99000);
  const [formMinStock, setFormMinStock] = useState<number>(25);
  const [formDesc, setFormDesc] = useState('');
  const [formInitWarehouse, setFormInitWarehouse] = useState(warehouses[0]?.id || '');
  const [formInitBin, setFormInitBin] = useState('');
  const [formInitQty, setFormInitQty] = useState<number>(0);
  const [formError, setFormError] = useState('');

  // Extract unique categories
  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  // Calculate stock on hand for each SKU
  const skuStockMap = new Map<string, number>();
  const skuWarehouseStockMap = new Map<string, Map<string, number>>();

  for (const pos of stockPositions) {
    skuStockMap.set(pos.sku, (skuStockMap.get(pos.sku) || 0) + pos.qtyOnHand);
    if (!skuWarehouseStockMap.has(pos.sku)) {
      skuWarehouseStockMap.set(pos.sku, new Map());
    }
    const whMap = skuWarehouseStockMap.get(pos.sku)!;
    whMap.set(pos.warehouseId, (whMap.get(pos.warehouseId) || 0) + pos.qtyOnHand);
  }

  // Filtered products using advanced multi-criteria filter
  const filteredProducts = products.filter((p) => {
    // 1. Text search (Name, SKU, Category)
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchSearch =
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 2. Category
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
      return false;
    }

    // 3. Warehouse location filter (including tracking other warehouses)
    const totalQtyInSelectedWh =
      selectedWarehouse === 'ALL'
        ? skuStockMap.get(p.sku) || 0
        : skuWarehouseStockMap.get(p.sku)?.get(selectedWarehouse) || 0;

    if (selectedWarehouse !== 'ALL') {
      const whMap = skuWarehouseStockMap.get(p.sku);
      if (!whMap || !whMap.has(selectedWarehouse)) {
        return false;
      }
    }

    // 4. Stock status filter ('in stock', 'low stock', 'out of stock')
    if (selectedStockStatus !== 'ALL') {
      if (selectedStockStatus === 'OUT_OF_STOCK' && totalQtyInSelectedWh !== 0) {
        return false;
      }
      if (
        selectedStockStatus === 'LOW_STOCK' &&
        (totalQtyInSelectedWh === 0 || totalQtyInSelectedWh > p.minStockAlert)
      ) {
        return false;
      }
      if (selectedStockStatus === 'IN_STOCK' && totalQtyInSelectedWh <= p.minStockAlert) {
        return false;
      }
    }

    return true;
  });

  const handleOpenAddModal = () => {
    setFormSku('');
    setFormName('');
    setFormDesc('');
    setFormInitQty(0);
    setFormError('');
    if (warehouses.length > 0) {
      setFormInitWarehouse(warehouses[0].id);
      const firstBin = bins.find((b) => b.warehouseId === warehouses[0].id);
      setFormInitBin(firstBin ? firstBin.code : 'BIN-A1-01');
    }
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku.trim()) {
      setFormError('Kode SKU wajib diisi!');
      return;
    }
    if (!formName.trim()) {
      setFormError('Nama Produk wajib diisi!');
      return;
    }
    if (products.some((p) => p.sku.toUpperCase() === formSku.trim().toUpperCase())) {
      setFormError(`Kode SKU '${formSku}' sudah ada di katalog!`);
      return;
    }

    const newProduct: ProductSKU = {
      sku: formSku.trim().toUpperCase(),
      name: formName.trim(),
      category: formCategory,
      unit: formUnit,
      buyPrice: Number(formBuyPrice) || 0,
      sellPrice: Number(formSellPrice) || 0,
      minStockAlert: Number(formMinStock) || 0,
      description: formDesc.trim(),
      createdAt: new Date().toISOString(),
    };

    addProduct(
      newProduct,
      formInitWarehouse,
      formInitBin,
      Number(formInitQty) || 0
    );

    setIsAddModalOpen(false);
  };

  const exportCSV = () => {
    const headers = ['SKU', 'Nama Produk', 'Kategori', 'Satuan', 'HPP (Harga Beli)', 'Harga Jual', 'Stok On-Hand', 'Batas Minimum Alert'];
    const rows = products.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.unit,
      p.buyPrice,
      p.sellPrice,
      skuStockMap.get(p.sku) || 0,
      p.minStockAlert,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Katalog_SKU_WMS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Katalog Barang (Master SKU)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen master data SKU, penentuan harga beli/jual, batas alert stok, dan alokasi gudang
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('bulk-data')}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-xs transition"
            title="Impor ratusan master SKU sekaligus dari berkas CSV"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Bulk Import SKU</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah SKU Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan SKU, nama barang, atau kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Warehouse filter */}
          <div>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-medium text-slate-700"
            >
              <option value="ALL">Semua Gudang Penyimpanan</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock status filter */}
          <div>
            <select
              value={selectedStockStatus}
              onChange={(e) => setSelectedStockStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
            >
              <option value="ALL">Semua Status Stok</option>
              <option value="IN_STOCK">🟢 In Stock (Stok Aman)</option>
              <option value="LOW_STOCK">🟠 Low Stock (Di Bawah Batas Min)</option>
              <option value="OUT_OF_STOCK">🔴 Out of Stock (Habis Total = 0)</option>
            </select>
          </div>
        </div>

        {/* Category chips row */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-slate-100">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-500 shrink-0 font-medium">Kategori:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Kode SKU</th>
                <th className="px-4 py-3">Nama Produk & Deskripsi</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">HPP (Beli)</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-center">Stok On-Hand</th>
                <th className="px-4 py-3 text-center">Min. Alert</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 space-y-3">
                    <p className="font-semibold text-slate-600 text-sm">
                      {products.length === 0
                        ? 'Katalog produk masih kosong (PT Duma Kreasi Indonesia).'
                        : 'Tidak ada SKU yang cocok dengan kombinasi filter & pencarian.'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Silakan buat master SKU baru untuk mulai menginput inventaris fisik atau ubah filter pencarian.
                    </p>
                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        onClick={handleOpenAddModal}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah SKU Baru Sekarang</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const stock = skuStockMap.get(prod.sku) || 0;
                  const isLow = stock <= prod.minStockAlert;
                  return (
                    <tr key={prod.sku} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {prod.sku}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{prod.name}</div>
                        {prod.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {prod.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{prod.category}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-600">
                        Rp {prod.buyPrice.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        Rp {prod.sellPrice.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        <span className={isLow ? 'text-rose-600' : 'text-slate-900'}>
                          {stock} {prod.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {prod.minStockAlert} {prod.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {stock === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3 h-3" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => setSelectedSkuDetail(prod)}
                          className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium text-[11px] transition"
                        >
                          Detail Alokasi
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

      {/* Modal: Tambah SKU Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Buat Master SKU Baru</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode SKU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: KMJ-OXF-BLK-XL"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Gunakan format unik per varian</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Satuan Unit *
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Box">Box / Kardus</option>
                    <option value="Lusin">Lusin (12 Pcs)</option>
                    <option value="Pasang">Pasang (Pairs)</option>
                    <option value="Roll">Roll</option>
                    <option value="Set">Set / Paket</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Barang Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kemeja Oxford Slim Fit Black Edition (XL)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Barang
                  </label>
                  <input
                    type="text"
                    placeholder="Kemeja, Kaos, Celana, dll"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batas Peringatan Min. Stok (Low Stock Alert)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Beli / HPP (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formBuyPrice}
                    onChange={(e) => setFormBuyPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Jual Standar (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formSellPrice}
                    onChange={(e) => setFormSellPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Saldo Stok Awal (Opsional) */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  Alokasi Stok Awal (Opsional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Pilih Gudang</label>
                    <select
                      value={formInitWarehouse}
                      onChange={(e) => setFormInitWarehouse(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Kode BIN</label>
                    <input
                      type="text"
                      placeholder="BIN-A1-01"
                      value={formInitBin}
                      onChange={(e) => setFormInitBin(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Qty Stok Awal</label>
                    <input
                      type="number"
                      min={0}
                      value={formInitQty}
                      onChange={(e) => setFormInitQty(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Spesifikasi Bahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Bahan, instruksi perawatan, supplier utama..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  Simpan SKU Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Alokasi SKU per Gudang & BIN */}
      {selectedSkuDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                    {selectedSkuDetail.sku}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{selectedSkuDetail.name}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi fisik barang pada setiap Gudang dan Lokasi Rak BIN
                </p>
              </div>
              <button
                onClick={() => setSelectedSkuDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400">Total Stok Fisik:</span>
                  <p className="font-bold text-slate-900 text-base">
                    {skuStockMap.get(selectedSkuDetail.sku) || 0} {selectedSkuDetail.unit}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Batas Min Alert:</span>
                  <p className="font-bold text-slate-900 text-base">
                    {selectedSkuDetail.minStockAlert} {selectedSkuDetail.unit}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Estimasi Nilai HPP:</span>
                  <p className="font-bold text-emerald-600 text-base">
                    Rp{' '}
                    {(
                      (skuStockMap.get(selectedSkuDetail.sku) || 0) * selectedSkuDetail.buyPrice
                    ).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Rincian Lokasi Penyimpanan BIN
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Gudang</th>
                        <th className="px-3 py-2">Kode BIN</th>
                        <th className="px-3 py-2 text-center">Stok On-Hand</th>
                        <th className="px-3 py-2 text-center">Terpesan (PO)</th>
                        <th className="px-3 py-2 text-center">Defect QC</th>
                        <th className="px-3 py-2 text-center">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stockPositions
                        .filter((sp) => sp.sku === selectedSkuDetail.sku)
                        .map((pos) => {
                          const wh = warehouses.find((w) => w.id === pos.warehouseId);
                          const available = pos.qtyOnHand - pos.qtyReserved;
                          return (
                            <tr key={pos.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-900">
                                {wh?.name || pos.warehouseId}
                              </td>
                              <td className="px-3 py-2 font-mono font-semibold text-blue-700">
                                {pos.binCode}
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-slate-900">
                                {pos.qtyOnHand}
                              </td>
                              <td className="px-3 py-2 text-center text-purple-700 font-semibold">
                                {pos.qtyReserved}
                              </td>
                              <td className="px-3 py-2 text-center text-rose-600 font-semibold">
                                {pos.qtyDefect}
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-emerald-700">
                                {available}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedSkuDetail(null);
                    setActiveTab('stock-mutation');
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Buka Kartu Mutasi SKU &rarr;
                </button>
                <button
                  onClick={() => {
                    setSelectedSkuDetail(null);
                    setActiveTab('inbound');
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  + Tambah Inbound Stok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
