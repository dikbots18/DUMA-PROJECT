import React from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  Warehouse,
  ArrowDownToDot,
  ArrowUpFromDot,
  ClockAlert,
  ScrollText,
  FileText,
  ArrowLeftRight,
  Handshake,
  AlertTriangle,
  CodeXml,
  BarChart3,
  Bell,
  Database,
  UploadCloud,
  ClipboardList,
  Lock,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

interface SidebarProps {
  onOpenAppsScript: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAppsScript }) => {
  const { activeTab, setActiveTab, summary, notifications, vendorInvoices, stockOpnames } = useInventory();

  const hasActiveLock = stockOpnames.some((s) => s.status === 'LOCKED_COUNTING');

  const menuSections = [
    {
      label: 'Ringkasan & Master Data',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Informasi',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'catalog',
          label: 'Katalog Barang (SKU)',
          icon: Package,
          badge: summary.lowStockItemsCount > 0 ? `${summary.lowStockItemsCount} Low` : null,
          badgeColor: 'bg-amber-100 text-amber-800',
        },
        {
          id: 'stock-status',
          label: 'Status Stock & BIN',
          icon: Layers,
          badge: null,
        },
        {
          id: 'warehouses',
          label: 'Lokasi Gudang',
          icon: Warehouse,
          badge: null,
        },
      ],
    },
    {
      label: 'Transaksi Inventaris',
      items: [
        {
          id: 'vendor-invoices',
          label: 'Faktur Vendor & PO',
          icon: FileText,
          badge: vendorInvoices.length > 0 ? `${vendorInvoices.length} Faktur` : 'PO',
          badgeColor: 'bg-indigo-100 text-indigo-800 font-bold',
        },
        {
          id: 'inbound',
          label: 'Stock In (Multi-SKU)',
          icon: ArrowDownToDot,
          badge: 'Masuk',
          badgeColor: 'bg-emerald-100 text-emerald-800',
        },
        {
          id: 'outbound',
          label: 'Stock Out (Multi-SKU)',
          icon: ArrowUpFromDot,
          badge: 'Keluar',
          badgeColor: 'bg-blue-100 text-blue-800',
        },
        {
          id: 'pre-order',
          label: 'Stock Out Pre-Order',
          icon: ClockAlert,
          badge: summary.totalPendingPOCount > 0 ? `${summary.totalPendingPOCount} PO` : null,
          badgeColor: 'bg-purple-100 text-purple-800',
        },
      ],
    },
    {
      label: 'Audit, Laporan & Notifikasi',
      items: [
        {
          id: 'stock-opname',
          label: 'Stock Opname (Lock)',
          icon: ClipboardList,
          badge: hasActiveLock ? 'LOCKED 🔒' : 'Audit',
          badgeColor: hasActiveLock ? 'bg-amber-100 text-amber-800 font-bold animate-pulse' : 'bg-slate-700 text-slate-300',
        },
        {
          id: 'reports',
          label: 'Laporan Kustom & Ekspor',
          icon: BarChart3,
          badge: null,
          badgeColor: '',
        },
        {
          id: 'bulk-data',
          label: 'Bulk Import & Export',
          icon: UploadCloud,
          badge: 'Baru',
          badgeColor: 'bg-emerald-100 text-emerald-800 font-bold',
        },
        {
          id: 'notifications',
          label: 'Pusat Notifikasi Stok',
          icon: Bell,
          badge: notifications.length > 0 ? `${notifications.length}` : null,
          badgeColor: 'bg-rose-100 text-rose-800 font-bold',
        },
        {
          id: 'log-inbound',
          label: 'Log Barang Masuk',
          icon: ScrollText,
          badge: null,
        },
        {
          id: 'log-outbound',
          label: 'Log Barang Keluar',
          icon: FileText,
          badge: null,
        },
        {
          id: 'stock-mutation',
          label: 'Mutasi Semua Stock',
          icon: ArrowLeftRight,
          badge: 'Ledger',
          badgeColor: 'bg-slate-100 text-slate-700',
        },
      ],
    },
    {
      label: 'QC & Rekanan Eksternal',
      items: [
        {
          id: 'defects',
          label: 'Defect Tracker (QC)',
          icon: AlertTriangle,
          badge: summary.totalDefectCount > 0 ? `${summary.totalDefectCount} Defect` : null,
          badgeColor: 'bg-rose-100 text-rose-800 font-bold',
        },
        {
          id: 'suppliers',
          label: 'Mitra & Supplier',
          icon: Handshake,
          badge: null,
        },
        {
          id: 'appscript',
          label: 'Google Apps Script',
          icon: CodeXml,
          badge: 'Sync',
          badgeColor: 'bg-emerald-100 text-emerald-800',
          onClick: onOpenAppsScript,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen select-none border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-xs font-bold text-slate-200 truncate">
            PT Duma Kreasi Indonesia
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {menuSections.map((section, idx) => (
          <div key={idx}>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      } else {
                        setActiveTab(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                          item.badgeColor || 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400">
        <p className="font-bold text-slate-200">PT Duma Kreasi Indonesia</p>
        <p className="text-[10px] text-slate-500">Enterprise Warehouse Management</p>
      </div>
    </aside>
  );
};
