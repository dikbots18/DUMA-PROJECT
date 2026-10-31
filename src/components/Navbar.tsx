import React, { useState } from 'react';
import {
  Boxes,
  Bell,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Mail,
  AlertTriangle,
  ClockAlert,
  CheckCircle2,
  X,
  Send,
  ExternalLink,
  UploadCloud,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

interface NavbarProps {
  onOpenAppsScript: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAppsScript }) => {
  const {
    summary,
    products,
    resetAllDataToDefault,
    setActiveTab,
    notifications,
    dismissNotification,
    markAllNotificationsRead,
    notificationEmail,
    setNotificationEmail,
    sendSimulatedEmailAlert,
    loadSampleDumaData,
  } = useInventory();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [tempEmail, setTempEmail] = useState(notificationEmail);
  const [emailStatusToast, setEmailStatusToast] = useState<string | null>(null);

  const handleReset = () => {
    if (
      window.confirm(
        'Kosongkan seluruh data inventaris dan kembali ke kondisi awal bersih PT Duma Kreasi Indonesia?'
      )
    ) {
      resetAllDataToDefault();
    }
  };

  const handleSendEmailSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationEmail(tempEmail);
    const criticalCount = notifications.filter((n) => n.severity === 'CRITICAL').length;
    const lowCount = summary.lowStockItemsCount;

    const res = sendSimulatedEmailAlert(
      `[ALERT WMS] Peringatan ${lowCount} SKU Stok Menipis & ${criticalCount} Kritis`,
      `Sistem mendeteksi ambang batas minimum stok tercapai di PT Duma Kreasi Indonesia.`
    );

    setEmailStatusToast(res.message);
    setTimeout(() => {
      setEmailStatusToast(null);
    }, 4000);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-sm">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                WMS DUMA KREASI INDONESIA
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 rounded-md">
                PT Duma Kreasi Indonesia
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Sistem Manajemen Inventaris & Pergudangan Terpadu
            </p>
          </div>
        </div>

        {/* Global Actions & Notification System */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Load Sample Demo Button if product list is empty */}
          {products.length === 0 && (
            <button
              onClick={() => {
                if (window.confirm('Muat contoh data simulasi untuk PT Duma Kreasi Indonesia?')) {
                  loadSampleDumaData();
                }
              }}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
              title="Isi contoh data percobaan produk Duma Kreasi"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Muat Data Contoh</span>
            </button>
          )}

          {/* In-App Notification Center Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Pemberitahuan & Peringatan Stok"
              aria-label="Notifikasi sistem"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white ring-2 ring-white animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold">Pemberitahuan & Peringatan Stok</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                      {notifications.length} Alert
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] text-slate-300 hover:text-white underline mr-2"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                      Semua stok dalam kondisi optimal. Tidak ada peringatan baru.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 text-xs flex items-start gap-2.5 hover:bg-slate-50 transition ${
                          notif.severity === 'CRITICAL' ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {notif.severity === 'CRITICAL' && (
                            <span className="p-1 rounded bg-rose-100 text-rose-700 block">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {notif.severity === 'WARNING' && (
                            <span className="p-1 rounded bg-amber-100 text-amber-700 block">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {notif.severity === 'INFO' && (
                            <span className="p-1 rounded bg-blue-100 text-blue-700 block">
                              <ClockAlert className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 truncate">
                              {notif.title}
                            </span>
                            <button
                              onClick={() => dismissNotification(notif.id)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                              title="Tutup notifikasi"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          {notif.actionTab && (
                            <button
                              onClick={() => {
                                setActiveTab(notif.actionTab!);
                                setIsNotifOpen(false);
                              }}
                              className="mt-1.5 text-[10px] font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
                            >
                              <span>Tindak Lanjuti Sekarang</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Email Alert Setup Footer */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 truncate">
                    Email Alert: <strong className="text-slate-800">{notificationEmail}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      setIsEmailModalOpen(true);
                    }}
                    className="text-blue-600 font-semibold hover:underline text-[11px] shrink-0"
                  >
                    Atur Email &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Email Config Button */}
          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            title="Konfigurasi Email Notifikasi"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Email Alert</span>
          </button>

          {/* Bulk Import & Export Center button */}
          <button
            onClick={() => setActiveTab('bulk-data')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            title="Pusat Impor & Ekspor Data Massal"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Bulk Impor & Ekspor</span>
            <span className="sm:hidden">Data</span>
          </button>

          {/* Google Apps Script Integration button */}
          <button
            onClick={onOpenAppsScript}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Google Apps Script</span>
            <span className="sm:hidden">Script</span>
          </button>

          {/* Reset Clean Data */}
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Kosongkan data inventaris"
            aria-label="Reset inventaris"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal: Konfigurasi & Simulasi Notifikasi Email */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Sistem Notifikasi Email Otomatis</h3>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmailSimulation} className="p-5 space-y-4">
              {emailStatusToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{emailStatusToast}</span>
                </div>
              )}

              <p className="text-xs text-slate-600">
                Sistem akan memantau sisa stok produk secara real-time dan mengirimkan email peringatan
                ketika stok mencapai ambang batas <strong>'low stock'</strong> atau <strong>'out of stock'</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Email Penerima Peringatan *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin.gudang@dumakreasi.co.id"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-800 block">Kriteria Peringatan Aktif:</span>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                  <span>Kirim email saat stok $\le$ batas minimum (*Low Stock Alert*)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                  <span>Kirim email darurat saat stok habis total (*Out of Stock*)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                  <span>Kirim laporan berkala harian status gudang PT Duma Kreasi Indonesia</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Simpan & Uji Kirim Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
