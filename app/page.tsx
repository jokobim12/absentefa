import Link from 'next/link';
import { QrCode, ShieldCheck, Zap, Users, Trophy, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 overflow-x-hidden relative">
      
      {/* Navbar Minimalis & Responsif */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
              <span className="text-white font-black text-lg">T</span>
            </div>
            <span className="font-black text-xl text-slate-900 tracking-tighter">TEFASync</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/login" className="text-slate-500 hover:text-slate-900 text-sm font-bold px-3 py-2 transition-colors">
              Masuk
            </Link>
            <Link href="/register" className="bg-slate-900 hover:bg-black text-white text-[13px] font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-95">
              Daftar Pegawai
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20">
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
            
            {/* Left Content */}
            <div className="space-y-10 animate-in slide-in-from-left duration-700">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                 Sistem Absensi Digital TEFA
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 leading-[0.95] tracking-tight">
                Kelola kehadiran dengan <span className="text-slate-400">cepat & akurat.</span>
              </h1>
              
              <p className="text-lg text-slate-500 leading-relaxed max-w-lg font-medium">
                Solusi modern untuk mencatat kehadiran pegawai dengan teknologi <span className="text-slate-900 font-bold">Dynamic QR Code</span> yang aman dan transparan.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/login" className="bg-slate-900 hover:bg-black text-white text-center font-bold px-8 py-5 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                  Mulai Absensi <ArrowRight size={20} />
                </Link>
                <Link href="/leaderboard" className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-center font-bold px-8 py-5 rounded-2xl transition-all flex items-center justify-center gap-2">
                  <Trophy size={20} className="text-amber-500" /> Leaderboard
                </Link>
              </div>

              <div className="flex items-center gap-6 pt-6 grayscale opacity-40">
                 <div className="flex -space-x-3">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
                   ))}
                 </div>
                 <p className="text-xs font-bold text-slate-500">Dipercaya oleh 100+ Pegawai</p>
              </div>
            </div>

            {/* Right Visual Area */}
            <div className="relative animate-in slide-in-from-right duration-1000">
              {/* Subtle background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-50/50 rounded-full blur-3xl opacity-60 -z-10"></div>
              
              <div className="bg-white border border-slate-100 rounded-[40px] p-6 sm:p-12 shadow-2xl shadow-slate-100 relative overflow-hidden group">
                 <div className="absolute bottom-0 right-0 w-32 h-32 bg-slate-50 rounded-tl-[100px] transition-all group-hover:scale-110 duration-700"></div>
                 
                 {/* Mockup QR Area */}
                 <div className="relative max-w-[280px] mx-auto aspect-square bg-slate-50 rounded-[32px] border border-slate-100 flex items-center justify-center overflow-hidden">
                     <QrCode size={140} className="text-slate-900 opacity-80" />
                     {/* Scanner line placeholder */}
                     <div className="absolute top-0 inset-x-0 h-[2px] bg-slate-900/10 blur-[2px] animate-[scan_3s_infinite_linear]"></div>
                 </div>

                 <div className="mt-10 text-center space-y-2">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tahap 2</p>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Pindai QR Token</h3>
                    <p className="text-sm text-slate-400 font-medium">QR berganti otomatis setiap 10 detik.</p>
                 </div>
              </div>

              {/* Status Badge Float */}
              <div className="absolute -top-6 -right-2 sm:-right-10 bg-white border border-slate-100 p-3 sm:p-4 rounded-[20px] sm:rounded-[24px] shadow-2xl shadow-slate-200 flex items-center gap-3 sm:gap-4 animate-bounce" style={{ animationDuration: '4s' }}>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-xl ring-4 ring-white shadow-inner">
                   <ShieldCheck size={24} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Keamanan Lokasi</p>
                   <p className="text-sm font-black text-slate-900">GPS Terverifikasi</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Features Minimalist Bar */}
        <section className="mt-32 border-y border-slate-50 bg-slate-50/30 py-20 overflow-hidden">
           <div className="max-w-7xl mx-auto px-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                 {[
                   { title: "Anti-Fake GPS", desc: "Validasi radius presisi.", icon: Zap },
                   { title: "Live Face Verification", desc: "Mencegah absen titipan.", icon: Users },
                   { title: "Dashboard Real-time", desc: "Pantau ranking harian.", icon: Trophy },
                   { title: "Dynamic Security", desc: "Token QR terenkripsi.", icon: QrCode }
                 ].map((feat, i) => (
                   <div key={i} className="flex gap-4 group">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-900 shadow-sm transition-all group-hover:bg-slate-900 group-hover:text-white group-hover:-translate-y-1 duration-300">
                         <feat.icon size={20} />
                      </div>
                      <div>
                         <h4 className="font-black text-slate-900 text-sm tracking-tight">{feat.title}</h4>
                         <p className="text-slate-400 text-xs mt-1 font-medium">{feat.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Benefits Segment */}
        <section className="max-w-7xl mx-auto px-6 mt-32">
           <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="relative order-2 lg:order-1">
                 <div className="aspect-square bg-slate-50 rounded-[48px] overflow-hidden border border-slate-100 flex items-center justify-center p-12">
                    <div className="w-full h-full bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-6">
                        <div className="flex gap-2">
                           {[1,2,3].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-slate-100"></div>)}
                        </div>
                        <div className="text-center space-y-3 px-8">
                           <div className="w-20 h-2 bg-slate-100 rounded-full mx-auto"></div>
                           <div className="w-32 h-2 bg-slate-50 rounded-full mx-auto"></div>
                           <div className="w-24 h-2 bg-slate-50 rounded-full mx-auto"></div>
                        </div>
                        <div className="w-48 h-12 bg-emerald-500 rounded-xl mt-4 flex items-center justify-center">
                           <CheckCircle2 className="text-white" size={24} />
                        </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-8 order-1 lg:order-2">
                 <h2 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight tracking-tight">Didesain untuk efisiensi maksimal.</h2>
                 <p className="text-slate-500 text-lg leading-relaxed font-medium">Bukan sekadar mencatat jam, TEFASync memastikan integritas data melalui verifikasi bertahap yang sulit dimanipulasi.</p>
                 
                 <div className="space-y-4 pt-4">
                    {[
                      "Pengenalan wajah real-time saat absen.",
                      "Verifikasi koordinat GPS terhadap area kantor.",
                      "Persetujuan akun langsung oleh administrator."
                    ].map((list, i) => (
                      <div key={i} className="flex gap-4 items-center">
                         <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                            <CheckCircle2 size={14} strokeWidth={3} />
                         </div>
                         <p className="font-bold text-slate-700 text-sm">{list}</p>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </section>

      </main>

      <footer className="border-t border-slate-100 py-12">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-400 text-sm font-medium">© 2026 TEFASync. Built for Productivity.</p>
            <div className="flex gap-8">
               <span className="text-slate-300 text-xs font-black uppercase tracking-widest">Privacy Policy</span>
               <span className="text-slate-300 text-xs font-black uppercase tracking-widest">Terms of Service</span>
            </div>
         </div>
      </footer>
    </div>
  );
}
