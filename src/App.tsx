import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CatalogView } from './components/CatalogView';
import { StockStatusView } from './components/StockStatusView';
import { WarehouseLocationsView } from './components/WarehouseLocationsView';
import { InboundView } from './components/InboundView';
import { OutboundView } from './components/OutboundView';
import { PreOrderView } from './components/PreOrderView';
import { LogInboundView } from './components/LogInboundView';
import { LogOutboundView } from './components/LogOutboundView';
import { StockMutationView } from './components/StockMutationView';
import { PartnersSuppliersView } from './components/PartnersSuppliersView';
import { DefectTrackerView } from './components/DefectTrackerView';
import { ReportsView } from './components/ReportsView';
import { NotificationCenterView } from './components/NotificationCenterView';
import { BulkDataCenterView } from './components/BulkDataCenterView';
import { VendorInvoiceView } from './components/VendorInvoiceView';
import { StockOpnameView } from './components/StockOpnameView';
import { AppsScriptSyncModal } from './components/AppsScriptSyncModal';

const AppContent: React.FC = () => {
  const { activeTab } = useInventory();
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar onOpenAppsScript={() => setIsAppsScriptModalOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onOpenAppsScript={() => setIsAppsScriptModalOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'catalog' && <CatalogView />}
          {activeTab === 'stock-status' && <StockStatusView />}
          {activeTab === 'warehouses' && <WarehouseLocationsView />}
          {activeTab === 'vendor-invoices' && <VendorInvoiceView />}
          {activeTab === 'inbound' && <InboundView />}
          {activeTab === 'outbound' && <OutboundView />}
          {activeTab === 'pre-order' && <PreOrderView />}
          {activeTab === 'stock-opname' && <StockOpnameView />}
          {activeTab === 'log-inbound' && <LogInboundView />}
          {activeTab === 'log-outbound' && <LogOutboundView />}
          {activeTab === 'stock-mutation' && <StockMutationView />}
          {activeTab === 'suppliers' && <PartnersSuppliersView />}
          {activeTab === 'defects' && <DefectTrackerView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'bulk-data' && <BulkDataCenterView />}
          {activeTab === 'notifications' && <NotificationCenterView />}
        </main>
      </div>

      <AppsScriptSyncModal
        isOpen={isAppsScriptModalOpen}
        onClose={() => setIsAppsScriptModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
}
