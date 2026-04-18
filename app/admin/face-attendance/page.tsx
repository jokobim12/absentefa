'use client';

import { useState, useEffect, useRef } from 'react';
// face-api loaded dynamically to avoid TextEncoder issues
import { createClient } from '@/lib/supabase/client';
import { 
  Camera, 
  RefreshCw, 
  ChevronLeft, 
  UserCheck, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  Users,
  Settings,
  History
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { LabeledFaceDescriptors } from '@vladmandic/face-api';

export default function AdminFaceAttendance() {
  const supabase = createClient();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [faceapi, setFaceapi] = useState<any>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [labeledDescriptors, setLabeledDescriptors] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [lastMatchedUser, setLastMatchedUser] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [message, setMessage] = useState('Menginisialisasi Sistem Bio-Scanner...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    initScanner();
    return () => {
      stopCamera();
    };
  }, []);

  const initScanner = async () => {
    try {
      setLoading(true);
      setMessage('Memuat Model AI...');
      
      const fa = await import('@vladmandic/face-api');
      setFaceapi(fa);

      const MODEL_URL = '/models';
      await Promise.all([
        fa.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      
      setModelsLoaded(true);
      setMessage('Mengambil Data Pegawai...');
      await loadEmployeeDescriptors(fa);
      
      setMessage('Membuka Kamera...');
      await startCamera(fa);
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setMessage('Gagal menginisialisasi sistem.');
    }
  };

  const loadEmployeeDescriptors = async (fa: any) => {
    const { data: faces, error } = await supabase
      .from('user_faces')
      .select('descriptor, users(id, name)');

    if (error) throw error;
    if (!faces || faces.length === 0) {
      console.warn('No faces registered in database');
      return;
    }

    const labeled = faces.map(f => {
      const descriptor = new Float32Array(f.descriptor);
      const user = f.users as any;
      
      if (!user) {
        console.error('Data user tidak ditemukan untuk descriptor ini:', f);
        return null;
      }

      return new fa.LabeledFaceDescriptors(
        user.id, // Keep ID as label for internal matching
        [descriptor]
      );
    }).filter(Boolean) as LabeledFaceDescriptors[];

    console.log(`Loaded ${labeled.length} labeled descriptors for matcher`);
    
    // Create a map for instant name lookup in the loop
    const mapping: Record<string, string> = {};
    faces.forEach((f: any) => {
      if (f.users) mapping[f.users.id] = f.users.name;
    });
    setUserMap(mapping);
    setLabeledDescriptors(labeled);
  };

  const startCamera = async (fa: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          startRecognition();
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startRecognition = async () => {
    if (!videoRef.current || !canvasRef.current || labeledDescriptors.length === 0 || !faceapi) return;

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.65);
    const canvas = canvasRef.current;
    
    // Hidden canvas for image enhancement
    const hiddenCanvas = document.createElement('canvas');
    const hctx = hiddenCanvas.getContext('2d');

    const recognize = async () => {
      if (!videoRef.current || !canvas || !faceapi) return;

      const video = videoRef.current;
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      
      if (displaySize.width === 0) {
        requestAnimationFrame(recognize);
        return;
      }

      // SYNC Canvas size with actual video size (CRITICAL FIX)
      if (canvas.width !== displaySize.width) {
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
      }

      // High-Accuracy Face Detection (SSD Mobilenet) - Better for Backlight
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw Radar Heartbeat (So user knows system is alive)
        if (!detection && !isProcessing) {
           const time = Date.now() / 1000;
           const pulse = Math.sin(time * 3) * 0.5 + 0.5;
           ctx.strokeStyle = `rgba(14, 165, 233, ${0.1 + pulse * 0.2})`;
           ctx.lineWidth = 1;
           ctx.beginPath();
           ctx.arc(canvas.width/2, canvas.height/2, 100 + pulse * 20, 0, Math.PI * 2);
           ctx.stroke();
        }

        if (detection) {
          const resized = faceapi.resizeResults(detection, displaySize);
          const box = resized.detection.box;

          // Draw Tracking Box - Cyan/Sky Theme
          ctx.strokeStyle = '#0ea5e9';
          ctx.lineWidth = 4;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          // Identity Text Background
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(box.x, box.y - 45, box.width, 40);
          
          if (!isProcessing) {
             const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
             console.log('Match Detail:', bestMatch.toString());

             if (bestMatch.label !== 'unknown') {
               const userName = userMap[bestMatch.label] || 'Recognized';
               const confidence = Math.round((1 - bestMatch.distance) * 100);
               
               ctx.fillStyle = '#10b981'; // Emerald
               ctx.font = 'bold 14px sans-serif';
               ctx.fillText(userName, box.x + 10, box.y - 25);
               ctx.font = 'bold 10px sans-serif';
               ctx.fillText(`MATCH CONFIDENCE: ${confidence}%`, box.x + 10, box.y - 12);
               
               // Trigger on high stability
               if (bestMatch.distance < 0.6) {
                 handleFaceMatch(bestMatch.label);
               }
             } else {
               ctx.fillStyle = '#f8fafc';
               ctx.font = 'bold 10px sans-serif';
               ctx.fillText('MENGANALISI BIOMETRIK...', box.x + 10, box.y - 25);
               ctx.fillStyle = 'rgba(255,255,255,0.3)';
               ctx.fillRect(box.x + 10, box.y - 15, box.width - 20, 4);
             }
          } else {
             ctx.fillStyle = '#10b981';
             ctx.font = 'bold 14px sans-serif';
             ctx.fillText('MENYIMPAN KEHADIRAN...', box.x + 10, box.y - 20);
          }
        }
      }

      requestAnimationFrame(recognize);
    };

    recognize();
  };

  const handleFaceMatch = async (userId: string) => {
    setIsProcessing(true);
    
    try {
      const res = await fetch('/api/admin/face-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await res.json();
      
      if (data.success) {
        setLastMatchedUser({
          name: data.name,
          type: data.type,
          time: new Date().toLocaleTimeString('id-ID')
        });
        setShowSuccess(true);
        
        // Add to local logs
        setLogs(prev => [{
            name: data.name,
            type: data.type,
            time: new Date().toLocaleTimeString('id-ID'),
            id: Date.now()
        }, ...prev].slice(0, 10));

        // Cooldown 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
          setIsProcessing(false);
        }, 3000);
      } else {
        // If already clocked, just show and reset faster
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 font-sans flex flex-col items-center justify-center p-0 md:p-10 relative overflow-hidden">
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 blur-[100px] -mr-48 -mt-48 rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-[100px] -ml-48 -mb-48 rounded-full pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="absolute top-0 left-0 right-0 p-8 z-50 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()} 
              className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/10 active:scale-95 transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="hidden md:block">
               <h1 className="text-white font-black text-xs uppercase tracking-[0.3em] ">Corporate Face-ID</h1>
               <p className="text-sky-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Automated Attendance Terminal</p>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white text-[10px] font-black tracking-widest uppercase">
               Live Terminal: {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
         </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
           <div className="relative">
              <div className="w-24 h-24 rounded-2xl border-2 border-sky-500/30 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <ShieldCheck className="w-10 h-10 text-sky-500" />
              </div>
           </div>
           <div className="text-center space-y-2">
              <p className="text-white font-black text-xs uppercase tracking-[0.4em] animate-pulse">{message}</p>
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
                 <div className="h-full bg-sky-500 animate-shimmer" style={{ width: '60%' }} />
              </div>
           </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 animate-in zoom-in-95 duration-500">
           
           {/* LEFT: SCANNER (8 COLS) */}
           <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="relative aspect-video bg-black rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
                 <video 
                   ref={videoRef} 
                   className="w-full h-full object-cover scale-x-[-1]" 
                   muted 
                   playsInline
                 />
                 <canvas 
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-20"
                  />
                 
                 {/* SCANNER OVERLAY */}
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 md:w-80 md:h-80 border-2 border-sky-400/30 rounded-full relative">
                       {/* Corners */}
                       <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-sky-500 -mt-1 -ml-1 rounded-tl-3xl"></div>
                       <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-sky-500 -mt-1 -mr-1 rounded-tr-3xl"></div>
                       <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-sky-500 -mb-1 -ml-1 rounded-bl-3xl"></div>
                       <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-sky-500 -mb-1 -mr-1 rounded-br-3xl"></div>
                       
                       {/* Scanner Line */}
                       <div className="absolute inset-x-0 h-0.5 bg-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,1)] animate-scan-line z-20"></div>
                       
                       <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                          <ShieldCheck size={48} className="text-sky-500" />
                          <p className="text-sky-400 text-[8px] font-black uppercase tracking-[0.3em] mt-3">Scanning Bio-Data</p>
                       </div>
                    </div>
                 </div>

                 {/* STATUS BAR */}
                 <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <p className="text-white text-[10px] font-black uppercase tracking-widest">Bio-Scanner Active</p>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="text-sky-400 text-[9px] font-bold uppercase tracking-widest">FPS: 30</div>
                       <div className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Resolution: 720p</div>
                    </div>
                 </div>

                 {/* MATCH SUCCESS OVERLAY */}
                 {showSuccess && lastMatchedUser && (
                    <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300 z-50">
                       <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-xl scale-110 mb-6 border-4 border-white/20">
                          <CheckCircle2 size={48} />
                       </div>
                       <h2 className="text-white text-3xl font-black uppercase tracking-tight mb-1">{lastMatchedUser.name}</h2>
                       <div className="px-4 py-2 bg-white/20 rounded-full text-white text-xs font-black uppercase tracking-[0.2em] mb-8">
                          ABSENSI {lastMatchedUser.type} BERHASIL
                       </div>
                       <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                          Tercatat pada Pukul {lastMatchedUser.time}
                       </p>
                    </div>
                 )}
              </div>

              {/* STATS / INFO */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                       <Users className="text-sky-500" size={18} />
                       <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Database</span>
                    </div>
                    <div className="text-2xl font-black text-white">{labeledDescriptors.length} <span className="text-[10px] text-white/40 ml-1">FACES</span></div>
                 </div>
                 <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                       <History className="text-emerald-500" size={18} />
                       <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Today's Log</span>
                    </div>
                    <div className="text-2xl font-black text-white">{logs.length} <span className="text-[10px] text-white/40 ml-1">SCANS</span></div>
                 </div>
                 <div className="hidden md:block p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                       <Settings className="text-amber-500" size={18} />
                       <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Latency</span>
                    </div>
                    <div className="text-2xl font-black text-white">42<span className="text-[10px] text-white/40 ml-2">MS</span></div>
                 </div>
              </div>
           </div>

           {/* RIGHT: LIVE LOGS (4 COLS) */}
           <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="flex-1 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden shadow-2xl">
                 <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                       <h3 className="text-white font-black text-xs uppercase tracking-widest">Live Activity</h3>
                       <p className="text-white/30 text-[9px] font-bold mt-1 uppercase">Today's Recent Scans</p>
                    </div>
                    <History size={18} className="text-white/20" />
                 </div>

                 <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {logs.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-center p-8">
                          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/10 mb-4">
                             <ShieldCheck size={32} />
                          </div>
                          <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Menunggu Aktivitas...</p>
                       </div>
                    ) : (
                       logs.map((log) => (
                          <div key={log.id} className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center justify-between group animate-in slide-in-from-right-4 duration-300">
                             <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type === 'masuk' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                   <UserCheck size={18} />
                                </div>
                                <div>
                                   <p className="text-white font-black text-[11px] truncate w-32 uppercase tracking-wide">{log.name}</p>
                                   <p className="text-white/30 text-[8px] font-bold uppercase tracking-widest mt-0.5">{log.type} • {log.time}</p>
                                </div>
                             </div>
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          </div>
                       ))
                    )}
                 </div>

                 <div className="p-6 bg-white/[0.02] border-t border-white/5">
                    <div className="flex items-center gap-3">
                       <AlertCircle size={14} className="text-sky-500" />
                       <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                          Sistem ini otomatis mencatat absensi masuk dan pulang berdasarkan pola harian pegawai.
                       </p>
                    </div>
                 </div>
              </div>
           </div>

        </div>
      )}

      {/* ERROR MODAL OXYGEN */}
      {!loading && labeledDescriptors.length === 0 && (
         <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-6">
               <div className="w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 mx-auto">
                  <AlertCircle size={40} />
               </div>
               <div className="space-y-2">
                  <h2 className="text-white text-xl font-black uppercase tracking-widest">Database Kosong</h2>
                  <p className="text-white/40 text-xs font-bold leading-relaxed">
                     Belum ada wajah pegawai yang didaftarkan. Pegawai perlu mendaftarkan Face-ID melalui halaman profil masing-masing.
                  </p>
               </div>
               <button 
                 onClick={() => router.back()}
                 className="px-8 py-4 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
               >
                 KEMBALI KE DASHBOARD
               </button>
            </div>
         </div>
      )}
    </main>
  );
}
