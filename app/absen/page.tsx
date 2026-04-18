'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, QrCode, X, CheckCircle2, AlertCircle, RefreshCw, Trophy, LogOut, ChevronRight, User, MousePointer2, FileText, Send, Coins, Clock, Calendar } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

type ScanState = 'idle' | 'takingSelfie' | 'scanning' | 'submitting' | 'success' | 'error';

export default function AbsenPage() {
  const router = useRouter();
  const supabase = createClient();
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [waktuAbsen, setWaktuAbsen] = useState('');
  const [absenStatus, setAbsenStatus] = useState<'hadir' | 'terlambat' | 'pulang_cepat' | ''>('');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [currentJenis, setCurrentJenis] = useState<'masuk' | 'pulang'>('masuk');
  const [isIzinModalOpen, setIsIzinModalOpen] = useState(false);
  const [izinData, setIzinData] = useState({ jenis: 'izin', keterangan: '', foto: '' });
  const [izinPreview, setIzinPreview] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [lastAttendanceId, setLastAttendanceId] = useState<string | null>(null);
  const [isDoneToday, setIsDoneToday] = useState(false);
  const [isSubmittingIzin, setIsSubmittingIzin] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Get current user info & daily status
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        
        const { data: profile } = await supabase.from('users').select('name, avatar_url, points').eq('id', user.id).single();
        setUserName(profile?.name || user.email || '');
        setAvatarUrl(profile?.avatar_url || '');
        setUserPoints(profile?.points || 0);

        const todayWITA = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
        
        const { data: attendanceToday } = await supabase
          .from('attendance')
          .select('id, jenis, approval_status')
          .eq('user_id', user.id)
          .eq('tanggal', todayWITA)
          .in('approval_status', ['approved', 'dispute_approved', 'pending']);

        const hasMasuk = attendanceToday?.some(a => a.jenis === 'masuk' && a.approval_status !== 'rejected');
        const hasPulang = attendanceToday?.some(a => a.jenis === 'pulang' && a.approval_status !== 'rejected');
        
        setCurrentJenis(hasMasuk ? 'pulang' : 'masuk');
        setIsDoneToday(!!(hasMasuk && hasPulang));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [isSuccessModalOpen, router, supabase]);

  // Cleanup cameras on lifecycle end
  useEffect(() => {
    return () => {
      stopCamera();
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // -- PHASE 1 -- START PROCESS
  const startAttendanceProcess = async () => {
    setErrorMsg('');
    setFotoBase64('');
    setScanState('takingSelfie');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStream(stream);
    } catch (err) {
      console.error('Front camera error:', err);
      setErrorMsg('Tidak dapat mengakses kamera depan untuk selfie.');
    }
  };

  // -- PHASE 2 -- TAKE SELFIE AND MOVE TO QR
  const takeSelfieAndNext = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    
    setFotoBase64(base64);
    stopCamera();
    setScanState('scanning'); // Transition to scanning, effect will handle the rest
  }, [cameraStream]);

  // -- PHASE 4 -- SUBMIT DATA
  const handleSubmitAbsen = useCallback(async (token: string, fotoData: string) => {
    setScanState('submitting');
    
    const location = await new Promise<{ lat: number; long: number } | null>((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, long: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });

    try {
      const res = await fetch('/api/absen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lat: location?.lat,
          long: location?.long,
          foto: fotoData || null,
          jenis: currentJenis
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setScanState('error');
        setErrorMsg(data.error || 'Gagal menyimpan absensi');
        return;
      }

      const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta',
      });

      setWaktuAbsen(formatTime(data.waktu_absen));
      setAbsenStatus(data.status || 'hadir');
      setSuccessMsg(data.status === 'terlambat' ? 'Presensi masuk berhasil, namun Anda terdeteksi terlambat.' : 'Presensi harian Anda telah berhasil direkam.');
      setAttendanceStatus(data.status);
      setLastAttendanceId(data.id);
      setIsSuccessModalOpen(true);
      setScanState('idle'); 
    } catch {
      setScanState('error');
      setErrorMsg('Masalah jaringan. Harap coba lagi.');
    } finally {
      stopCamera();
    }
  }, [currentJenis]);

  const handleIzinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!izinData.keterangan) return;
    
    setIsSubmittingIzin(true);
    try {
      const res = await fetch('/api/absen/izin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(izinData),
      });

      if (res.ok) {
        setIsIzinModalOpen(false);
        setWaktuAbsen('Terkirim');
        setAbsenStatus('');
        setSuccessMsg('Pengajuan izin berhasil terkirim. Mohon tunggu verifikasi admin.');
        setIzinData({ jenis: 'izin', keterangan: '', foto: '' });
        setIzinPreview(null);
        setIsSuccessModalOpen(true);
        setScanState('idle');
      } else {
        const data = await res.json();
        alert(data.error === 'Gagal mengirim pengajuan' ? 'Gagal: Pastikan Anda sudah menjalankan SQL Migration di Supabase Console.' : (data.error || 'Gagal mengirim izin'));
      }
    } catch (err) {
      alert('Masalah jaringan');
    } finally {
      setIsSubmittingIzin(false);
    }
  };

  const handleIzinFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setIzinPreview(base64);
        setIzinData({ ...izinData, foto: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  // -- PHASE 3 -- SCAN QR (Controlled by effect)
  useEffect(() => {
    let html5QrCode: any = null;

    if (scanState === 'scanning' && fotoBase64) {
      const startScanner = async () => {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode('qr-reader', { verbose: false });
        scannerRef.current = html5QrCode;

        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            async (decodedText: string) => {
              await html5QrCode.stop();
              scannerRef.current = null;
              // Pass fotoBase64 explicitly to ensure we use the correct one
              await handleSubmitAbsen(decodedText, fotoBase64);
            },
            () => {}
          );
        } catch (err: any) {
          console.error('QR Scanner error:', err);
          setScanState('error');
          setErrorMsg('Gagal memulai scanner QR. Pastikan izin kamera diberikan.');
        }
      };
      
      startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [scanState, fotoBase64, handleSubmitAbsen]);

  const resetAll = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    stopCamera();
    setScanState('idle');
    setFotoBase64('');
    setAbsenStatus('');
    setErrorMsg('');
  };

  const handleLogout = async () => {
    stopCamera();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const StepIndicator = ({ current }: { current: number }) => (
    <div className="flex items-center justify-center gap-3 mb-8">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${current === s ? 'bg-slate-900 border-slate-900 text-white scale-110' : 'bg-white border-slate-200 text-slate-400'}`}>
              {s}
           </div>
           {s === 1 && <div className="w-8 h-[2px] bg-slate-100 rounded-full"></div>}
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 font-sans pb-10 flex flex-col">
        {/* Header Skeleton */}
        <div className="bg-sky-500 pt-10 pb-20 px-6 relative overflow-hidden">
          <div className="max-w-xl mx-auto flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-xl skeleton bg-white/20" />
               <div className="space-y-2">
                 <div className="w-20 h-2 skeleton bg-white/20" />
                 <div className="w-32 h-4 skeleton bg-white/20" />
               </div>
            </div>
            <div className="flex gap-2">
               <div className="w-16 h-10 rounded-lg skeleton bg-white/20" />
               <div className="w-10 h-10 rounded-lg skeleton bg-white/20" />
            </div>
          </div>
        </div>

        <div className="flex-1 -mt-10 px-6 relative z-10">
          <div className="max-w-xl mx-auto">
            {/* Main Card Skeleton */}
            <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6">
               <div className="flex items-center justify-between mb-10">
                  <div className="space-y-2">
                    <div className="w-40 h-5 skeleton" />
                    <div className="w-24 h-3 skeleton opacity-50" />
                  </div>
                  <div className="w-10 h-10 rounded-lg skeleton" />
               </div>
               <div className="w-full h-48 rounded-2xl skeleton" />
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-2 gap-4">
               <div className="h-32 rounded-xl skeleton bg-white border border-slate-100" />
               <div className="h-32 rounded-xl skeleton bg-white border border-slate-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-10 flex flex-col">
      {/* Sharp App Header - Light Blue Theme */}
      <div className="bg-sky-500 text-white pt-10 pb-20 px-6 relative overflow-hidden">
        {/* Decorative subtle pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="max-w-xl mx-auto flex items-center justify-between relative z-10">
          <Link href="/profile" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
             <div className="w-14 h-14 rounded-xl border-2 border-white/40 overflow-hidden bg-sky-600">
               {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <User size={28} className="text-white/40 mt-3 mx-auto" />}
             </div>
             <div>
               <p className="text-sky-100 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Selamat Datang,</p>
               <h1 className="text-xl font-black tracking-tight">{userName.split(' ')[0]}</h1>
             </div>
          </Link>
          <div className="flex gap-2">
             <Link href="/points" className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg border border-white/20">
               <Coins size={14} className="text-amber-300 fill-amber-300" />
               <span className="text-sm font-black text-white">
                 {userPoints !== null ? userPoints : <div className="w-8 h-4 skeleton bg-white/20" />}
               </span>
             </Link>
             <button onClick={() => setIsLogoutModalOpen(true)} className="w-10 h-10 bg-white/20 border border-white/20 rounded-lg flex items-center justify-center text-white">
               <LogOut size={18} />
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 -mt-10 px-6 relative z-10">
        <div className="max-w-xl mx-auto">
          
          {/* Main Card - No Shadow */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6">
            
            {scanState === 'idle' && (
              <div className="animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Presensi Hari Ini</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                    <Calendar size={20} />
                  </div>
                </div>

                {isDoneToday ? (
                  <div className="bg-emerald-50 border-2 border-emerald-100 rounded-xl p-8 text-center">
                    <div className="w-14 h-14 bg-emerald-500 text-white rounded-xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-base font-black text-emerald-900 uppercase tracking-widest mb-1">Kerja Selesai</h3>
                    <p className="text-xs text-emerald-600 font-bold leading-relaxed px-4">Terima kasih atas kontribusi Anda hari ini. Sampai jumpa besok!</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-8">
                    <div className="flex gap-4">
                       <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full border-2 ${currentJenis === 'masuk' ? 'border-sky-500 bg-sky-50 animate-pulse' : 'border-emerald-500 bg-emerald-500 text-white'} flex items-center justify-center`}>
                             {currentJenis === 'pulang' && <CheckCircle2 size={12} />}
                          </div>
                          <div className="w-[2px] h-10 bg-slate-100"></div>
                          <div className={`w-6 h-6 rounded-full border-2 ${currentJenis === 'pulang' ? 'border-orange-500 bg-orange-50 animate-pulse' : 'border-slate-200 bg-slate-50'}`}></div>
                       </div>
                       <div className="flex-1 space-y-8 pt-0.5">
                          <div className="flex justify-between items-start">
                             <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pagi Hari</p>
                               <p className={`font-bold ${currentJenis === 'pulang' ? 'text-slate-400' : 'text-slate-900'}`}>Absensi Masuk</p>
                             </div>
                             {currentJenis === 'pulang' && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">DONE</span>}
                          </div>
                          <div className="flex justify-between items-start">
                             <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Sore Hari</p>
                               <p className={`font-bold ${isDoneToday ? 'text-slate-400' : 'text-slate-900'}`}>Absensi Pulang</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {!isDoneToday && (
                  <button onClick={startAttendanceProcess} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-5 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-3 text-base">
                    {currentJenis === 'masuk' ? 'START MASUK' : 'START PULANG'} <ChevronRight size={20} />
                  </button>
                )}
              </div>
            )}

            {/* SCAN STATES - MOBILE STYLE */}
            {scanState === 'takingSelfie' && (
              <div className="animate-in fade-in duration-300">
                <StepIndicator current={1} />
                <h3 className="text-xl font-black text-slate-900 text-center mb-1">Verifikasi Wajah</h3>
                <p className="text-xs text-slate-400 text-center mb-8 font-bold uppercase tracking-widest">Posisikan wajah di tengah</p>
                <div className="relative rounded-xl border-4 border-slate-50 overflow-hidden bg-slate-100 mb-8 aspect-[3/4] max-h-[40vh] mx-auto">
                   <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                   <canvas ref={canvasRef} className="hidden" />
                   <div className="absolute inset-0 border-[40px] border-slate-900/40 pointer-events-none"></div>
                </div>
                <div className="flex gap-4">
                   <button onClick={resetAll} className="w-14 h-14 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 active:bg-slate-50">
                      <X size={24} />
                   </button>
                   <button onClick={takeSelfieAndNext} className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black py-4 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
                      <Camera size={20} /> AMBIL SELFIE
                   </button>
                </div>
              </div>
            )}

            {scanState === 'scanning' && (
              <div className="animate-in fade-in duration-300">
                 <StepIndicator current={2} />
                 <h3 className="text-xl font-black text-slate-900 text-center mb-1">Scan QR Office</h3>
                 <p className="text-xs text-slate-400 text-center mb-8 font-bold uppercase tracking-widest">Arahkan ke monitor admin</p>
                 <div className="relative rounded-xl overflow-hidden bg-slate-900 mb-8 aspect-square border-4 border-slate-50">
                    <div id="qr-reader" className="w-full h-full" />
                    {fotoBase64 && (
                      <div className="absolute top-4 left-4 w-12 h-16 rounded border-2 border-white/20 overflow-hidden">
                         <img src={fotoBase64} className="w-full h-full object-cover" />
                      </div>
                    )}
                 </div>
                 <button onClick={resetAll} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] py-4 border border-transparent hover:border-slate-100 rounded-lg">
                    BATALKAN PROSES
                 </button>
              </div>
            )}

            {scanState === 'submitting' && (
              <div className="py-20 text-center">
                 <RefreshCw className="text-sky-500 animate-spin mx-auto mb-6" size={48} />
                 <h3 className="text-lg font-black text-slate-900 mb-1">SINGKRONISASI...</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Memproses Data Absensi Anda</p>
              </div>
            )}

            {scanState === 'error' && (
              <div className="py-10 text-center">
                 <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={36} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 mb-4 tracking-tight">Presensi Gagal</h2>
                 <p className="text-rose-600 text-xs font-bold bg-rose-50 p-4 rounded-lg mb-8 border border-rose-100">{errorMsg}</p>
                 <button onClick={resetAll} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-4 rounded-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <RefreshCw size={18} /> COBA ULANGI
                 </button>
              </div>
            )}

          </div>

          {/* Quick Actions Grid - No Shadows */}
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setIsIzinModalOpen(true)} className="bg-white border border-slate-200 p-6 rounded-xl flex flex-col items-center gap-3 transition-all hover:border-sky-200 hover:bg-sky-50/30 active:scale-95">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center">
                   <FileText size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Izin / Sakit</span>
             </button>
             <Link href="/leaderboard" className="bg-white border border-slate-200 p-6 rounded-xl flex flex-col items-center gap-3 transition-all hover:border-sky-200 hover:bg-sky-50/30 active:scale-95">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center">
                   <Trophy size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Peringkat</span>
             </Link>
          </div>
          
          <div className="mt-10 pt-10 border-t border-slate-200 text-center">
             <div className="bg-sky-50 py-4 px-6 rounded-lg border border-sky-100">
                <p className="text-[9px] font-black text-sky-600 uppercase tracking-[0.2em] leading-relaxed">
                  Semua data presensi terekam secara otomatis ke dalam sistem monitoring admin TEFA IT Politala.
                </p>
             </div>
          </div>

        </div>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        variant="warning"
        title="Logout Akun?"
        message="Anda akan keluar dari sistem. Sesi Anda akan berakhir seketika."
        confirmText="YA, KELUAR"
      />

      {/* IZIN MODAL - NO SHADOW */}
      {isIzinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900">Form Izin</h3>
                <button onClick={() => setIsIzinModalOpen(false)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleIzinSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Jenis Pengajuan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['izin', 'sakit', 'lupa_absen'].map((t) => (
                      <button key={t} type="button" onClick={() => setIzinData({...izinData, jenis: t})}
                        className={`py-3 rounded-lg border text-[10px] font-black uppercase transition-all ${izinData.jenis === t ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-100 text-slate-400'}`}
                      >
                        {t.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Keterangan</label>
                  <textarea required value={izinData.keterangan} onChange={(e) => setIzinData({...izinData, keterangan: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-4 text-sm font-bold text-slate-900 focus:ring-2 ring-sky-500 outline-none min-h-[100px]"
                    placeholder="Alasan pengajuan..."
                  />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Dokumen/Foto</label>
                   <div className="flex gap-4 items-center">
                      <label className="flex-1 cursor-pointer">
                         <div className="w-full h-24 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 overflow-hidden relative">
                            {izinPreview ? <img src={izinPreview} className="w-full h-full object-cover" /> : <Camera size={24} className="text-slate-300" />}
                         </div>
                         <input type="file" accept="image/*" onChange={handleIzinFileChange} className="hidden" />
                      </label>
                      {izinPreview && (
                         <button type="button" onClick={() => { setIzinPreview(null); setIzinData({...izinData, foto: ''}) }} className="w-12 h-12 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center border border-rose-100">
                            <X size={20} />
                         </button>
                      )}
                   </div>
                </div>
                <button type="submit" disabled={isSubmittingIzin} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-4 rounded-lg flex items-center justify-center gap-2 transition-all">
                  {isSubmittingIzin ? <RefreshCw className="animate-spin" size={18} /> : <><Send size={18} /> KIRIM PENGAJUAN</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL - NO SHADOW */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-xl p-10 text-center border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-10 -mt-10"></div>
              <div className={`w-20 h-20 mx-auto mb-8 rounded-xl flex items-center justify-center ${waktuAbsen === 'Terkirim' ? 'bg-sky-50 text-sky-500 border border-sky-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'}`}>
                 {waktuAbsen === 'Terkirim' ? <Send size={32} /> : <CheckCircle2 size={32} />}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">{waktuAbsen === 'Terkirim' ? 'TERKIRIM!' : 'BERHASIL!'}</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">{successMsg}</p>
              <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{waktuAbsen === 'Terkirim' ? 'STATUS' : 'WAKTU PRESENSI'}</p>
                 <p className="text-3xl font-black text-slate-900 tracking-tight">{waktuAbsen === 'Terkirim' ? 'PENDING' : waktuAbsen}</p>
              </div>
              <button onClick={() => setIsSuccessModalOpen(false)} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-5 rounded-lg transition-all active:scale-95">
                SELESAI
              </button>
           </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>
    </main>
  );
}
