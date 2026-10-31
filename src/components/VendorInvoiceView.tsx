import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit3,
  Calendar,
  User,
  Scan,
  Package,
  Layers,
  Search,
  Filter,
  DollarSign,
  ChevronRight,
  X,
  History,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { VendorInvoice, VendorInvoiceItem, VendorReceivingHistory } from '../types/inventory';
import { BarcodeScannerModal } from './BarcodeScannerModal';

export const VendorInvoiceView: React.FC = () => {
  const {
    vendorInvoices,
    suppliers,
    warehouses,
    bins,
    products,
    createVendorInvoice,
    receiveVendorInvoiceGoods,
    editPostedVendorInvoiceQty,
  } = useInventory();

  const [activeSubTab, setActiveSubTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PARTIAL' | 'FULFILLED'>('ALL');

  // Create Invoice Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(suppliers[0]?.id || '');
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[0]?.id || '');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [createdByPic, setCreatedByPic] = useState('Staff Purchasing DUMA');
  const [createNotes, setCreateNotes] = useState('');

  // PO Line Items for creation
  const [formItems, setFormItems] = useState<
    Array<{
      sku: string;
      productName: string;
      orderedQty: number;
      unitPrice: number;
      targetBinCode: string;
    }>
  >([
    {
      sku: products[0]?.sku || '',
      productName: products[0]?.name || '',
      orderedQty: 100,
      unitPrice: products[0]?.buyPrice || 50000,
      targetBinCode: 'BIN-A1-01',
    },
  ]);

  // Modals
  const [selectedInvoiceForReceive, setSelectedInvoiceForReceive] = useState<VendorInvoice | null>(null);
  const [receiveInputMap, setReceiveInputMap] = useState<Record<string, number>>({});
  const [receivePic, setReceivePic] = useState('Petugas Gudang Inbound');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

  // Edit Posted Receipt Modal
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<VendorInvoice | null>(null);
  const [selectedReceiptForEdit, setSelectedReceiptForEdit] = useState<VendorReceivingHistory | null>(null);
  const [editInputMap, setEditInputMap] = useState<Record<string, number>>({});
  const [editorPic, setEditorPic] = useState('Supervisor Gudang');
  const [editReasonNotes, setEditReasonNotes] = useState('');

  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedVendor = suppliers.find((s) => s.id === selectedVendorId);

  // Add Item in Create Form
  const handleAddFormItem = () => {
    const defaultSku = products[0]?.sku || '';
    const prod = products.find((p) => p.sku === defaultSku);
    setFormItems((prev) => [
      ...prev,
      {
        sku: defaultSku,
        productName: prod?.name || '',
        orderedQty: 50,
        unitPrice: prod?.buyPrice || 50000,
        targetBinCode: 'BIN-A1-01',
      },
    ]);
  };

  const handleRemoveFormItem = (idx: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateFormItem = (idx: number, field: string, value: any) => {
    setFormItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'sku') {
          const p = products.find((prod) => prod.sku === value);
          return {
            ...item,
            sku: value,
            productName: p?.name || item.productName,
            unitPrice: p?.buyPrice || item.unitPrice,
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  // Submit Create Invoice
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionAlert(null);

    if (!invoiceNumber.trim() || !poNumber.trim()) {
      setActionAlert({ type: 'error', message: 'Nomor Faktur dan Nomor PO wajib diisi!' });
      return;
    }

    const res = createVendorInvoice({
      invoiceNumber,
      poNumber,
      vendorId: selectedVendorId,
      vendorName: selectedVendor?.name || 'Vendor Terdaftar',
      targetWarehouseId,
      orderDate,
      createdByPic,
      notes: createNotes,
      items: formItems.map((item) => ({
        ...item,
        orderedQty: Number(item.orderedQty) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      })),
    });

    if (res.success) {
      setActionAlert({ type: 'success', message: res.message });
      setInvoiceNumber('');
      setPoNumber('');
      setCreateNotes('');
      setActiveSubTab('LIST');
    } else {
      setActionAlert({ type: 'error', message: res.message });
    }
  };

  // Open Receive Modal
  const handleOpenReceiveModal = (invoice: VendorInvoice) => {
    setSelectedInvoiceForReceive(invoice);
    const initialMap: Record<string, number> = {};
    invoice.items.forEach((item) => {
      // Default to remaining shortage
      initialMap[item.sku] = item.remainingQty;
    });
    setReceiveInputMap(initialMap);
    setReceivePic('Petugas Inbound DUMA');
    setReceiveNotes('');
  };

  // Submit Receive Goods
  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForReceive) return;
    setActionAlert(null);

    const receivedPayload = selectedInvoiceForReceive.items.map((item) => ({
      sku: item.sku,
      qty: Number(receiveInputMap[item.sku]) || 0,
      targetBinCode: item.targetBinCode || 'BIN-A1-01',
    }));

    const res = receiveVendorInvoiceGoods({
      invoiceId: selectedInvoiceForReceive.id,
      pic: receivePic,
      notes: receiveNotes || 'Penerimaan kedatangan barang dari vendor',
      receivedItems: receivedPayload,
    });

    if (res.success) {
      setActionAlert({
        type: 'success',
        message: `${res.message} ${res.shortageMessage ? ' ' + res.shortageMessage : ''}`,
      });
      setSelectedInvoiceForReceive(null);
    } else {
      setActionAlert({ type: 'error', message: res.message });
    }
  };

  // Open Edit Receipt Modal
  const handleOpenEditReceiptModal = (invoice: VendorInvoice, receipt: VendorReceivingHistory) => {
    setSelectedInvoiceForEdit(invoice);
    setSelectedReceiptForEdit(receipt);
    const initialMap: Record<string, number> = {};
    receipt.itemsReceived.forEach((item) => {
      initialMap[item.sku] = item.qty;
    });
    setEditInputMap(initialMap);
    setEditorPic('Supervisor Gudang');
    setEditReasonNotes(receipt.editNotes || '');
  };

  // Submit Edit Receipt
  const handleEditReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForEdit || !selectedReceiptForEdit) return;
    setActionAlert(null);

    if (!editReasonNotes.trim()) {
      setActionAlert({ type: 'error', message: 'Wajib menyertakan catatan alasan koreksi Qty!' });
      return;
    }

    const updatedPayload = selectedReceiptForEdit.itemsReceived.map((item) => ({
      sku: item.sku,
      qty: Number(editInputMap[item.sku]) || 0,
      targetBinCode: item.targetBinCode || 'BIN-A1-01',
    }));

    const res = editPostedVendorInvoiceQty({
      invoiceId: selectedInvoiceForEdit.id,
      receiptId: selectedReceiptForEdit.id,
      updatedItems: updatedPayload,
      editorPic,
      editNotes: editReasonNotes,
    });

    if (res.success) {
      setActionAlert({ type: 'success', message: res.message });
      setSelectedInvoiceForEdit(null);
      setSelectedReceiptForEdit(null);
    } else {
      setActionAlert({ type: 'error', message: res.message });
    }
  };

  // Filtered Invoices
  const filteredInvoices = vendorInvoices.filter((inv) => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchInv = inv.invoiceNumber.toLowerCase().includes(q);
      const matchPo = inv.poNumber.toLowerCase().includes(q);
      const matchVendor = inv.vendorName.toLowerCase().includes(q);
      const matchSku = inv.items.some((i) => i.sku.toLowerCase().includes(q));
      if (!matchInv && !matchPo && !matchVendor && !matchSku) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Faktur Pembelian Vendor & Kedatangan PO
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Input Faktur Pembelian Vendor, Tracking Kedatangan Barang (Partial & Full Fulfillment), Notifikasi Kekurangan PO Otomatis, dan Fitur Koreksi / Edit Qty Posting Berizin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('CREATE')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs ${
              activeSubTab === 'CREATE'
                ? 'bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            + Buat Faktur / PO Baru
          </button>
          <button
            onClick={() => setActiveSubTab('LIST')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeSubTab === 'LIST'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Daftar Faktur ({vendorInvoices.length})
          </button>
        </div>
      </div>

      {actionAlert && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in duration-200 ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {actionAlert.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <p className="text-xs font-medium">{actionAlert.message}</p>
        </div>
      )}

      {/* SUB-TAB: LIST OF INVOICES */}
      {activeSubTab === 'LIST' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No. Faktur, No. PO, Vendor, atau SKU..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter('PARTIAL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === 'PARTIAL'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Parsial / Kurang
              </button>
              <button
                onClick={() => setStatusFilter('FULFILLED')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === 'FULFILLED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Fulfilled (Lengkap)
              </button>
              <button
                onClick={() => setStatusFilter('DRAFT')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === 'DRAFT'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Draft
              </button>
            </div>
          </div>

          {/* Cards List */}
          {filteredInvoices.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Belum Ada Faktur Vendor</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Buat faktur pembelian dari vendor untuk mulai mencatat kedatangan barang, memantau kekurangan PO, dan memperbarui stok gudang.
              </p>
              <button
                onClick={() => setActiveSubTab('CREATE')}
                className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
              >
                + Buat Faktur Pembelian Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((inv) => {
                const wh = warehouses.find((w) => w.id === inv.targetWarehouseId);
                const percentReceived =
                  inv.totalOrderedQty > 0
                    ? Math.round((inv.totalReceivedQty / inv.totalOrderedQty) * 100)
                    : 0;

                return (
                  <div
                    key={inv.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition overflow-hidden"
                  >
                    {/* Invoice Top Header */}
                    <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                            PO: {inv.poNumber}
                          </span>
                          {inv.status === 'FULFILLED' && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Lengkap (Fulfilled)
                            </span>
                          )}
                          {inv.status === 'PARTIAL' && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Kedatangan Parsial (Kurang {inv.totalRemainingQty} Pcs)
                            </span>
                          )}
                          {inv.status === 'DRAFT' && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                              Belum Ada Barang Datang
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 pt-0.5">
                          <span>
                            Vendor: <strong className="text-slate-800">{inv.vendorName}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Gudang: <strong className="text-slate-800">{wh?.name || inv.targetWarehouseId}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Tgl Order: <strong>{inv.orderDate}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            PIC Pembuat: <strong>{inv.createdByPic}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {inv.status !== 'FULFILLED' && (
                          <button
                            onClick={() => handleOpenReceiveModal(inv)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                          >
                            <Truck className="w-4 h-4" />
                            Input Kedatangan Barang
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar of PO Fulfillment */}
                    <div className="px-5 py-3 bg-slate-100/60 border-b border-slate-200/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700">
                          Progres Kedatangan: {percentReceived}%
                        </span>
                        <div className="w-48 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentReceived === 100
                                ? 'bg-emerald-500'
                                : percentReceived > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${percentReceived}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[11px]">
                        <span>
                          Dipesan (PO): <strong>{inv.totalOrderedQty} Pcs</strong>
                        </span>
                        <span>
                          Diterima: <strong className="text-emerald-700">{inv.totalReceivedQty} Pcs</strong>
                        </span>
                        <span>
                          Kekurangan:{' '}
                          <strong
                            className={
                              inv.totalRemainingQty > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'
                            }
                          >
                            {inv.totalRemainingQty} Pcs
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white text-slate-500 border-b border-slate-100 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-4">Kode SKU</th>
                            <th className="py-2.5 px-4">Nama Produk</th>
                            <th className="py-2.5 px-4 text-center">Qty PO</th>
                            <th className="py-2.5 px-4 text-center">Diterima</th>
                            <th className="py-2.5 px-4 text-center">Kekurangan</th>
                            <th className="py-2.5 px-4">Target BIN</th>
                            <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {inv.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-4 font-mono font-bold text-blue-700">
                                {item.sku}
                              </td>
                              <td className="py-2.5 px-4 font-medium">{item.productName}</td>
                              <td className="py-2.5 px-4 text-center font-bold">
                                {item.orderedQty} Pcs
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold text-emerald-700">
                                {item.receivedQty} Pcs
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold">
                                {item.remainingQty > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px]">
                                    Kurang {item.remainingQty}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-semibold">Tuntas &check;</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-600">
                                {item.targetBinCode}
                              </td>
                              <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                                Rp {item.unitPrice.toLocaleString('id-ID')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Receiving History & Edit Qty Section */}
                    {inv.receivingHistory.length > 0 && (
                      <div className="p-4 bg-slate-50/80 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5" />
                            Riwayat Posting Penerimaan ({inv.receivingHistory.length} Kali Masuk)
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Fitur Edit Qty Aktif untuk Supervisor
                          </span>
                        </div>
                        <div className="space-y-2">
                          {inv.receivingHistory.map((rec) => (
                            <div
                              key={rec.id}
                              className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-800">
                                    {rec.receiptNumber}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                      rec.fulfillmentType === 'FULL'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {rec.fulfillmentType === 'FULL' ? 'Full Fulfillment' : 'Kedatangan Parsial'}
                                  </span>
                                  <span className="text-slate-400 text-[11px]">
                                    {new Date(rec.date).toLocaleString('id-ID')}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600">
                                  PIC Posting:{' '}
                                  <strong className="text-slate-800">{rec.pic}</strong> &bull; Catatan:{' '}
                                  <em>{rec.notes || '-'}</em>
                                </p>
                                {rec.editedAt && (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px]">
                                    <Edit3 className="w-3 h-3 text-amber-600" />
                                    <span>
                                      Telah Dikoreksi oleh PIC: <strong>{rec.editedByPic}</strong> ({new Date(rec.editedAt).toLocaleString('id-ID')}) - Catatan: {rec.editNotes}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                  {rec.itemsReceived.map((i, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono"
                                    >
                                      {i.sku}: +{i.qty} Pcs ({i.targetBinCode})
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <button
                                  onClick={() => handleOpenEditReceiptModal(inv, rec)}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 flex items-center gap-1 transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Koreksi / Edit Qty
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: CREATE INVOICE */}
      {activeSubTab === 'CREATE' && (
        <form onSubmit={handleCreateSubmit} className="space-y-6 animate-in fade-in">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100">
              1. Dokumen Faktur & Purchase Order Vendor
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Faktur Pembelian Vendor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Contoh: INV-MITRA-2026-001"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Purchase Order (PO) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="Contoh: PO-DKI-202610-09"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Vendor / Supplier <span className="text-rose-500">*</span>
                </label>
                {suppliers.length > 0 ? (
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value="PT Mitra Duma Kreasi"
                    disabled
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gudang Tujuan Masuk <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Order / Faktur
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PIC Pembuat Dokumen
                </label>
                <input
                  type="text"
                  value={createdByPic}
                  onChange={(e) => setCreatedByPic(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Faktur
                </label>
                <input
                  type="text"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Ketentuan pembayaran, termin dll."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. Rincian Item Barang Sesuai Purchase Order (PO)
              </h3>
              <button
                type="button"
                onClick={handleAddFormItem}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Kode SKU</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Nama Produk</th>
                    <th className="py-2.5 px-3 w-32 text-center">Qty Pesanan (PO)</th>
                    <th className="py-2.5 px-3 w-36 text-right">Harga Beli Satuan (Rp)</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Lokasi BIN Target</th>
                    <th className="py-2.5 px-3 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {formItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>

                      {/* SKU */}
                      <td className="py-2.5 px-3">
                        {products.length > 0 ? (
                          <select
                            value={item.sku}
                            onChange={(e) => handleUpdateFormItem(idx, 'sku', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                          >
                            {products.map((p) => (
                              <option key={p.sku} value={p.sku}>
                                {p.sku} - {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={item.sku}
                            onChange={(e) => handleUpdateFormItem(idx, 'sku', e.target.value)}
                            placeholder="Kode SKU"
                            className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                          />
                        )}
                      </td>

                      {/* Nama Produk */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleUpdateFormItem(idx, 'productName', e.target.value)}
                          placeholder="Nama Barang"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </td>

                      {/* Qty PO */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min={1}
                          value={item.orderedQty}
                          onChange={(e) =>
                            handleUpdateFormItem(idx, 'orderedQty', Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-24 px-2 py-1.5 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white"
                        />
                      </td>

                      {/* Harga Satuan */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateFormItem(idx, 'unitPrice', Math.max(0, parseInt(e.target.value) || 0))
                          }
                          className="w-32 px-2 py-1.5 text-xs text-right border border-slate-300 rounded-lg bg-white font-mono"
                        />
                      </td>

                      {/* BIN */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.targetBinCode}
                          onChange={(e) => handleUpdateFormItem(idx, 'targetBinCode', e.target.value)}
                          placeholder="BIN-A1-01"
                          className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                        />
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveFormItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">
                Total Item: <strong>{formItems.length} SKU</strong> &bull; Total Qty PO:{' '}
                <strong className="text-blue-700">
                  {formItems.reduce((acc, i) => acc + (Number(i.orderedQty) || 0), 0)} Pcs
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('LIST')}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Simpan Faktur & PO
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* MODAL: INPUT KEDATANGAN BARANG (RECEIVE GOODS) */}
      {selectedInvoiceForReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Penerimaan Kedatangan Barang Vendor
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Faktur: {selectedInvoiceForReceive.invoiceNumber} &bull; PO: {selectedInvoiceForReceive.poNumber} &bull; Vendor: {selectedInvoiceForReceive.vendorName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForReceive(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleReceiveSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Petugas PIC Penerimaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={receivePic}
                    onChange={(e) => setReceivePic(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Penerimaan / No. Resi / Surat Jalan Vendor
                  </label>
                  <input
                    type="text"
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    placeholder="Contoh: Datang 1 truk box, sebagian sisa menyusul"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Items to receive */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Kode SKU</th>
                      <th className="py-2.5 px-3">Nama Produk</th>
                      <th className="py-2.5 px-3 text-center">Qty PO</th>
                      <th className="py-2.5 px-3 text-center">Sudah Masuk</th>
                      <th className="py-2.5 px-3 text-center">Sisa Kurang</th>
                      <th className="py-2.5 px-3 w-32 text-center">Qty Diterima Saat Ini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoiceForReceive.items.map((item) => {
                      const curVal = receiveInputMap[item.sku] ?? item.remainingQty;
                      const willBeShortage = item.remainingQty - curVal > 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                            {item.sku}
                          </td>
                          <td className="py-2.5 px-3">{item.productName}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{item.orderedQty} Pcs</td>
                          <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                            {item.receivedQty} Pcs
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                            {item.remainingQty} Pcs
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={item.remainingQty * 2}
                              value={curVal}
                              onChange={(e) =>
                                setReceiveInputMap({
                                  ...receiveInputMap,
                                  [item.sku]: Math.max(0, parseInt(e.target.value) || 0),
                                })
                              }
                              className={`w-24 px-2 py-1.5 text-xs font-bold text-center border rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white ${
                                willBeShortage
                                  ? 'border-amber-400 bg-amber-50 text-amber-900'
                                  : 'border-slate-300'
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Partial Warning Alert */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Aturan Notifikasi Kekurangan PO Vendor (Partial Fulfillment)
                </p>
                <p className="text-[11px] text-amber-800">
                  Apabila kuantitas yang diterima saat ini kurang dari sisa kekurangan PO, status faktur akan ditandai <strong>PARTIAL</strong> dan sistem WMS akan otomatis membangkitkan notifikasi peringatan kekurangan barang datang sesuai Purchase Order.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForReceive(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Simpan Kedatangan & Masukkan Ke Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / KOREKSI QTY YANG SUDAH DIPOSTING */}
      {selectedInvoiceForEdit && selectedReceiptForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Edit3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Koreksi / Edit Qty Posting Penerimaan</h3>
                  <p className="text-xs text-amber-100">
                    Faktur: {selectedInvoiceForEdit.invoiceNumber} &bull; No. Penerimaan: {selectedReceiptForEdit.receiptNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedInvoiceForEdit(null);
                  setSelectedReceiptForEdit(null);
                }}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditReceiptSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <p className="font-bold">Perhatian: Audit Trail Koreksi Qty</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Setiap perubahan Qty yang telah diposting akan langsung menyesuaikan saldo fisik stok di gudang dan mencatat identitas PIC, tanggal koreksi, serta alasan perbaikan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama PIC Editor / Pengoreksi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editorPic}
                    onChange={(e) => setEditorPic(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Alasan Koreksi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editReasonNotes}
                    onChange={(e) => setEditReasonNotes(e.target.value)}
                    placeholder="Contoh: Salah hitung kardus nomor 4 saat bongkar muat"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Items to edit */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Kode SKU</th>
                      <th className="py-2.5 px-3">Nama Produk</th>
                      <th className="py-2.5 px-3 text-center">Qty Lama</th>
                      <th className="py-2.5 px-3 w-32 text-center">Qty Baru (Revisi)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReceiptForEdit.itemsReceived.map((item) => (
                      <tr key={item.sku} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          {item.sku}
                        </td>
                        <td className="py-2.5 px-3">{item.productName}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                          {item.qty} Pcs
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min={0}
                            value={editInputMap[item.sku] ?? item.qty}
                            onChange={(e) =>
                              setEditInputMap({
                                ...editInputMap,
                                [item.sku]: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className="w-24 px-2 py-1.5 text-xs font-bold text-center border border-amber-300 rounded-lg focus:ring-1 focus:ring-amber-500 bg-amber-50/50 text-amber-900"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoiceForEdit(null);
                    setSelectedReceiptForEdit(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Simpan Koreksi & Sinkron Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
