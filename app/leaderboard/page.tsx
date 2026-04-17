'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatTime } from '@/lib/utils';
import Link from 'next/link';
import { Trophy, Medal, Award, ChevronLeft, RefreshCw, Clock } from 'lucide-react';

interface AttendanceEntry {
  rank: number;
  name: string;
  waktu_absen: string;
  foto_url: string | null;
  status: string;
  user_id: string;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDate, setTodayDate] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'pegawai' | null>(null);

  async function fetchLeaderboard() {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
    }).format(new Date());

    setTodayDate(
      new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      })
    );

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        user_id,
        waktu_absen,
        foto_url,
        status,
        users!inner(name)
      `)
      .eq('tanggal', today)
      .eq('jenis', 'masuk')
      .order('waktu_absen', { ascending: true });

    if (error) {
      console.error('Leaderboard error:', error);
      setLoading(false);
      return;
    }

    const ranked = (data || []).map((item: any, i: number) => ({
      rank: i + 1,
      name: item.users?.name || 'Unknown',
      waktu_absen: item.waktu_absen,
      foto_url: item.foto_url,
      status: item.status,
      user_id: item.user_id,
    }));

    setEntries(ranked);
    setLoading(false);
  }

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile) setUserRole(profile.role as 'admin' | 'pegawai');
      }
    }
    checkRole();
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30 * 1000);
    return () => clearInterval(interval);
  }, [supabase]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(userRole === 'admin' ? '/admin/leaderboard' : '/absen');
    }
  };

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header Statis */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between">
          <button 
            onClick={handleBack} 
            className="text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
             <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leaderboard WIB</h1>
             <p className="text-xs text-slate-500 font-medium">{todayDate}</p>
          </div>
          <button onClick={() => {setLoading(true); fetchLeaderboard();}} className="text-slate-400 hover:text-blue-600 transition-colors">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-8">
        {loading && entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium">Memuat peringkat terbaru...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Belum Ada Data</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
              Jadilah orang pertama yang melakukan absensi hari ini pukul 07:00!
            </p>
            <Link href="/login" className="btn-primary inline-flex">Masuk Sekarang</Link>
          </div>
        ) : (
          <>
            {/* Podium View Section */}
            <div className="flex items-end justify-center gap-2 pt-10 pb-4 h-64">
              {/* Rank 2 */}
              {top3[1] && (
                <div className="flex flex-col items-center flex-1 max-w-[100px]">
                  <div className="relative mb-3 group">
                    <div className="w-16 h-16 rounded-full border-2 border-slate-300 overflow-hidden shadow-md">
                      {top3[1].foto_url ? (
                        <img src={top3[1].foto_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                         <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">{top3[1].name.charAt(0)}</div>
                      )}
                    </div>
                    <div className={`absolute -top-1 -left-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-sm ${top3[1].status === 'terlambat' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                       {top3[1].status === 'terlambat' ? 'Late' : 'OnTime'}
                    </div>
                    <div className="absolute -bottom-2 -right-1 w-6 h-6 bg-slate-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-slate-50">2</div>
                  </div>
                  <div className="h-24 w-full bg-white border-x border-t border-slate-200 rounded-t-lg flex flex-col items-center justify-start pt-3 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-300"></div>
                    <p className="text-[10px] font-bold text-slate-800 text-center truncate px-2 mb-1">{top3[1].name.split(' ')[0]}</p>
                    <p className="text-[12px] font-black text-slate-500 font-mono">{formatTime(top3[1].waktu_absen)}</p>
                  </div>
                </div>
              )}

              {/* Rank 1 */}
              {top3[0] && (
                <div className="flex flex-col items-center flex-1 max-w-[120px] -mt-10">
                  <div className="relative mb-3">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500 animate-bounce">
                      <Trophy size={28} fill="currentColor" />
                    </div>
                    <div className="w-20 h-20 rounded-full border-4 border-blue-600 overflow-hidden shadow-xl">
                      {top3[0].foto_url ? (
                        <img src={top3[0].foto_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                         <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl">{top3[0].name.charAt(0)}</div>
                      )}
                    </div>
                    <div className={`absolute -top-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow-lg z-10 ${top3[0].status === 'terlambat' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                       {top3[0].status === 'terlambat' ? 'Late' : 'OnTime'}
                    </div>
                    <div className="absolute -bottom-2 -right-1 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-[12px] font-black border-2 border-white shadow-lg">1</div>
                  </div>
                  <div className="h-32 w-full bg-white border border-blue-200 rounded-t-xl flex flex-col items-center justify-start pt-4 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                    <p className="text-xs font-black text-slate-900 text-center truncate px-2 mb-1">{top3[0].name.split(' ')[0]}</p>
                    <p className="text-sm font-black text-blue-600 font-mono">{formatTime(top3[0].waktu_absen)}</p>
                  </div>
                </div>
              )}

              {/* Rank 3 */}
              {top3[2] && (
                <div className="flex flex-col items-center flex-1 max-w-[100px]">
                  <div className="relative mb-3">
                    <div className="w-14 h-14 rounded-full border-2 border-orange-300 overflow-hidden shadow-md">
                      {top3[2].foto_url ? (
                        <img src={top3[2].foto_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                         <div className="w-full h-full bg-orange-50 flex items-center justify-center text-orange-400 font-bold">{top3[2].name.charAt(0)}</div>
                      )}
                    </div>
                    <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-sm ${top3[2].status === 'terlambat' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                       {top3[2].status === 'terlambat' ? 'Late' : 'OnTime'}
                    </div>
                    <div className="absolute -bottom-2 -right-1 w-6 h-6 bg-orange-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-slate-50">3</div>
                  </div>
                  <div className="h-20 w-full bg-white border-x border-t border-slate-200 rounded-t-lg flex flex-col items-center justify-start pt-3 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-orange-300"></div>
                    <p className="text-[10px] font-bold text-slate-800 text-center truncate px-2 mb-1">{top3[2].name.split(' ')[0]}</p>
                    <p className="text-[12px] font-black text-orange-500 font-mono">{formatTime(top3[2].waktu_absen)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Scrolling List View for Rest */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Peringkat Lainnya</p>
              </div>
              <div className="divide-y divide-slate-100">
                {rest.length > 0 ? (
                  rest.map((entry: any) => (
                    <div key={entry.user_id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-8 flex items-center justify-center font-black text-slate-300 text-sm">
                        {entry.rank}
                      </div>
                      <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden bg-white">
                         {entry.foto_url ? (
                           <img src={entry.foto_url} className="w-full h-full object-cover" alt="" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">{entry.name.charAt(0)}</div>
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{entry.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${entry.status === 'terlambat' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                           {entry.status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-600 font-mono">{formatTime(entry.waktu_absen)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-slate-400 text-xs italic">
                    Belum ada peringkat tambahan.
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pt-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Kehadiran: {entries.length} Orang</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
