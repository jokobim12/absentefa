'use client';

import { useState, useEffect, useRef } from 'react';
// face-api loaded dynamically to avoid TextEncoder issues
import { Camera, RefreshCw, CheckCircle2, AlertCircle, X, ShieldCheck, UserCheck } from 'lucide-react';

interface FaceRegistrationProps {
  targetUserId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FaceRegistration({ targetUserId, onSuccess, onCancel }: FaceRegistrationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadingModels, setLoadingModels] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [faceapi, setFaceapi] = useState<any>(null);
  const [status, setStatus] = useState<'initializing' | 'ready' | 'detecting' | 'captured' | 'saving' | 'error'>('initializing');
  const [message, setMessage] = useState('Memuat sistem keamanan...');
  const [guidance, setGuidance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
    return () => {
      stopCamera();
    };
  }, []);

  const loadModels = async () => {
    try {
      setLoadingModels(true);
      setMessage('Memuat model AI...');
      
      const fa = await import('@vladmandic/face-api');
      setFaceapi(fa);

      const MODEL_URL = '/models';
      await Promise.all([
        fa.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      
      setLoadingModels(false);
      setStatus('ready');
      setMessage('Sistem siap. Klik tombol di bawah untuk mulai.');
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat model. Pastikan koneksi stabil.');
      setStatus('error');
    }
  };

  const startCamera = async () => {
    try {
      setStatus('detecting');
      setMessage('Membuka kamera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          startDetection();
        };
      }
    } catch (err: any) {
      console.error(err);
      setError('Gagal mengakses kamera. Izinkan akses kamera di browser Anda.');
      setStatus('error');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const startDetection = async () => {
    if (!videoRef.current) return;
    setScanning(true);
    setMessage('Posisikan wajah Anda di tengah kotak');

    const detect = async () => {
      if (!scanning) return;
      
      if (!videoRef.current || !faceapi) {
        requestAnimationFrame(detect);
        return;
      }

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const faceSize = detection.box.width;
          const videoWidth = videoRef.current.videoWidth || 640;
          const ratio = faceSize / videoWidth;

          if (ratio < 0.2) {
            setGuidance('Dekatkan wajah Anda ke kamera');
          } else if (detection.score < 0.4) {
            setGuidance('Pencahayaan kurang optimal');
          } else {
            setGuidance('Siap! Tahan sebentar...');
            // Auto-lock if everything is perfect
            if (detection.score > 0.6 && ratio > 0.3) {
              handleCapture(Array.from(detection.descriptor));
              return;
            }
          }
        } else {
          setGuidance('Mencari wajah... Pastikan wajah terlihat jelas');
        }
      } catch (err) {
        console.error('Detection error:', err);
      }

      requestAnimationFrame(detect);
    };

    detect();
  };

  const handleCapture = async (descriptor: number[]) => {
    setStatus('captured');
    setMessage('Data wajah terkunci! Menyimpan...');
    stopCamera();
    saveDescriptor(descriptor);
  };

  const manualCapture = async () => {
    if (!videoRef.current || !faceapi || status !== 'detecting') return;
    
    setGuidance('Memproses tangkapan manual...');
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        handleCapture(Array.from(detection.descriptor));
      } else {
        setGuidance('Gagal: Wajah tidak terdeteksi dalam foto ini');
        setTimeout(() => setGuidance(null), 2000);
      }
    } catch (err: any) {
      setError('Gagal memproses : ' + err.message);
    }
  };

  const saveDescriptor = async (descriptor: number[]) => {
    try {
      setStatus('saving');
      const res = await fetch('/api/profile/face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          descriptor,
          targetUserId: targetUserId 
        })
      });

      if (res.ok) {
        setStatus('ready');
        onSuccess();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan data');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-500">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Registrasi Wajah</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Keamanan Biometrik</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-50 hover:text-slate-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Camera/Display Area */}
        <div className="relative aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
          {status === 'detecting' && (
            <>
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" 
                muted 
                playsInline
              />
              {/* Scanning Guide Overlay */}
              <div className="absolute inset-0 border-[40px] border-slate-900/40 pointer-events-none">
                <div className="w-full h-full border-2 border-sky-400/50 rounded-2xl relative">
                   <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-500 -mt-1 -ml-1"></div>
                   <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-500 -mt-1 -mr-1"></div>
                   <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-500 -mb-1 -ml-1"></div>
                   <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-500 -mb-1 -mr-1"></div>
                   
                   {/* Shimmer line */}
                   <div className="absolute inset-x-0 top-0 h-0.5 bg-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.5)] animate-scan-line"></div>
                </div>
              </div>

              {/* Manual Trigger Fallback */}
              <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center px-6">
                 <button 
                  onClick={manualCapture}
                  className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-sky-500 transition-all shadow-2xl active:scale-95 flex items-center gap-2"
                >
                  <Camera size={14} />
                  Ambil Foto Secara Manual
                </button>
              </div>

              {/* Guidance Overlay */}
              {guidance && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-sky-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg border-2 border-white/20 animate-in slide-in-from-top-4">
                  {guidance}
                </div>
              )}
            </>
          )}

          {status === 'initializing' || loadingModels ? (
            <div className="flex flex-col items-center gap-4 text-center p-10">
              <RefreshCw className="w-12 h-12 text-sky-500 animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{message}</p>
            </div>
          ) : status === 'ready' ? (
            <div className="flex flex-col items-center gap-6 text-center p-10">
              <div className="w-24 h-24 rounded-full bg-sky-50 flex items-center justify-center text-sky-500">
                <UserCheck size={48} />
              </div>
              <p className="text-sm font-bold text-slate-600 leading-relaxed px-4">
                Posisikan wajah Anda dengan jelas dan pastikan pencahayaan cukup untuk hasil terbaik.
              </p>
              <button 
                onClick={startCamera}
                className="bg-sky-500 text-white font-black px-8 py-4 rounded-xl hover:bg-sky-600 transition-all active:scale-95 flex items-center gap-3 text-sm"
              >
                <Camera size={20} />
                MULAI PEMINDAIAN
              </button>
            </div>
          ) : status === 'saving' || status === 'captured' ? (
            <div className="flex flex-col items-center gap-4 text-center p-10">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-sky-500 flex items-center justify-center text-white scale-110">
                  <RefreshCw className="w-10 h-10 animate-spin" />
                </div>
              </div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest mt-4">{message}</p>
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center gap-6 text-center p-10">
              <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                <AlertCircle size={40} />
              </div>
              <p className="text-sm font-bold text-rose-500 leading-relaxed">
                {error || 'Terjadi kesalahan tidak terduga.'}
              </p>
              <button 
                onClick={() => { setError(null); setStatus('ready'); }}
                className="bg-slate-100 text-slate-600 font-black px-8 py-4 rounded-xl hover:bg-slate-200 transition-all active:scale-95 text-sm"
              >
                COBA LAGI
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer info */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
           <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Data wajah disimpan sebagai kode enkripsi (descriptor) dan tidak dapat dilihat kembali sebagai foto asli.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
