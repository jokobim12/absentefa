'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { RefreshCcw, ShieldCheck, Clock, Users, ArrowRight, ScanLine } from 'lucide-react';

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

  useEffect(() => {
    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Makassar',
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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

  useEffect(() => { generateQR(true); }, [generateQR]);

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

  useEffect(() => {
    if (token && canvasRef.current && !firstLoad) {
      QRCode.toCanvas(canvasRef.current, token, {
        width: 320,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }).catch(err => console.error(err));
    }
  }, [token, firstLoad]);

  return (
    <div className="space-y-12 pb-20 text-slate-900">
      
      {/* Sharp Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
           <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
             Keamanan • Presensi Terminal
           </div>
           <h1 className="text-2xl font-bold tracking-tight">Layar Pemindaian QR</h1>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 px-5 py-3 rounded">
           <Clock size={16} className="text-slate-400" />
           <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Waktu Server</p>
              <p className="text-sm font-mono font-black text-slate-900">{currentTime} WITA</p>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-12">
        
        {/* CENTER: The Code Area */}
        <div className="lg:col-span-7 space-y-8">
           <div className="bg-white border-2 border-slate-200 rounded p-12 flex flex-col items-center relative overflow-hidden shadow-sm">
              
              {/* Token Status Indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                 <div className={`w-1.5 h-1.5 rounded-full ${isUpdating ? 'bg-amber-400 animate-pulse' : 'bg-slate-900'}`}></div>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isUpdating ? 'Syncing...' : 'Layar Aktif'}</span>
              </div>

              {firstLoad ? (
                <div className="w-[320px] h-[320px] bg-slate-50 border border-slate-100 flex items-center justify-center">
                   <RefreshCcw className="text-slate-200 animate-spin" size={32} />
                </div>
              ) : error ? (
                <div className="w-[320px] h-[320px] bg-rose-50 border border-rose-100 flex flex-col items-center justify-center p-8 text-center">
                   <p className="text-rose-600 text-xs font-bold mb-4">{error}</p>
                   <button onClick={() => generateQR(true)} className="px-5 py-2 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest">Retry Connection</button>
                </div>
              ) : (
                <div className={`transition-all duration-300 border-4 border-slate-50 p-2 ${isUpdating ? 'opacity-20 blur-sm scale-95' : 'opacity-100 scale-100'}`}>
                   <canvas ref={canvasRef} />
                </div>
              )}

              {/* Countdown Bar Sharp */}
              <div className="w-full max-w-[320px] mt-10 space-y-3">
                 <div className="flex justify-between items-center px-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Masa Berlaku Kode</p>
                    <p className={`text-sm font-mono font-black ${countdown <= 3 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
                      {String(countdown).padStart(2, '0')}<span className="text-[10px] font-bold">s</span>
                    </p>
                 </div>
                 <div className="h-1 bg-slate-100 overflow-hidden rounded-full">
                    <div 
                      key={keyRestart}
                      className={`h-full transition-all duration-1000 ease-linear ${countdown <= 3 ? 'bg-rose-500' : 'bg-slate-900'}`}
                      style={{ width: `${(countdown / QR_INTERVAL) * 100}%` }}
                    />
                 </div>
              </div>
           </div>

           <button onClick={() => generateQR()} disabled={isUpdating} className="w-full py-4 border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 font-black text-[10px] transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-30 rounded">
              <RefreshCcw size={14} className={isUpdating ? 'animate-spin' : ''} /> Terbitkan Kode Baru Secara Manual
           </button>
        </div>

        {/* RIGHT: Rules & Status Panel */}
        <div className="lg:col-span-5 space-y-6">
           
           <div className="border border-slate-200 rounded p-8 bg-white">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2 border-b border-slate-100 pb-4">
                 <ShieldCheck size={16} /> Parameter Keamanan
              </h3>
              
              <div className="space-y-6">
                 <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <span className="text-slate-500 text-xs font-medium">Jarak Maksimal (GPS)</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase">100 Meter</span>
                 </div>
                 <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <span className="text-slate-500 text-xs font-medium">Capture Wajah</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase">Wajib Aktif</span>
                 </div>
                 <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <span className="text-slate-500 text-xs font-medium">Refresh Token Kedaluwarsa</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase">Per 10 Detik</span>
                 </div>
              </div>
           </div>

           <div className="border border-slate-200 rounded p-8 bg-slate-50">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2 border-b border-slate-200 pb-4">
                 <ScanLine size={16} /> Instruksi Pemindaian
              </h3>
              
              <div className="space-y-4">
                 {[
                   'Akses menu Absen di HP',
                   'Foto Selfie untuk identitas',
                   'Arahkan kamera ke layar ini',
                   'Berhasil jika lampu hijau nyala'
                 ].map((text, i) => (
                   <div key={i} className="flex items-center gap-4">
                      <div className="text-[10px] font-black text-slate-300">0{i+1}</div>
                      <p className="text-xs text-slate-600 font-bold">{text}</p>
                   </div>
                 ))}
              </div>
           </div>

        </div>

      </div>
    </div>
  );
}
