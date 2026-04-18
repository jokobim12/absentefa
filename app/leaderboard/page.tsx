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
    <main className="min-h-screen bg-slate-50 font-sans pb-10">
      {/* Sharp Header - Light Blue Theme */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <button 
            onClick={handleBack} 
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 active:text-sky-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
             <h1 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Live Leaderboard</h1>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{todayDate}</p>
          </div>
          <button onClick={() => {setLoading(true); fetchLeaderboard();}} className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 active:text-sky-500 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10 space-y-10">
        {loading && entries.length === 0 ? (
          <div className="animate-in fade-in duration-500">
            {/* Podium Skeleton */}
            <div className="flex items-end justify-center gap-2 pt-10 pb-4 h-64 mb-10">
              <div className="flex flex-col items-center flex-1 max-w-[100px] gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-24 w-full bg-slate-100 animate-pulse rounded-t-lg" />
              </div>
              <div className="flex flex-col items-center flex-1 max-w-[120px] gap-3 mb-4">
                <div className="w-20 h-20 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-32 w-full bg-slate-100 animate-pulse rounded-t-xl" />
              </div>
              <div className="flex flex-col items-center flex-1 max-w-[100px] gap-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-20 w-full bg-slate-100 animate-pulse rounded-t-lg" />
              </div>
            </div>
            
            {/* List Skeleton */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
               {[1, 2, 3, 4, 5].map((i) => (
                 <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50">
                   <div className="w-8 h-4 bg-slate-100 animate-pulse rounded" />
                   <div className="w-11 h-11 bg-slate-100 animate-pulse rounded-lg" />
                   <div className="flex-1 space-y-2">
                     <div className="w-32 h-3 bg-slate-100 animate-pulse rounded" />
                     <div className="w-20 h-2 bg-slate-100 animate-pulse rounded opacity-50" />
                   </div>
                   <div className="w-12 h-6 bg-slate-100 animate-pulse rounded" />
                 </div>
               ))}
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
              <Trophy size={32} className="text-slate-200" />
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Belum Ada Data</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
              Jadilah orang pertama yang melakukan absensi hari ini!
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            {/* Podium View Section - No Shadows */}
            <div className="flex items-end justify-center gap-2 pt-10 pb-4 h-64">
              {/* Rank 2 */}
              {top3[1] && (
                <div className="flex flex-col items-center flex-1 max-w-[100px]">
                  <div className="relative mb-3 group">
                    <div className="w-16 h-16 rounded-full border-2 border-slate-200 overflow-hidden bg-white">
                      {top3[1].foto_url ? (
                        <img src={top3[1].foto_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-opacity" alt="" />
                      ) : (
                         <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200"><User size={24} /></div>
                      )}
                    </div>
                    <div className={`absolute -top-1 -left-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border border-white ${top3[1].status === 'terlambat' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                       {top3[1].status === 'terlambat' ? 'Late' : 'OnTime'}
                    </div>
                    <div className="absolute -bottom-2 -right-1 w-6 h-6 bg-slate-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white">2</div>
                  </div>
                  <div className="h-24 w-full bg-white border border-slate-200 rounded-t-lg flex flex-col items-center justify-start pt-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-200"></div>
                    <p className="text-[10px] font-black text-slate-400 text-center truncate px-2 mb-1 uppercase tracking-tighter">2ND PLACE</p>
                    <p className="text-[11px] font-black text-slate-900 font-mono tracking-tighter">{formatTime(top3[1].waktu_absen)}</p>
                  </div>
                </div>
              )}

              {/* Rank 1 */}
              {top3[0] && (
                <div className="flex flex-col items-center flex-1 max-w-[120px] -mt-1 z-10">
                  <div className="relative mb-3 group">
                    <div className="w-20 h-20 rounded-full border-4 border-sky-500 overflow-hidden bg-white">
                      {top3[0].foto_url ? (
                        <img src={top3[0].foto_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                      ) : (
                         <div className="w-full h-full bg-sky-50 flex items-center justify-center text-sky-500"><User size={32} /></div>
                      )}
                    </div>
                    <div className={`absolute -top-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border-2 border-white z-10 ${top3[0].status === 'terlambat' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                       {top3[0].status === 'terlambat' ? 'Late' : 'OnTime'}
                    </div>
                    <div className="absolute -bottom-2 -right-1 w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center text-[12px] font-black border-2 border-white">1</div>
                  </div>
                  <div className="h-32 w-full bg-white border border-sky-200 rounded-t-xl flex flex-col items-center justify-start pt-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-sky-500"></div>
                    <Trophy className="text-sky-500 mb-1" size={18} />
                    <p className="text-[10px] font-black text-slate-900 text-center truncate px-2 mb-1 uppercase tracking-tight">{top3[0].name.split(' ')[0]}</p>
                    <p className="text-[12px] font-black text-sky-600 font-mono tracking-tighter">{formatTime(top3[0].waktu_absen)}</p>
                  </div>
                </div>
              )}

              {/* Rank 3 */}
              {top3[2] && (
                <div className="flex flex-col items-center flex-1 max-w-[100px]">
                  <div className="relative mb-3">
                    <div className="w-14 h-14 rounded-full border-2 border-slate-200 overflow-hidden bg-white">
                      {top3[2].foto_url ? (
                        <img src={top3[2].foto_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0" alt="" />
                      ) : (
                         <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200"><User size={20} /></div>
                      )}
                    </div>
                    <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border border-white ${top3[2].status === 'terlambat' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                       {top3[2].status === 'terlambat' ? 'Late' : 'OnTime'}
                    </div>
                    <div className="absolute -bottom-2 -right-1 w-6 h-6 bg-slate-300 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white">3</div>
                  </div>
                  <div className="h-20 w-full bg-white border border-slate-200 rounded-t-lg flex flex-col items-center justify-start pt-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-200"></div>
                    <p className="text-[9px] font-black text-slate-400 text-center truncate px-2 mb-1 uppercase tracking-tighter">3RD PLACE</p>
                    <p className="text-[10px] font-black text-slate-900 font-mono tracking-tighter">{formatTime(top3[2].waktu_absen)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* List View - Light Blue Theme */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-12">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Peringkat Berjalan</p>
                <span className="text-[9px] font-black text-sky-600 bg-sky-50 px-2 py-1 rounded border border-sky-100">HARI INI</span>
              </div>
              <div className="divide-y divide-slate-100">
                {rest.length > 0 ? (
                  rest.map((entry: any) => (
                    <div key={entry.user_id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-8 flex items-center justify-center font-black text-slate-300 text-sm">
                        {entry.rank.toString().padStart(2, '0')}
                      </div>
                      <div className="w-11 h-11 rounded-lg border border-slate-100 overflow-hidden bg-slate-50 relative group">
                         {entry.foto_url ? (
                           <img src={entry.foto_url} className="w-full h-full object-cover" alt="" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-200"><User size={18} /></div>
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{entry.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${entry.status === 'terlambat' ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'}`}>
                             {entry.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black text-slate-900 font-mono tracking-tighter mb-0.5">{formatTime(entry.waktu_absen)}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Clock In</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] italic">
                    Belum ada data tersedia
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pb-10">
               <div className="inline-block bg-sky-50 px-6 py-4 rounded-xl border border-sky-100">
                  <p className="text-[10px] font-black text-sky-600 uppercase tracking-[0.25em]">Total Partisipasi: {entries.length} Orang</p>
               </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
