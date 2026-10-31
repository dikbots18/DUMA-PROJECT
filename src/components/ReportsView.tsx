import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building2,
  Filter,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { ReportType, ReportPeriod } from '../types/inventory';

export const ReportsView: React.FC = () => {
  const {
    products,
    stockPositions,
    warehouses,
    inbounds,
    outbounds,
    preOrders,
    defectRecords,
    partners,
  } = useInventory();

  const [reportType, setReportType] = useState<ReportType>('RINGKASAN_STOK_BULANAN');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('THIS_MONTH');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchTable, setSearchTable] = useState<string>('');

  // Date range determination
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    let label = 'Bulan Ini';

    if (reportPeriod === 'TODAY') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = 'Hari Ini (' + now.toLocaleDateString('id-ID') + ')';
    } else if (reportPeriod === 'LAST_7_DAYS') {
      start = new Date();
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      label = '7 Hari Terakhir';
    } else if (reportPeriod === 'LAST_30_DAYS') {
      start = new Date();
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      label = '30 Hari Terakhir';
    } else if (reportPeriod === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    } else if (reportPeriod === 'LAST_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = start.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    } else if (reportPeriod === 'THIS_QUARTER') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
      label = `Kuartal ${q + 1} (${now.getFullYear()})`;
    } else if (reportPeriod === 'CUSTOM') {
      if (customStartDate) {
        start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
      }
      if (customEndDate) {
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      }
      label = `${customStartDate || 'Awal'} s/d ${customEndDate || 'Sekarang'}`;
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [reportPeriod, customStartDate, customEndDate]);

  // Categories list
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  // Build dataset based on report type
  const reportData = useMemo(() => {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    if (reportType === 'RINGKASAN_STOK_BULANAN') {
      // Stock valuation & positions
      return products
        .filter((p) => selectedCategory === 'ALL' || p.category === selectedCategory)
        .map((prod) => {
          const positions = stockPositions.filter(
            (sp) => sp.sku === prod.sku && (selectedWarehouse === 'ALL' || sp.warehouseId === selectedWarehouse)
          );
          const totalQty = positions.reduce((acc, p) => acc + p.qtyOnHand, 0);
          const valuation = totalQty * prod.purchasePrice;
          const status =
            totalQty === 0 ? 'Out of Stock' : totalQty <= prod.minStockAlert ? 'Low Stock' : 'Aman';

          return {
            id: prod.sku,
            col1: prod.sku,
            col2: prod.name,
            col3: prod.category,
            col4: `${totalQty.toLocaleString('id-ID')} ${prod.unit}`,
            col5: `${prod.minStockAlert} ${prod.unit}`,
            col6: `Rp ${prod.purchasePrice.toLocaleString('id-ID')}`,
            col7: `Rp ${valuation.toLocaleString('id-ID')}`,
            status,
            numericQty: totalQty,
            numericValuation: valuation,
          };
        })
        .filter((item) => {
          if (!searchTable) return true;
          const q = searchTable.toLowerCase();
          return item.col1.toLowerCase().includes(q) || item.col2.toLowerCase().includes(q);
        });
    }

    if (reportType === 'PERGERAKAN_MUTASI_SKU') {
      // SKU movement analysis
      return products
        .filter((p) => selectedCategory === 'ALL' || p.category === selectedCategory)
        .map((prod) => {
          const inCount = inbounds
            .filter(
              (i) =>
                i.sku === prod.sku &&
                (selectedWarehouse === 'ALL' || i.targetWarehouseId === selectedWarehouse) &&
                new Date(i.timestamp).getTime() >= startTime &&
                new Date(i.timestamp).getTime() <= endTime
            )
            .reduce((acc, i) => acc + i.qty, 0);

          const outCount = outbounds
            .filter(
              (o) =>
                o.sku === prod.sku &&
                (selectedWarehouse === 'ALL' || o.sourceWarehouseId === selectedWarehouse) &&
                new Date(o.timestamp).getTime() >= startTime &&
                new Date(o.timestamp).getTime() <= endTime
            )
            .reduce((acc, o) => acc + o.qty, 0);

          const net = inCount - outCount;
          const velocity = outCount > 50 ? 'Tinggi (Fast Moving)' : outCount > 0 ? 'Sedang' : 'Stagnan (Slow)';

          return {
            id: prod.sku,
            col1: prod.sku,
            col2: prod.name,
            col3: prod.category,
            col4: `+${inCount.toLocaleString('id-ID')} ${prod.unit}`,
            col5: `-${outCount.toLocaleString('id-ID')} ${prod.unit}`,
            col6: `${net >= 0 ? '+' : ''}${net.toLocaleString('id-ID')} ${prod.unit}`,
            col7: velocity,
            status: net >= 0 ? 'Surplus' : 'Defisit',
            numericQty: outCount,
            numericValuation: inCount,
          };
        })
        .filter((item) => {
          if (!searchTable) return true;
          const q = searchTable.toLowerCase();
          return item.col1.toLowerCase().includes(q) || item.col2.toLowerCase().includes(q);
        });
    }

    if (reportType === 'VENDOR_DEFECT_QC') {
      // Defect and QC repair report
      return defectRecords
        .filter((d) => {
          const t = new Date(d.dateReported).getTime();
          return t >= startTime && t <= endTime;
        })
        .filter((d) => selectedWarehouse === 'ALL' || d.warehouseId === selectedWarehouse)
        .map((d) => ({
          id: d.id,
          col1: d.ticketNo,
          col2: d.sku,
          col3: d.productName,
          col4: d.vendorName,
          col5: `${d.qty} Pcs`,
          col6: `Siklus #${d.repairCycle} (${d.defectType})`,
          col7: `Rp ${d.estimatedCost.toLocaleString('id-ID')}`,
          status:
            d.status === 'RESOLVED'
              ? 'Selesai / Lolos QC'
              : d.status === 'UNDER_REPAIR'
              ? 'Dalam Perbaikan'
              : 'Menunggu Review',
          numericQty: d.qty,
          numericValuation: d.estimatedCost,
        }))
        .filter((item) => {
          if (!searchTable) return true;
          const q = searchTable.toLowerCase();
          return (
            item.col1.toLowerCase().includes(q) ||
            item.col2.toLowerCase().includes(q) ||
            item.col4.toLowerCase().includes(q)
          );
        });
    }

    if (reportType === 'PRE_ORDER_FULFILLMENT') {
      // Pre-order fulfillment report
      return preOrders
        .filter((po) => {
          const t = new Date(po.createdAt).getTime();
          return t >= startTime && t <= endTime;
        })
        .map((po) => {
          const target = warehouses.find((w) => w.id === po.allocatedWarehouseId)?.name || 'Semua Gudang';
          return {
            id: po.id,
            col1: po.poNumber,
            col2: po.customerName,
            col3: `${po.sku} - ${po.productName}`,
            col4: `${po.qtyOrdered} Pcs`,
            col5: target,
            col6: new Date(po.targetReadyDate).toLocaleDateString('id-ID'),
            col7: po.salesChannel,
            status:
              po.status === 'SHIPPED'
                ? 'Terkirim'
                : po.status === 'READY_TO_SHIP'
                ? 'Siap Kirim'
                : 'Menunggu Stok',
            numericQty: po.qtyOrdered,
            numericValuation: 0,
          };
        })
        .filter((item) => {
          if (!searchTable) return true;
          const q = searchTable.toLowerCase();
          return (
            item.col1.toLowerCase().includes(q) ||
            item.col2.toLowerCase().includes(q) ||
            item.col3.toLowerCase().includes(q)
          );
        });
    }

    // AUDIT_LOG_IN_OUT
    const combinedLogs = [
      ...inbounds
        .filter((i) => {
          const t = new Date(i.timestamp).getTime();
          return (
            t >= startTime &&
            t <= endTime &&
            (selectedWarehouse === 'ALL' || i.targetWarehouseId === selectedWarehouse)
          );
        })
        .map((i) => ({
          id: i.id,
          date: i.timestamp,
          type: 'INBOUND',
          doc: i.invoiceNo,
          sku: i.sku,
          name: i.productName,
          qty: `+${i.qty}`,
          location: `${i.targetWarehouseId} (${i.targetBinCode})`,
          pic: i.pic,
          partner: i.sourceOrVendor,
        })),
      ...outbounds
        .filter((o) => {
          const t = new Date(o.timestamp).getTime();
          return (
            t >= startTime &&
            t <= endTime &&
            (selectedWarehouse === 'ALL' || o.sourceWarehouseId === selectedWarehouse)
          );
        })
        .map((o) => ({
          id: o.id,
          date: o.timestamp,
          type: 'OUTBOUND',
          doc: o.transactionNo,
          sku: o.sku,
          name: o.productName,
          qty: `-${o.qty}`,
          location: `${o.sourceWarehouseId} (${o.sourceBinCode})`,
          pic: o.pic,
          partner: o.destinationOrCustomer,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return combinedLogs
      .map((log) => ({
        id: log.id,
        col1: new Date(log.date).toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        col2: log.doc,
        col3: `${log.sku} - ${log.name}`,
        col4: log.qty,
        col5: log.partner,
        col6: log.location,
        col7: log.pic,
        status: log.type === 'INBOUND' ? 'Masuk (+)' : 'Keluar (-)',
        numericQty: 0,
        numericValuation: 0,
      }))
      .filter((item) => {
        if (!searchTable) return true;
        const q = searchTable.toLowerCase();
        return (
          item.col1.toLowerCase().includes(q) ||
          item.col2.toLowerCase().includes(q) ||
          item.col3.toLowerCase().includes(q) ||
          item.col5.toLowerCase().includes(q)
        );
      });
  }, [
    reportType,
    startDate,
    endDate,
    products,
    stockPositions,
    inbounds,
    outbounds,
    preOrders,
    defectRecords,
    warehouses,
    selectedWarehouse,
    selectedCategory,
    searchTable,
  ]);

  // Column header configurations
  const columns = useMemo(() => {
    switch (reportType) {
      case 'RINGKASAN_STOK_BULANAN':
        return [
          { header: 'SKU', key: 'col1' },
          { header: 'Nama Produk', key: 'col2' },
          { header: 'Kategori', key: 'col3' },
          { header: 'Total Stok', key: 'col4' },
          { header: 'Batas Minimum', key: 'col5' },
          { header: 'Harga Beli (HPP)', key: 'col6' },
          { header: 'Valuasi Aset', key: 'col7' },
          { header: 'Status Stok', key: 'status' },
        ];
      case 'PERGERAKAN_MUTASI_SKU':
        return [
          { header: 'SKU', key: 'col1' },
          { header: 'Nama Produk', key: 'col2' },
          { header: 'Kategori', key: 'col3' },
          { header: 'Total Inbound (+)', key: 'col4' },
          { header: 'Total Outbound (-)', key: 'col5' },
          { header: 'Net Flow', key: 'col6' },
          { header: 'Klasifikasi Perputaran', key: 'col7' },
          { header: 'Status Arus', key: 'status' },
        ];
      case 'VENDOR_DEFECT_QC':
        return [
          { header: 'No Tiket QC', key: 'col1' },
          { header: 'SKU', key: 'col2' },
          { header: 'Nama Produk', key: 'col3' },
          { header: 'Nama Vendor / Rekanan', key: 'col4' },
          { header: 'Qty Defect', key: 'col5' },
          { header: 'Siklus Perbaikan & Gejala', key: 'col6' },
          { header: 'Estimasi Biaya', key: 'col7' },
          { header: 'Status QC', key: 'status' },
        ];
      case 'PRE_ORDER_FULFILLMENT':
        return [
          { header: 'No PO', key: 'col1' },
          { header: 'Customer / Buyer', key: 'col2' },
          { header: 'Item Pre-Order', key: 'col3' },
          { header: 'Qty Dipesan', key: 'col4' },
          { header: 'Gudang Alokasi', key: 'col5' },
          { header: 'Target Ready', key: 'col6' },
          { header: 'Sales Channel', key: 'col7' },
          { header: 'Status Fulfillment', key: 'status' },
        ];
      case 'AUDIT_LOG_IN_OUT':
      default:
        return [
          { header: 'Waktu Transaksi', key: 'col1' },
          { header: 'No Dokumen / Ref', key: 'col2' },
          { header: 'Barang & SKU', key: 'col3' },
          { header: 'Qty Perubahan', key: 'col4' },
          { header: 'Pihak Terkait (Vendor/Buyer)', key: 'col5' },
          { header: 'Gudang & BIN', key: 'col6' },
          { header: 'Petugas PIC', key: 'col7' },
          { header: 'Arah Log', key: 'status' },
        ];
    }
  }, [reportType]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = columns.map((c) => c.header);
    const rows = reportData.map((row) => [
      `"${row.col1}"`,
      `"${row.col2}"`,
      `"${row.col3}"`,
      `"${row.col4}"`,
      `"${row.col5}"`,
      `"${row.col6}"`,
      `"${row.col7}"`,
      `"${row.status}"`,
    ]);

    const csvTitle = [
      'LAPORAN RESMI WMS DUMA KREASI INDONESIA',
      `Tipe Laporan: ${reportType.replace(/_/g, ' ')}`,
      `Periode: ${periodLabel}`,
      `Gudang: ${selectedWarehouse === 'ALL' ? 'Semua Gudang' : selectedWarehouse}`,
      `Dicetak pada: ${new Date().toLocaleString('id-ID')}`,
      '',
    ].join('\n');

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      csvTitle +
      '\n' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_DumaKreasi_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print / PDF
  const handlePrint = () => {
    window.print();
  };

  // KPI Summary calculation for top cards
  const kpis = useMemo(() => {
    if (reportType === 'RINGKASAN_STOK_BULANAN') {
      const totalItems = reportData.length;
      const totalUnits = reportData.reduce((acc, r) => acc + (r.numericQty || 0), 0);
      const totalValuation = reportData.reduce((acc, r) => acc + (r.numericValuation || 0), 0);
      const lowStockCount = reportData.filter((r) => r.status === 'Low Stock' || r.status === 'Out of Stock').length;
      return [
        { label: 'Total SKU Terdaftar', value: `${totalItems} SKU`, icon: Layers, color: 'text-blue-600' },
        { label: 'Total Fisik Barang On-Hand', value: `${totalUnits.toLocaleString('id-ID')} Pcs`, icon: BarChart3, color: 'text-emerald-600' },
        { label: 'Total Valuasi HPP Aset', value: `Rp ${totalValuation.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-indigo-600' },
        { label: 'SKU Kritis (Low / Kosong)', value: `${lowStockCount} SKU`, icon: AlertTriangle, color: 'text-rose-600' },
      ];
    }
    if (reportType === 'PERGERAKAN_MUTASI_SKU') {
      const totalIn = reportData.reduce((acc, r) => acc + (r.numericValuation || 0), 0);
      const totalOut = reportData.reduce((acc, r) => acc + (r.numericQty || 0), 0);
      const net = totalIn - totalOut;
      return [
        { label: 'Total Volume Masuk (Inbound)', value: `+${totalIn.toLocaleString('id-ID')} Pcs`, icon: TrendingUp, color: 'text-emerald-600' },
        { label: 'Total Volume Keluar (Outbound)', value: `-${totalOut.toLocaleString('id-ID')} Pcs`, icon: TrendingUp, color: 'text-blue-600' },
        { label: 'Net Perubahan Stok', value: `${net >= 0 ? '+' : ''}${net.toLocaleString('id-ID')} Pcs`, icon: BarChart3, color: net >= 0 ? 'text-emerald-600' : 'text-rose-600' },
        { label: 'SKU Aktif Bergerak', value: `${reportData.filter(r => (r.numericQty || 0) > 0 || (r.numericValuation || 0) > 0).length} SKU`, icon: Layers, color: 'text-slate-800' },
      ];
    }
    return [
      { label: 'Total Baris Rekapitulasi', value: `${reportData.length} Data`, icon: FileText, color: 'text-blue-600' },
      { label: 'Periode Analisis', value: periodLabel, icon: Calendar, color: 'text-indigo-600' },
      { label: 'Gudang Terpilih', value: selectedWarehouse === 'ALL' ? 'Semua Fasilitas' : selectedWarehouse, icon: Building2, color: 'text-emerald-600' },
      { label: 'Status Data', value: 'Terverifikasi Real-Time', icon: CheckCircle2, color: 'text-teal-600' },
    ];
  }, [reportType, reportData, periodLabel, selectedWarehouse]);

  return (
    <div className="space-y-6">
      {/* Printable Letterhead (visible only when printing) */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
              PT DUMA KREASI INDONESIA
            </h1>
            <p className="text-xs text-slate-600">
              Sistem Manajemen Pergudangan & Logistik Terpadu (WMS)
            </p>
            <p className="text-[11px] text-slate-500">
              Kawasan Industri Pulogadung & Jakarta Barat Hub | cs@dumakreasi.co.id
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded">
              DOKUMEN RESMI INVENTARIS
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-200 text-xs grid grid-cols-3 gap-2">
          <div>
            <span className="text-slate-500">Jenis Laporan:</span>{' '}
            <strong className="text-slate-900">{reportType.replace(/_/g, ' ')}</strong>
          </div>
          <div>
            <span className="text-slate-500">Periode:</span>{' '}
            <strong className="text-slate-900">{periodLabel}</strong>
          </div>
          <div>
            <span className="text-slate-500">Cakupan Fasilitas:</span>{' '}
            <strong className="text-slate-900">
              {selectedWarehouse === 'ALL'
                ? 'Semua Gudang (Konsolidasian)'
                : warehouses.find((w) => w.id === selectedWarehouse)?.name || selectedWarehouse}
            </strong>
          </div>
        </div>
      </div>

      {/* Screen Header & Action Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded uppercase tracking-wider">
              Modul Pelaporan Eksekutif
            </span>
            <span className="text-xs text-slate-400 font-mono">WMS-REP-v3</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Laporan Kustom & Ekspor Data</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hasilkan rekapitulasi inventaris, mutasi perputaran barang, laporan defect supplier, dan audit trail siap cetak PDF atau ekspor CSV
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            title="Download CSV Spreadsheet"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            title="Cetak format PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Ekspor PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Configuration Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jenis Laporan
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="RINGKASAN_STOK_BULANAN">1. Ringkasan Stok & Valuasi HPP Bulanan</option>
              <option value="PERGERAKAN_MUTASI_SKU">2. Pergerakan & Mutasi SKU (Turnover)</option>
              <option value="VENDOR_DEFECT_QC">3. Laporan Kualitas Vendor & Defect Tracker</option>
              <option value="PRE_ORDER_FULFILLMENT">4. Laporan Pemenuhan Pre-Order / Backorder</option>
              <option value="AUDIT_LOG_IN_OUT">5. Audit Log Lengkap Inbound & Outbound</option>
            </select>
          </div>

          {/* Period Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Periode Waktu
            </label>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value as ReportPeriod)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="TODAY">Hari Ini</option>
              <option value="LAST_7_DAYS">7 Hari Terakhir</option>
              <option value="THIS_MONTH">Bulan Berjalan</option>
              <option value="LAST_MONTH">Bulan Kemarin</option>
              <option value="THIS_QUARTER">Kuartal Berjalan</option>
              <option value="CUSTOM">Rentang Tanggal Kustom</option>
            </select>
          </div>

          {/* Warehouse Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lokasi Fasilitas Gudang
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Gudang (Konsolidasi)</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Filter Kategori
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom date range inputs when CUSTOM is chosen */}
        {reportPeriod === 'CUSTOM' && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-600">Pilih Rentang Tanggal:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
            />
            <span className="text-xs text-slate-400">sampai</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
            />
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className={`text-xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Preview Tabel Laporan:</span>
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
              {reportData.length} Baris Ditemukan
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter teks dalam tabel..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {reportData.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              Tidak ada data laporan yang cocok dengan parameter filter ini. Silakan sesuaikan jenis laporan atau rentang tanggal.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 uppercase tracking-wider text-[11px] print:bg-slate-100">
                <tr>
                  <th className="px-4 py-3">No</th>
                  {columns.map((c, i) => (
                    <th key={i} className="px-4 py-3">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:text-[10px]">
                {reportData.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.col1}</td>
                    <td className="px-4 py-3 text-slate-800">{row.col2}</td>
                    <td className="px-4 py-3 text-slate-600">{row.col3}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.col4}</td>
                    <td className="px-4 py-3 text-slate-600">{row.col5}</td>
                    <td className="px-4 py-3 text-slate-700">{row.col6}</td>
                    <td className="px-4 py-3 text-slate-700">{row.col7}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === 'Low Stock' || row.status === 'Out of Stock' || row.status === 'Defisit'
                            ? 'bg-rose-100 text-rose-800'
                            : row.status === 'Aman' || row.status === 'Surplus' || row.status === 'Selesai / Lolos QC' || row.status === 'Terkirim'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Official Signatures Section (Visible in Print / PDF mode) */}
      <div className="hidden print:block mt-12 pt-8 border-t border-slate-300">
        <p className="text-xs text-slate-500 mb-6 italic">
          Laporan ini diterbitkan secara otomatis oleh sistem WMS DUMA KREASI INDONESIA dan sah tanpa materai bilamana ditandatangani oleh pejabat berwenang di bawah ini.
        </p>
        <div className="grid grid-cols-3 gap-8 text-center text-xs">
          <div>
            <p className="text-slate-500">Dibuat Oleh (PIC Gudang):</p>
            <div className="h-20" />
            <p className="font-bold border-t border-slate-400 pt-1 text-slate-900">
              ( .................................................. )
            </p>
            <p className="text-[10px] text-slate-400">Warehouse Staff / Admin</p>
          </div>
          <div>
            <p className="text-slate-500">Diperiksa Oleh (QC / Spv):</p>
            <div className="h-20" />
            <p className="font-bold border-t border-slate-400 pt-1 text-slate-900">
              ( .................................................. )
            </p>
            <p className="text-[10px] text-slate-400">Supervisor Operasional</p>
          </div>
          <div>
            <p className="text-slate-500">Disetujui Oleh (Manajemen):</p>
            <div className="h-20" />
            <p className="font-bold border-t border-slate-400 pt-1 text-slate-900">
              ( .................................................. )
            </p>
            <p className="text-[10px] text-slate-400">Head of Supply Chain</p>
          </div>
        </div>
      </div>
    </div>
  );
};
