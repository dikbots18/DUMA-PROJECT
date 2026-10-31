import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Truck,
  RotateCcw,
  CheckCircle2,
  Trash2,
  History,
  X,
  Building,
  User,
  Calendar,
  Layers,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { DefectTrackerItem, DefectType, DefectStatus } from '../types/inventory';

export const DefectTrackerView: React.FC = () => {
  const {
    defects,
    products,
    warehouses,
    suppliers,
    recordDefect,
    updateDefectAction,
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('ALL');

  const [isAddDefectModalOpen, setIsAddDefectModalOpen] = useState(false);
  const [selectedDefectHistory, setSelectedDefectHistory] = useState<DefectTrackerItem | null>(null);
  const [actionModalItem, setActionModalItem] = useState<{
    item: DefectTrackerItem;
    actionType: 'SEND_VENDOR' | 'RESOLVE_REPAIR' | 'SCRAP';
  } | null>(null);

  // Form states for New Defect (Stock In Defect)
  const [formSku, setFormSku] = useState(products[0]?.sku || '');
  const [formQty, setFormQty] = useState<number>(1);
  const [formWh, setFormWh] = useState(warehouses[0]?.id || '');
  const [formSource, setFormSource] = useState<'INBOUND_QC' | 'GUDANG_SORTIR' | 'CUSTOMER_RETURN'>('INBOUND_QC');
  const [formVendorId, setFormVendorId] = useState(suppliers[0]?.id || '');
  const [formDefectType, setFormDefectType] = useState<DefectType>('JAHITAN_RUSAK');
  const [formPic, setFormPic] = useState('Staff QC');
  const [formNotes, setFormNotes] = useState('');

  // Action modal states
  const [actionNotes, setActionNotes] = useState('');
  const [actionPic, setActionPic] = useState('Supervisor QC');
  const [targetBin, setTargetBin] = useState('BIN-A1-01');

  // Filtered defects
  const filteredDefects = defects.filter((d) => {
    const matchStatus = selectedStatusFilter === 'ALL' || d.status === selectedStatusFilter;
    const matchVendor = selectedVendorFilter === 'ALL' || d.vendorId === selectedVendorFilter;
    const matchSearch =
      d.defectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchVendor && matchSearch;
  });

  // Metrics
  const totalDefectActive = defects.filter(
    (d) => d.status !== 'SELESAI_DIPERBAIKI' && d.status !== 'SCRAP_WRITE_OFF'
  ).reduce((acc, d) => acc + d.qty, 0);

  const totalAtVendor = defects.filter((d) => d.status === 'DIKIRIM_KE_VENDOR').length;
  const totalResolved = defects.filter((d) => d.status === 'SELESAI_DIPERBAIKI').length;
  const totalScrapped = defects.filter((d) => d.status === 'SCRAP_WRITE_OFF').length;

  const handleCreateDefect = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = suppliers.find((s) => s.id === formVendorId);

    recordDefect({
      sku: formSku,
      qty: Number(formQty),
      warehouseId: formWh,
      vendorId: formVendorId,
      vendorName: vendor?.name || 'Vendor Tidak Tercatat',
      detectedFrom: formSource,
      defectType: formDefectType,
      pic: formPic.trim(),
      notes: formNotes.trim(),
    });

    setIsAddDefectModalOpen(false);
    setFormNotes('');
    setFormQty(1);
  };

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModalItem) return;

    let targetStatus: DefectStatus = 'PROSES_INVESTIGASI';
    let label = '';

    if (actionModalItem.actionType === 'SEND_VENDOR') {
      targetStatus = 'DIKIRIM_KE_VENDOR';
      label = `Kirim ke Vendor (Perbaikan Ke-${actionModalItem.item.repairIteration + 1})`;
    } else if (actionModalItem.actionType === 'RESOLVE_REPAIR') {
      targetStatus = 'SELESAI_DIPERBAIKI';
      label = 'Selesai Diperbaiki & Masuk Stok Normal';
    } else if (actionModalItem.actionType === 'SCRAP') {
      targetStatus = 'SCRAP_WRITE_OFF';
      label = 'Scrap / Pemusnahan Barang Defect (Write-off)';
    }

    updateDefectAction({
      defectId: actionModalItem.item.id,
      newStatus: targetStatus,
      actionLabel: label,
      notes: actionNotes.trim() || label,
      pic: actionPic.trim(),
      targetNormalBin: targetBin,
    });

    setActionModalItem(null);
    setActionNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Format Khusus Barang Defect (QC Defect Tracker)
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-md uppercase">
              QC & Vendor Accountability
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelacakan status barang defect, riwayat perbaikan ke berapa, vendor asal penanggung jawab, serta alur Stock In & Out defect
          </p>
        </div>
        <button
          onClick={() => setIsAddDefectModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat Barang Defect (Stock In Defect)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Stok Defect Aktif
          </span>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">
            {totalDefectActive} <span className="text-xs font-normal text-slate-500">Pcs</span>
          </p>
          <span className="text-[10px] text-slate-400">Dalam karantina gudang / vendor</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Sedang di Vendor (Repair)
          </span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{totalAtVendor} Batch</p>
          <span className="text-[10px] text-slate-400">Proses perbaikan oleh supplier</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Selesai Diperbaiki
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{totalResolved} Batch</p>
          <span className="text-[10px] text-slate-400">Restock kembali ke fisik normal</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Scrap / Write-Off
          </span>
          <p className="text-2xl font-extrabold text-slate-700 mt-1">{totalScrapped} Batch</p>
          <span className="text-[10px] text-slate-400">Dihancurkan / tidak dapat diperbaiki</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Kode Defect, SKU, atau Nama Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 shrink-0">Status:</span>
          {(
            [
              { id: 'ALL', label: 'Semua Defect' },
              { id: 'BARU_DITEMUKAN', label: 'Baru Ditemukan' },
              { id: 'DIKIRIM_KE_VENDOR', label: 'Di Vendor' },
              { id: 'SELESAI_DIPERBAIKI', label: 'Selesai Repair' },
              { id: 'SCRAP_WRITE_OFF', label: 'Write-Off' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedStatusFilter === s.id
                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Defect Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Kode Defect</th>
                <th className="px-4 py-3">SKU & Produk</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3">Vendor Asal</th>
                <th className="px-4 py-3">Jenis Defect</th>
                <th className="px-4 py-3 text-center">Status Barang</th>
                <th className="px-4 py-3 text-center">Perbaikan Ke-</th>
                <th className="px-4 py-3 text-right">Aksi & Riwayat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDefects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada catatan barang defect yang cocok.
                  </td>
                </tr>
              ) : (
                filteredDefects.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {item.defectCode}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {new Date(item.dateReported).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-900">{item.sku}</span>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.productName}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-rose-600">
                        {item.qty} Pcs
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{item.vendorName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Temuan: {item.detectedFrom.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {item.defectType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.status === 'BARU_DITEMUKAN' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Baru Ditemukan
                          </span>
                        )}
                        {item.status === 'PROSES_INVESTIGASI' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Investigasi QC
                          </span>
                        )}
                        {item.status === 'DIKIRIM_KE_VENDOR' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            Di Vendor
                          </span>
                        )}
                        {item.status === 'SELESAI_DIPERBAIKI' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Selesai Diperbaiki
                          </span>
                        )}
                        {item.status === 'SCRAP_WRITE_OFF' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Write-Off
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.repairIteration > 0 ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.repairIteration > 1
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            Perbaikan Ke-{item.repairIteration}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDefectHistory(item)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold transition inline-flex items-center gap-1"
                        >
                          <History className="w-3 h-3" />
                          <span>Log ({item.history.length})</span>
                        </button>

                        {item.status !== 'SELESAI_DIPERBAIKI' && item.status !== 'SCRAP_WRITE_OFF' && (
                          <>
                            <button
                              onClick={() => {
                                setActionModalItem({ item, actionType: 'SEND_VENDOR' });
                                setActionNotes(
                                  `Kirim klaim garansi perbaikan ke-${
                                    item.repairIteration + 1
                                  } ke ${item.vendorName}`
                                );
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-bold transition inline-flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Kirim Vendor</span>
                            </button>

                            <button
                              onClick={() => {
                                setActionModalItem({ item, actionType: 'RESOLVE_REPAIR' });
                                setActionNotes(
                                  `Hasil perbaikan ke-${item.repairIteration} diterima dalam kondisi baik, lolos QC ulang.`
                                );
                              }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold transition inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>OK Masuk Stok</span>
                            </button>

                            <button
                              onClick={() => {
                                setActionModalItem({ item, actionType: 'SCRAP' });
                                setActionNotes(
                                  'Cacat permanen tidak dapat diperbaiki, disetujui pemusnahan (write-off).'
                                );
                              }}
                              className="px-1.5 py-1 text-slate-400 hover:text-rose-600 rounded text-[10px] transition"
                              title="Musnahkan (Write-off)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
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

      {/* Modal: Catat Barang Defect Baru (Stock In Defect) */}
      {isAddDefectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Input Temuan Barang Defect (Stock In Defect)
                </h3>
              </div>
              <button
                onClick={() => setIsAddDefectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDefect} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Produk / SKU Defect *
                  </label>
                  <select
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
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
                    Qty Rusak *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formQty}
                    onChange={(e) => setFormQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor Asal (Pembuat Barang) *
                  </label>
                  <select
                    value={formVendorId}
                    onChange={(e) => setFormVendorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sumber Temuan Kerusakan *
                  </label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value="INBOUND_QC">QC Inbound (Saat Terima Vendor)</option>
                    <option value="GUDANG_SORTIR">Sortir Berkala Rak Gudang</option>
                    <option value="CUSTOMER_RETURN">Retur Komplain Pembeli</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Kerusakan (Defect Type) *
                  </label>
                  <select
                    value={formDefectType}
                    onChange={(e) => setFormDefectType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="JAHITAN_RUSAK">Jahitan Rusak / Lepas</option>
                    <option value="SOBEK_CACAT_KAIN">Sobek / Kain Bolong / Cacat Tenun</option>
                    <option value="NODA_KOTOR">Noda Minyak / Kotoran Mesin</option>
                    <option value="MALFUNGSI_RESLETING_KANCING">Malfungsi Resleting / Kancing</option>
                    <option value="CACAT_SABLON_PRINTING">Cacat Sablon / Warna Belang</option>
                    <option value="KEMASAN_RUSAK">Kemasan / Box Hancur</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Gudang Karantina *
                  </label>
                  <select
                    value={formWh}
                    onChange={(e) => setFormWh(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Petugas QC (PIC) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPic}
                    onChange={(e) => setFormPic(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deskripsi Detail Kerusakan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Jahitan bahu terlepas 4cm..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDefectModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  Simpan Barang Defect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tindakan Alur Perbaikan (Kirim Vendor / OK Masuk Stok / Scrap) */}
      {actionModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {actionModalItem.actionType === 'SEND_VENDOR' && 'Kirim Barang ke Vendor untuk Perbaikan'}
                {actionModalItem.actionType === 'RESOLVE_REPAIR' && 'Terima Hasil Perbaikan (Kembali ke Stok Normal)'}
                {actionModalItem.actionType === 'SCRAP' && 'Konfirmasi Pemusnahan Barang (Write-Off)'}
              </h3>
              <button
                onClick={() => setActionModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kode Defect:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {actionModalItem.item.defectCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor Asal:</span>
                  <span className="font-bold text-slate-900">{actionModalItem.item.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kuantitas:</span>
                  <span className="font-bold text-rose-600">{actionModalItem.item.qty} Pcs</span>
                </div>
                {actionModalItem.actionType === 'SEND_VENDOR' && (
                  <div className="flex justify-between font-bold text-amber-700 pt-1 border-t border-slate-200">
                    <span>Akan Tercatat Sebagai:</span>
                    <span>Perbaikan Ke-{actionModalItem.item.repairIteration + 1}</span>
                  </div>
                )}
              </div>

              {actionModalItem.actionType === 'RESOLVE_REPAIR' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Masukkan ke Lokasi BIN Normal *
                  </label>
                  <input
                    type="text"
                    required
                    value={targetBin}
                    onChange={(e) => setTargetBin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase"
                  />
                  <span className="text-[10px] text-slate-400">
                    Stok fisik akan otomatis ditambah kembali ke inventaris normal
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Petugas QC / Supervisor *
                </label>
                <input
                  type="text"
                  required
                  value={actionPic}
                  onChange={(e) => setActionPic(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Eksekusi / No Surat Jalan Retur
                </label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActionModalItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg text-xs font-bold shadow-xs transition ${
                    actionModalItem.actionType === 'SEND_VENDOR'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : actionModalItem.actionType === 'RESOLVE_REPAIR'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Konfirmasi Tindakan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Riwayat Perjalanan Defect (Timeline Audit) */}
      {selectedDefectHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                    {selectedDefectHistory.defectCode}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedDefectHistory.productName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vendor: {selectedDefectHistory.vendorName} • Total Qty: {selectedDefectHistory.qty} Pcs
                </p>
              </div>
              <button
                onClick={() => setSelectedDefectHistory(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Kronologis Riwayat Perbaikan (Audit Trail)
              </h4>

              <div className="relative border-l-2 border-slate-200 ml-3 space-y-5">
                {selectedDefectHistory.history.map((h, idx) => (
                  <div key={idx} className="relative pl-6">
                    {/* Circle icon */}
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xs"></div>
                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold text-xs text-slate-900">{h.action}</span>
                        {h.repairIteration > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Perbaikan Ke-{h.repairIteration}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {h.note}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                        <span>PIC: {h.pic}</span>
                        <span>•</span>
                        <span>
                          {new Date(h.date).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDefectHistory(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition"
              >
                Tutup Riwayat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
