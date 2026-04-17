'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatTime } from '@/lib/utils';
import { Users, Calendar, RefreshCw, Clock, CheckCircle2, AlertCircle, Moon, Sun, ShieldAlert, Download, UserCheck } from 'lucide-react';

interface AttendanceEntry {
  user_id: string;
  name: string;
  masuk_time: string | null;
  pulang_time: string | null;
  masuk_status: string | null;
  pulang_status: string | null;
  masuk_id: string | null;
  approval_status: string | null;
  foto_url: string | null;
  has_alpa: boolean;
}

export default function AdminLeaderboardPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [todayDate, setTodayDate] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Holiday State
  const [isHolidayAuto, setIsHolidayAuto] = useState(false);
  const [isHolidayManual, setIsHolidayManual] = useState(false);

  async function fetchLeaderboard() {
    setLoading(true);
    const now = new Date();
    
    // WITA Check for weekend
    const dayOfWeek = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'Asia/Makassar',
    }).format(now);
    
    setIsHolidayAuto(dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday');

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
    }).format(now);

    setTodayDate(
      now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Makassar',
      })
    );

    // 1. Fetch ALL active employees
    const { data: allUsers, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'pegawai')
      .eq('status', 'approved');

    if (userError) {
      console.error('User fetch error:', userError);
      setLoading(false);
      return;
    }

    // 2. Fetch today's attendance
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        id,
        user_id,
        waktu_absen,
        foto_url,
        status,
        jenis,
        approval_status
      `)
      .eq('tanggal', today);

    if (attendanceError) {
      console.error('Attendance fetch error:', attendanceError);
      setLoading(false);
      return;
    }

    // 3. Map everything into one structure
    const userMap: Record<string, AttendanceEntry> = {};
    
    allUsers.forEach(u => {
      userMap[u.id] = {
        user_id: u.id,
        name: u.name,
        masuk_time: null,
        pulang_time: null,
        masuk_status: null,
        pulang_status: null,
        masuk_id: null,
        approval_status: null,
        foto_url: null,
        has_alpa: false
      };
    });

    (attendanceData || []).forEach((item: any) => {
      const uid = item.user_id;
      if (!userMap[uid]) return;

      if (item.status === 'alpa') {
        userMap[uid].has_alpa = true;
        return;
      }

      if (item.jenis === 'masuk') {
        userMap[uid].masuk_time = item.waktu_absen;
        userMap[uid].masuk_status = item.status;
        userMap[uid].masuk_id = item.id;
        userMap[uid].approval_status = item.approval_status;
        userMap[uid].foto_url = item.foto_url;
      } else if (item.jenis === 'pulang') {
        userMap[uid].pulang_time = item.waktu_absen;
        userMap[uid].pulang_status = item.status;
      } else if (item.jenis === 'izin' || item.jenis === 'sakit' || item.jenis === 'lupa_absen') {
        userMap[uid].masuk_time = item.waktu_absen;
        userMap[uid].masuk_status = item.jenis.toUpperCase().replace('_', ' ');
        userMap[uid].approval_status = item.approval_status;
        userMap[uid].masuk_id = item.id; // Map the ID so it can be restored
      }
    });

    setEntries(Object.values(userMap));
    setLastUpdated(
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Makassar',
      })
    );
    setLoading(false);
  }

  async function handleRestore(attendanceId: string) {
    if (!attendanceId) return;
    setActionLoading(attendanceId);
    try {
      const res = await fetch('/api/admin/attendance/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId })
      });
      if (res.ok) { fetchLeaderboard(); }
      else { const err = await res.json(); alert(err.error); }
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  }

  async function handleAlpa(userId: string) {
    if (!confirm('Apakah Anda yakin ingin memberikan penalti Alpa (-5 poin) kepada pegawai ini?')) return;
    
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
    }).format(new Date());

    setActionLoading(userId);
    try {
      const res = await fetch('/api/admin/attendance/alpa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: today })
      });
      if (res.ok) { fetchLeaderboard(); }
      else { const err = await res.json(); alert(err.error); }
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  }

  async function handleCancelAlpa(userId: string) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
    }).format(new Date());

    setActionLoading(userId + '_cancel');
    try {
      const res = await fetch('/api/admin/attendance/alpa/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: today })
      });
      if (res.ok) { fetchLeaderboard(); }
      else { const err = await res.json(); alert(err.error); }
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  }

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const isTodayHoliday = isHolidayAuto || isHolidayManual;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-3">
            Rekap Kehadiran
            {isTodayHoliday && (
              <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full uppercase tracking-widest font-black">Libur</span>
            )}
          </h1>
          <p className="text-slate-400 text-xs flex items-center gap-2 font-medium">
            <Calendar size={14} className="text-slate-300" /> {todayDate}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsHolidayManual(!isHolidayManual)} 
            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl border transition-all flex items-center gap-2 shadow-sm ${isHolidayManual ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
          >
            {isHolidayManual ? <Sun size={14} /> : <Moon size={14} />}
            {isHolidayManual ? 'Aktifkan Jam Kerja' : 'Liburkan Hari Ini'}
          </button>
          <button onClick={fetchLeaderboard} className="w-10 h-10 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pegawai Aktif</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{entries.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-emerald-50 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Hadir / Izin</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{entries.filter(e => e.masuk_time).length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-rose-50 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest">Belum Hadir</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{entries.filter(e => !e.masuk_time && !isTodayHoliday).length}</h3>
          </div>
        </div>
      </div>

      {/* Unified Recap Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pegawai</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Masuk</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pulang</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Aksi</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && entries.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-sm font-medium italic">Menyiapkan data kehadiran...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-sm font-medium italic">Tidak ada pegawai yang terdaftar.</td></tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.user_id} className="hover:bg-slate-50/30 transition-all group">
                    <td className="px-8 py-6">
                       <div className="font-bold text-slate-900">{entry.name}</div>
                       <div className="text-[9px] text-slate-300 font-mono hidden uppercase">Emp ID: {entry.user_id.slice(0, 6)}</div>
                    </td>
                    <td className="px-8 py-6">
                      {entry.masuk_time ? (
                        <div className="flex flex-col">
                           <span className="font-black text-slate-900 text-sm font-mono">{formatTime(entry.masuk_time)}</span>
                           <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${entry.masuk_status === 'terlambat' ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {entry.masuk_status}
                           </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs font-medium italic">{isTodayHoliday ? 'Libur' : 'Menunggu...'}</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      {entry.pulang_time ? (
                        <div className="flex flex-col">
                           <span className="font-black text-slate-900 text-sm font-mono">{formatTime(entry.pulang_time)}</span>
                           <span className="text-[9px] font-bold uppercase text-blue-500 tracking-widest mt-0.5">Berakhir</span>
                        </div>
                      ) : (
                        <span className="text-slate-100 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                          {/* ALPA ACTION */}
                          {!entry.masuk_time && !isTodayHoliday && !entry.has_alpa && (
                             <button
                               onClick={() => handleAlpa(entry.user_id)}
                               disabled={actionLoading === entry.user_id}
                               className="bg-slate-50 border border-slate-100 text-slate-400 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                             >
                               {actionLoading === entry.user_id ? <RefreshCw className="animate-spin" size={12} /> : <ShieldAlert size={12} />}
                               Alpa (-5)
                             </button>
                          )}

                          {entry.has_alpa && (
                             <div className="flex items-center gap-2">
                                <span className="bg-rose-50 text-rose-500 px-3 py-1.5 rounded-xl text-[10px] font-black border border-rose-100 uppercase tracking-widest">ALPA (-5)</span>
                                <button
                                   onClick={() => handleCancelAlpa(entry.user_id)}
                                   disabled={actionLoading === entry.user_id + '_cancel'}
                                   className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-tight"
                                >
                                   {actionLoading === entry.user_id + '_cancel' ? <RefreshCw className="animate-spin" size={12} /> : 'Batal'}
                                </button>
                             </div>
                          )}

                          {/* LATE RESTORE ACTION */}
                          {entry.masuk_status === 'terlambat' && entry.approval_status !== 'dispute_approved' && (
                             <button
                               onClick={() => handleRestore(entry.masuk_id!)}
                               disabled={actionLoading === entry.masuk_id}
                               className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-amber-100"
                             >
                                {actionLoading === entry.masuk_id ? <RefreshCw className="animate-spin" size={12} /> : <CheckCircle2 size={12} />}
                                Pulihkan Poin
                             </button>
                          )}
                          
                          {entry.approval_status === 'dispute_approved' && (
                             <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black border border-emerald-100 uppercase tracking-widest">Normal (Pulih)</span>
                          )}

                          {entry.masuk_status === 'IZIN' || entry.masuk_status === 'SAKIT' || entry.masuk_status === 'LUPA ABSEN' ? (
                             <div className="flex items-center gap-2">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest ${
                                   entry.masuk_status === 'LUPA ABSEN' 
                                   ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                   : 'bg-blue-50 text-blue-600 border-blue-100'
                                }`}>
                                   {entry.masuk_status}
                                </span>
                                
                                {entry.approval_status !== 'dispute_approved' && (
                                   <button
                                      onClick={() => handleRestore(entry.masuk_id!)}
                                      disabled={actionLoading === entry.masuk_id}
                                      className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-tight"
                                   >
                                      {actionLoading === entry.masuk_id ? <RefreshCw className="animate-spin" size={12} /> : 'Pulihkan'}
                                   </button>
                                )}
                             </div>
                          ) : (
                            entry.masuk_time && !entry.approval_status && entry.masuk_status !== 'terlambat' && (
                              <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black border border-emerald-100 uppercase tracking-widest">Hadir</span>
                            )
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        {entry.foto_url ? (
                          <a href={entry.foto_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl border border-slate-100 overflow-hidden block shadow-sm hover:scale-105 transition-all">
                            <img src={entry.foto_url} alt={entry.name} className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200">
                             <Clock size={16} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="text-center">
         <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Terakhir diperbarui: {lastUpdated}</p>
      </div>
    </div>
  );
}
