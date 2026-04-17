'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { RefreshCcw, ShieldCheck, Clock, Users, ArrowRight } from 'lucide-react';

const QR_INTERVAL = 10; // detik

export default function AdminQRPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [token, setToken] = useState('');
  const [countdown, setCountdown] = useState(QR_INTERVAL);
  const [firstLoad, setFirstLoad] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [qrGenCount, setQrGenCount] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [keyRestart, setKeyRestart] = useState(0);

  // Update real-time clock
  useEffect(() => {
    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jakarta',
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // SEAMLESS GENERATOR
  const generateQR = useCallback(async (isInitial = false) => {
    if (isInitial) setFirstLoad(true);
    setIsUpdating(true);
    setError('');

    try {
      const res = await fetch('/api/generate-qr', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal generate QR');

      setToken(data.token);
      setQrGenCount((c) => c + 1);
      setCountdown(QR_INTERVAL);
      setKeyRestart((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setFirstLoad(false);
      setIsUpdating(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    generateQR(true);
  }, [generateQR]);

  // Countdown and Auto-refresh logic (Seamless)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (prev === 1) generateQR();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [generateQR]);

  // Handle drawing QR to canvas whenever token changed or component re-rendered
  useEffect(() => {
    if (token && canvasRef.current && !firstLoad) {
      QRCode.toCanvas(canvasRef.current, token, {
        width: 320,
        margin: 1,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      }).catch(err => {
        console.error('Canvas draw error:', err);
      });
    }
  }, [token, firstLoad]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Presensi QR Code</h1>
          <p className="text-slate-500 max-w-lg">Silakan minta pegawai untuk memindai kode QR unik di bawah ini menggunakan aplikasi mereka.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
           <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
              <Clock size={24} />
           </div>
           <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Waktu Sistem</p>
              <p className="text-xl font-mono font-bold text-slate-900">{currentTime} <span className="text-sm font-medium text-slate-400 ml-1">WIB</span></p>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        
        {/* CENTER: The Code Area */}
        <div className="lg:col-span-7 flex flex-col items-center">
           <div className="w-full bg-white border border-slate-200 rounded-[32px] p-12 flex flex-col items-center shadow-sm relative">
              
              {/* Token Life Counter (Mini) */}
              <div className="absolute top-8 right-8 flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isUpdating ? 'Syncing...' : 'Active'}</span>
              </div>

              {firstLoad ? (
                <div className="w-[320px] h-[320px] bg-slate-50 rounded-2xl flex items-center justify-center">
                   <RefreshCcw className="text-slate-200 animate-spin" size={40} />
                </div>
              ) : error ? (
                <div className="w-[320px] h-[320px] bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center justify-center p-6 text-center">
                   <p className="text-red-500 text-sm font-bold mb-4">{error}</p>
                   <button onClick={() => generateQR(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Coba Lagi</button>
                </div>
              ) : (
                <div className={`transition-opacity duration-300 ${isUpdating ? 'opacity-40' : 'opacity-100'}`}>
                  <canvas ref={canvasRef} className="bg-white" />
                </div>
              )}

              {/* Countdown Progress Bar */}
              <div className="w-full max-w-[320px] mt-12">
                 <div className="flex justify-between items-baseline mb-3">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Update Otomatis</p>
                    <p className={`text-2xl font-mono font-black ${countdown <= 3 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                      {countdown}<span className="text-sm">s</span>
                    </p>
                 </div>
                 <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      key={keyRestart}
                      className={`h-full transition-all duration-1000 ease-linear ${countdown <= 3 ? 'bg-red-500' : 'bg-slate-900'}`}
                      style={{ width: `${(countdown / QR_INTERVAL) * 100}%` }}
                    />
                 </div>
              </div>
           </div>

           <button 
             onClick={() => generateQR()}
             disabled={isUpdating}
             className="mt-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-30"
           >
              <RefreshCcw size={14} className={isUpdating ? 'animate-spin' : ''} />
              Perbarui Manual
           </button>
        </div>

        {/* RIGHT: Guidelines & Status */}
        <div className="lg:col-span-5 space-y-6">
           
           <div className="bg-slate-50 border border-slate-200 rounded-[32px] p-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <ShieldCheck size={18} className="text-slate-900" /> Keamanan Sistem
              </h3>
              
              <div className="space-y-5">
                 <div className="flex items-center justify-between group">
                    <span className="text-slate-500 text-sm font-medium">Radius Geofencing</span>
                    <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-full group-hover:bg-slate-900 group-hover:text-white transition-colors">AKTIF (100M)</span>
                 </div>
                 <div className="flex items-center justify-between group">
                    <span className="text-slate-500 text-sm font-medium">Verifikasi Wajah</span>
                    <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-full group-hover:bg-slate-900 group-hover:text-white transition-colors">WAJIB</span>
                 </div>
                 <div className="flex items-center justify-between group">
                    <span className="text-slate-500 text-sm font-medium">QR Terbit Hari ini</span>
                    <span className="text-base font-black text-slate-900">{qrGenCount}</span>
                 </div>
              </div>
           </div>

           <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Users size={18} /> Alur Pegawai
              </h3>
              
              <div className="space-y-4">
                 {[
                   'Buka Aplikasi & Foto Selfie',
                   'Arahkan kamera ke QR Code',
                   'Tunggu verifikasi lokasi',
                   'Cek status di Leaderboard'
                 ].map((text, i) => (
                   <div key={i} className="flex items-center gap-4 group">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black group-hover:bg-slate-900 group-hover:text-white transition-all transition-colors shrink-0">
                        0{i+1}
                      </div>
                      <p className="text-sm text-slate-600 font-medium">{text}</p>
                      <ArrowRight size={14} className="ml-auto text-slate-200 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                   </div>
                 ))}
              </div>
           </div>

        </div>

      </div>

    </div>
  );
}
