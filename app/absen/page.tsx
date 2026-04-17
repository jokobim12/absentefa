'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, QrCode, X, CheckCircle2, AlertCircle, RefreshCw, Trophy, LogOut, ChevronRight, User, MousePointer2, FileText, Send, Star, Clock } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

type ScanState = 'idle' | 'takingSelfie' | 'scanning' | 'submitting' | 'success' | 'error';

export default function AbsenPage() {
  const router = useRouter();
  const supabase = createClient();
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
  const [userPoints, setUserPoints] = useState(0);
  const [currentJenis, setCurrentJenis] = useState<'masuk' | 'pulang'>('masuk');
  const [isIzinModalOpen, setIsIzinModalOpen] = useState(false);
  const [izinData, setIzinData] = useState({ jenis: 'izin', keterangan: '', foto: '' });
  const [izinPreview, setIzinPreview] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [lastAttendanceId, setLastAttendanceId] = useState<string | null>(null);
  const [isSubmittingIzin, setIsSubmittingIzin] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Get current user info & daily status
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      
      const { data: profile } = await supabase.from('users').select('name, avatar_url, points').eq('id', user.id).single();
      setUserName(profile?.name || user.email || '');
      setAvatarUrl(profile?.avatar_url || '');
      setUserPoints(profile?.points || 0);

      const todayWITA = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
      
      const { data: attendanceToday } = await supabase
        .from('attendance')
        .select('jenis')
        .eq('user_id', user.id)
        .eq('tanggal', todayWITA);

      const hasMasuk = attendanceToday?.some(a => a.jenis === 'masuk');
      setCurrentJenis(hasMasuk ? 'pulang' : 'masuk');
    }
    fetchData();
  }, [isSuccessModalOpen]); // Refresh points when success modal is closed

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

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Refined Nav Header */}
      <nav className="shrink-0 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
           <Link href="/profile" className="flex items-center gap-3 active:opacity-70 transition-opacity min-w-0">
             <div className="w-10 h-10 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
               {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <User size={20} className="text-slate-300" />}
             </div>
             <div className="min-w-0">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Akun Saya</p>
               <p className="text-sm font-bold text-slate-900 leading-none truncate">{userName || 'Loading...'}</p>
             </div>
           </Link>
            <div className="flex gap-2">
              <Link href="/points" className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <span className="text-xs font-black text-amber-700">{userPoints}</span>
              </Link>
              <Link href="/leaderboard" className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
                <Trophy size={18} />
              </Link>
              <button onClick={() => setIsLogoutModalOpen(true)} className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                <LogOut size={18} />
              </button>
            </div>
        </div>
      </nav>

      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          
          {/* STEP 0: IDLE */}
          {scanState === 'idle' && (
            <div className="bg-white rounded-[32px] p-10 border border-slate-200 shadow-sm text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-slate-200">
                 <QrCode size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Presensi TEFA</h1>
              <p className="text-slate-400 text-sm mb-10 leading-relaxed">Pastikan Anda berada di lingkungan kantor sebelum memulai presensi.</p>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-10 text-left relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/50 rounded-bl-full"></div>
                  <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" /> Wajib Verifikasi
                  </p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Sistem memerlukan akses <span className="font-bold text-slate-800">Kamera</span> untuk Selfie & Scan QR, serta <span className="font-bold text-slate-800">GPS</span> untuk lokasi.
                  </p>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={startAttendanceProcess} className={`w-full ${currentJenis === 'masuk' ? 'bg-slate-900 hover:bg-black' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 text-base shadow-xl shadow-slate-200`}>
                  Absen {currentJenis === 'masuk' ? 'Masuk' : 'Pulang'} <ChevronRight size={20} />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setIsIzinModalOpen(true)} className="bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm">
                    <FileText size={18} /> Izin / Sakit
                  </button>
                  <Link href="/leaderboard" className="bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm">
                    <Trophy size={18} /> Peringkat
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: TAKING SELFIE */}
          {scanState === 'takingSelfie' && (
            <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm text-center">
              <StepIndicator current={1} />
              
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Verifikasi Wajah</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Posisikan wajah Anda di tengah lingkaran</p>
              </div>
              
              <div className="relative rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 mb-8 aspect-[3/4] max-h-[45vh] mx-auto shadow-inner">
                 <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                 <canvas ref={canvasRef} className="hidden" />
                 
                 {/* Better Overlay Guide */}
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-64 rounded-full border-2 border-white/50 border-dashed bg-slate-900/10 backdrop-blur-[1px]"></div>
                 </div>
              </div>

              <div className="flex gap-3">
                 <button onClick={resetAll} className="w-12 h-12 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 active:bg-slate-50 transition-all">
                    <X size={20} />
                 </button>
                 <button onClick={takeSelfieAndNext} className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Camera size={18} /> Ambil Foto
                 </button>
              </div>
            </div>
          )}

          {/* STEP 2: SCANNING QR */}
          {scanState === 'scanning' && (
             <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm text-center">
                <StepIndicator current={2} />

                <div className="mb-6">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Scan QR Office</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">Arahkan kamera ke layar Monitor Admin</p>
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-slate-900 mb-8 aspect-square flex items-center justify-center border border-slate-800">
                   <div id="qr-reader" className="w-full h-full" />
                   
                   {/* Mini Selfie Preview */}
                   {fotoBase64 && (
                     <div className="absolute top-4 left-4 w-12 h-16 rounded-lg border-2 border-white/20 shadow-lg overflow-hidden ring-4 ring-black/20">
                        <img src={fotoBase64} className="w-full h-full object-cover" alt="" />
                     </div>
                   )}

                   {/* Scanning animation line */}
                   <div className="absolute inset-x-8 h-[2px] bg-blue-500/50 blur-[2px] animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>

                <button onClick={resetAll} className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest py-2 hover:text-slate-900 transition-colors">
                   Batalkan Proses
                </button>
             </div>
          )}

          {/* PROCESS: SUBMITTING */}
          {scanState === 'submitting' && (
            <div className="bg-white rounded-[32px] p-12 text-center border border-slate-200 shadow-sm">
               <div className="w-16 h-16 mx-auto mb-8 flex items-center justify-center">
                  <RefreshCw className="text-slate-900 animate-spin" size={40} />
               </div>
               <h3 className="text-lg font-black text-slate-900 mb-2">Sinkronisasi</h3>
               <p className="text-slate-400 text-xs font-medium">Memverifikasi lokasi & identitas Anda...</p>
            </div>
          )}

          {/* RESULT: ERROR */}
          {scanState === 'error' && (
            <div className="bg-white rounded-[32px] p-10 border border-rose-100 shadow-sm text-center animate-in zoom-in">
               <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={36} />
               </div>
               <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Presensi Gagal</h2>
               <p className="text-rose-500 text-sm mb-10 font-medium leading-relaxed bg-rose-50/50 p-4 rounded-xl border border-rose-100/50">{errorMsg}</p>
               <button onClick={resetAll} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2">
                  <RefreshCw size={18} /> Coba Ulangi
               </button>
            </div>
          )}

        </div>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        variant="warning"
        title="Logout dari Sesi?"
        message="Anda akan keluar dari sistem absensi. Harap pastikan tugas Anda sudah terekam."
        confirmText="Ya, Keluar"
      />

      {/* IZIN MODAL */}
      {isIzinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-white animate-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">Form Izin</h3>
                <button onClick={() => setIsIzinModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleIzinSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Jenis Pengajuan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['izin', 'sakit', 'lupa_absen'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setIzinData({...izinData, jenis: t})}
                        className={`py-3 rounded-xl border text-xs font-bold capitalize transition-all ${izinData.jenis === t ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 text-slate-400'}`}
                      >
                        {t.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Alasan / Keterangan</label>
                  <textarea
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium focus:ring-2 ring-slate-900 transition-all outline-none min-h-[80px]"
                    placeholder="Contoh: Sakit demam, perlu ke dokter..."
                    value={izinData.keterangan}
                    onChange={(e) => setIzinData({...izinData, keterangan: e.target.value})}
                  />
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Bukti Pendukung (Opsi)</label>
                   <div className="flex gap-3 items-center">
                      <label className="flex-1 cursor-pointer">
                         <div className="w-full h-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-all overflow-hidden relative">
                            {izinPreview ? (
                               <img src={izinPreview} className="w-full h-full object-cover" />
                            ) : (
                               <>
                                  <Camera size={20} className="text-slate-400" />
                                  <span className="text-[10px] font-bold text-slate-400">Pilih Foto / Dokumen</span>
                               </>
                            )}
                         </div>
                         <input type="file" accept="image/*" onChange={handleIzinFileChange} className="hidden" />
                      </label>
                      {izinPreview && (
                         <button type="button" onClick={() => { setIzinPreview(null); setIzinData({...izinData, foto: ''}) }} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                            <X size={18} />
                         </button>
                      )}
                   </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingIzin}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingIzin ? <RefreshCw className="animate-spin" size={18} /> : <><Send size={18} /> Kirim Pengajuan</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* SUCCESS MODAL PREMIUM */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-50/50 rounded-full blur-3xl"></div>
              
              <div className={`w-20 h-20 mx-auto mb-8 rounded-3xl flex items-center justify-center ${waktuAbsen === 'Terkirim' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'} shadow-inner`}>
                 {waktuAbsen === 'Terkirim' ? <Send size={32} /> : <CheckCircle2 size={32} />}
              </div>

              <h2 className="text-2xl font-black text-slate-900 mb-2">
                 {waktuAbsen === 'Terkirim' ? 'Berhasil Terkirim!' : 'Presensi Berhasil!'}
              </h2>
              <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">{successMsg}</p>

              <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100/50">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    {waktuAbsen === 'Terkirim' ? 'Status' : 'Waktu Absensi'}
                 </p>
                 <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {waktuAbsen === 'Terkirim' ? 'Menunggu Verifikasi' : waktuAbsen}
                 </p>
              </div>

              <button 
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200"
              >
                Tutup
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
