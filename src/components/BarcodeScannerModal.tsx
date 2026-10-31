import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  Camera,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  Sparkles,
  Search,
  Package,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { playScanSound } from '../utils/inventoryCalculations';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedSku: string, countQty?: number) => void;
  title?: string;
  subtitle?: string;
  targetWarehouseId?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode SKU',
  subtitle = 'Arahkan kamera, gunakan scanner barcode USB/BT, atau pilih simulasi SKU',
  targetWarehouseId,
}) => {
  const { products, stockPositions, warehouses } = useInventory();
  const [activeMode, setActiveMode] = useState<'CAMERA' | 'HARDWARE' | 'SIMULATOR'>('SIMULATOR');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualSkuInput, setManualSkuInput] = useState<string>('');
  const [scanQty, setScanQty] = useState<number>(1);
  const [lastScannedResult, setLastScannedResult] = useState<{
    sku: string;
    name: string;
    success: boolean;
    timestamp: string;
  } | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const hardwareBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Stop camera helper
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  // Start camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung pada browser ini atau koneksi tidak secure (HTTPS/Localhost).');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(err.message || 'Gagal mengakses kamera perangkat.');
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeMode === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode]);

  // Hardware Scanner Listener (captures rapid keyboard inputs ending with Enter)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in regular search or manual input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (hardwareBufferRef.current.trim().length > 0) {
          e.preventDefault();
          const scannedCode = hardwareBufferRef.current.trim();
          handleScannedCode(scannedCode);
          hardwareBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        // Typical barcode scanners emit keystrokes very fast (< 50ms)
        if (timeDiff > 150) {
          hardwareBufferRef.current = '';
        }
        hardwareBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, products, scanQty]);

  const handleScannedCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    const found = products.find(
      (p) => p.sku.toUpperCase() === cleanCode || p.sku.toUpperCase().includes(cleanCode)
    );

    if (found) {
      playScanSound(true);
      setLastScannedResult({
        sku: found.sku,
        name: found.name,
        success: true,
        timestamp: new Date().toLocaleTimeString(),
      });
      onScan(found.sku, scanQty);
    } else {
      playScanSound(false);
      setLastScannedResult({
        sku: cleanCode,
        name: 'SKU Tidak Dikenali Dalam Katalog',
        success: false,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSkuInput.trim()) return;
    handleScannedCode(manualSkuInput);
    setManualSkuInput('');
  };

  if (!isOpen) return null;

  const filteredProducts = products.filter((p) => {
    const q = searchFilter.toLowerCase();
    return p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Scan className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {title}
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">
                  WMS Duma Scanner
                </span>
              </h2>
              <p className="text-xs text-blue-100/80 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveMode('SIMULATOR')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 border-t border-x ${
                activeMode === 'SIMULATOR'
                  ? 'bg-white text-blue-700 border-slate-200 -mb-px'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Pilih & Simulasi Barcode ({products.length} SKU)
            </button>
            <button
              onClick={() => setActiveMode('CAMERA')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 border-t border-x ${
                activeMode === 'CAMERA'
                  ? 'bg-white text-blue-700 border-slate-200 -mb-px'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Kamera Handphone / Web
            </button>
            <button
              onClick={() => setActiveMode('HARDWARE')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 border-t border-x ${
                activeMode === 'HARDWARE'
                  ? 'bg-white text-blue-700 border-slate-200 -mb-px'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              Scanner Fisik USB / BT
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              Qty Scan:
            </label>
            <input
              type="number"
              min={1}
              value={scanQty}
              onChange={(e) => setScanQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 text-xs font-bold text-center border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Last Scanned Banner */}
          {lastScannedResult && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between animate-in fade-in duration-200 ${
                lastScannedResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {lastScannedResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold flex items-center gap-2">
                    <span>{lastScannedResult.sku}</span>
                    <span className="text-[10px] font-normal opacity-75">
                      ({lastScannedResult.timestamp})
                    </span>
                  </p>
                  <p className="text-xs">{lastScannedResult.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border">
                  +{scanQty} Pcs
                </span>
                <Volume2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          )}

          {/* Mode: SIMULATOR */}
          {activeMode === 'SIMULATOR' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Cari SKU atau nama item untuk simulasi scan..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">
                    Tidak ada SKU yang cocok dengan pencarian
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {filteredProducts.map((p) => {
                    return (
                      <button
                        key={p.sku}
                        onClick={() => handleScannedCode(p.sku)}
                        className="text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col justify-between group cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-mono text-xs font-bold text-blue-700 group-hover:text-blue-800">
                            {p.sku}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                            {p.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium line-clamp-1 mt-1">
                          {p.name}
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Klik untuk Scan (+{scanQty})</span>
                          <span className="text-xs font-bold text-blue-600">Scan ⚡</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mode: CAMERA */}
          {activeMode === 'CAMERA' && (
            <div className="space-y-3">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-700 shadow-inner">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Visual Target Reticle */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-56 h-36 border-2 border-blue-400/80 rounded-lg relative shadow-lg">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-500"></div>
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-500"></div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-500"></div>
                        <div className="w-full h-0.5 bg-red-500 absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-medium text-slate-300">
                      {cameraError || 'Kamera sedang diinisialisasi...'}
                    </p>
                    <button
                      onClick={startCamera}
                      className="mt-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      Buka Kamera Ulang
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Arahkan barcode produk ke dalam kotak merah. Anda juga dapat menggunakan input manual atau simulator di bawah.
              </p>
            </div>
          )}

          {/* Mode: HARDWARE SCANNER */}
          {activeMode === 'HARDWARE' && (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                <Keyboard className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Scanner Barcode USB / Bluetooth Aktif
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  Cukup tembak barcode dengan scanner fisik Anda. Sistem WMS Duma Kreasi Indonesia akan mendeteksi sinyal scan dan langsung memasukkan SKU secara instan.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Status: Menunggu Sinyal Barcode
              </div>
            </div>
          )}

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Atau Ketik Kode SKU / Barcode Manual:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualSkuInput}
                onChange={(e) => setManualSkuInput(e.target.value)}
                placeholder="Contoh: DKI-TSH-001"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Kirim Scan
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Tips: Gunakan barcode standar EAN-13, Code 128, atau Kode SKU internal DUMA.
          </span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
