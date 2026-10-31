import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Wrench,
  CheckCheck,
  Mail,
  Send,
  Sliders,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { NotificationSeverity } from '../types/inventory';

export const NotificationCenterView: React.FC = () => {
  const {
    notifications,
    dismissNotification,
    markAllNotificationsRead,
    notificationEmail,
    setNotificationEmail,
    sendSimulatedEmailAlert,
    setActiveTab,
  } = useInventory();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'DEFECT' | 'PRE_ORDER'>('ALL');
  const [emailInput, setEmailInput] = useState(notificationEmail);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState<string | null>(null);

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'CRITICAL') return n.severity === 'CRITICAL';
    if (activeFilter === 'WARNING') return n.severity === 'WARNING';
    if (activeFilter === 'DEFECT') return n.category === 'DEFECT';
    if (activeFilter === 'PRE_ORDER') return n.category === 'PRE_ORDER';
    return true;
  });

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationEmail(emailInput);
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 3000);
  };

  const handleTestEmail = () => {
    setEmailSending(true);
    setEmailSentSuccess(null);
    setTimeout(() => {
      const msg = sendSimulatedEmailAlert(
        'Peringatan Restock Otomatis: SKU Menipis di Gudang PT Duma Kreasi Indonesia'
      );
      setEmailSending(false);
      setEmailSentSuccess(msg);
      setTimeout(() => setEmailSentSuccess(null), 5000);
    }, 700);
  };

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertOctagon className="w-3 h-3" />
            STOK KOSONG (KRITIS)
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            LOW STOCK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Bell className="w-3 h-3" />
            INFO OPERASIONAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded uppercase tracking-wider">
              Sistem Peringatan Dini
            </span>
            <span className="text-xs text-slate-400 font-mono">STOCK-ALERT-ENGINE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Pusat Notifikasi & Alarm Stok</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring otomatis ketersediaan barang di seluruh gudang PT Duma Kreasi Indonesia dengan integrasi email & in-app alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <CheckCheck className="w-4 h-4 text-slate-500" />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Left Notification List (2/3), Right Email Settings (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Notification Stream */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Tabs */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'ALL', label: `Semua (${notifications.length})` },
                {
                  id: 'CRITICAL',
                  label: `Stok Habis (${notifications.filter((n) => n.severity === 'CRITICAL').length})`,
                },
                {
                  id: 'WARNING',
                  label: `Low Stock (${notifications.filter((n) => n.severity === 'WARNING').length})`,
                },
                {
                  id: 'DEFECT',
                  label: `Defect QC (${notifications.filter((n) => n.category === 'DEFECT').length})`,
                },
                {
                  id: 'PRE_ORDER',
                  label: `Pre-Order (${notifications.filter((n) => n.category === 'PRE_ORDER').length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  activeFilter === tab.id
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List of Notification Cards */}
          {filteredNotifications.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-xs">
              <ShieldAlert className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Kondisi Stok Sangat Prima</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Tidak ada peringatan kritis atau SKU yang mencapai ambang batas low stock saat ini. Sistem akan terus memonitor transaksi secara real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    notif.severity === 'CRITICAL'
                      ? 'bg-rose-50/50 border-rose-200'
                      : notif.severity === 'WARNING'
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-lg shrink-0 ${
                        notif.severity === 'CRITICAL'
                          ? 'bg-rose-500 text-white'
                          : notif.severity === 'WARNING'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {notif.category === 'DEFECT' ? (
                        <Wrench className="w-4 h-4" />
                      ) : notif.category === 'PRE_ORDER' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSeverityBadge(notif.severity)}
                        <span className="text-[11px] text-slate-400">
                          {new Date(notif.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{notif.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{notif.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    {notif.actionTargetTab && (
                      <button
                        onClick={() => setActiveTab(notif.actionTargetTab!)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                      >
                        <span>Tindak Lanjut</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition"
                      title="Hapus notifikasi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Email & Dispatch Engine Configuration */}
        <div className="space-y-4">
          {/* Email Settings Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Konfigurasi Email Notifikasi</h3>
            </div>
            <p className="text-xs text-slate-500">
              Sistem akan secara otomatis mengirimkan rekapan dan peringatan darurat ke email PIC logistik saat stok SKU menyentuh batas minimum.
            </p>

            <form onSubmit={handleSaveEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Tujuan PIC / Kepala Gudang:
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="contoh: kepala.gudang@dumakreasi.co.id"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Email Penerima</span>
              </button>

              {emailSaved && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Email notifikasi berhasil diperbarui!</span>
                </div>
              )}
            </form>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 mb-2">Uji Coba Pengiriman:</h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Kirimkan simulasi email peringatan stok ke <strong>{notificationEmail}</strong> untuk memeriksa format surat resmi.
              </p>
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={emailSending}
                className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{emailSending ? 'Mengirim Simulasi...' : 'Kirim Email Simulasi Sekarang'}</span>
              </button>

              {emailSentSuccess && (
                <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[11px] font-medium leading-relaxed">
                  {emailSentSuccess}
                </div>
              )}
            </div>
          </div>

          {/* Alert Threshold Guide */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <Sliders className="w-4 h-4 text-slate-600" />
              <span>Standar Operasional Ambang Batas (SOP)</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
              <li>
                <strong>Stok Habis (0 Pcs):</strong> Notifikasi berkategori <em>CRITICAL</em> langsung dibroadcast ke dashboard dan antrean email.
              </li>
              <li>
                <strong>Low Stock:</strong> Terpicu ketika total stok di semua gudang &lt;= <code>minStockAlert</code> per SKU.
              </li>
              <li>
                <strong>Defect Baru:</strong> Dikeluarkan saat QC mencatat ada barang cacat dari supplier yang butuh retur/perbaikan.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
