'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatTime } from '@/lib/utils';
import { Users, Calendar, RefreshCw, Clock, CheckCircle2, AlertCircle, Play, ShieldAlert, Download, UserCheck, CalendarDays, Camera } from 'lucide-react';

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
  const [selectedDate, setSelectedDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date()));
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [todayDate, setTodayDate] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [isHolidayManual, setIsHolidayManual] = useState(false);
  const [isWorkDayOverride, setIsWorkDayOverride] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);

  async function fetchHolidayStatus() {
    try {
      const res = await fetch(`/api/admin/holidays?date=${selectedDate}`);
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        const record = json.data[0];
        if (record.is_work_day) {
          setIsWorkDayOverride(true);
          setIsHolidayManual(false);
        } else {
          setIsHolidayManual(true);
          setIsWorkDayOverride(false);
        }
      } else {
        setIsHolidayManual(false);
        setIsWorkDayOverride(false);
      }
    } catch (err) { console.error(err); }
  }

  async function toggleHoliday() {
    setHolidayLoading(true);
    
    const currentlyHoliday = isTodayHoliday;
    // Calculate weekend status for the selected date
    const dateObj = new Date(selectedDate);
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Makassar' }).format(dateObj);
    const isWeekendOfSelectedDate = dayName === 'Saturday' || dayName === 'Sunday';

    try {
      if (currentlyHoliday) {
        if (isWeekendOfSelectedDate) {
          await fetch('/api/admin/holidays', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: selectedDate, is_work_day: true, keterangan: 'Kerja Lembur Weekend' })
          });
        } else {
          await fetch(`/api/admin/holidays?date=${selectedDate}`, { method: 'DELETE' });
        }
      } else {
        if (isWeekendOfSelectedDate) {
          await fetch(`/api/admin/holidays?date=${selectedDate}`, { method: 'DELETE' });
        } else {
          await fetch('/api/admin/holidays', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: selectedDate, is_work_day: false, keterangan: 'Libur Manual' })
          });
        }
      }
      await fetchHolidayStatus();
      fetchLeaderboard();
    } catch (err) { console.error(err); } finally { setHolidayLoading(false); }
  }

  async function fetchLeaderboard() {
    setLoading(true);
    const dateObj = new Date(selectedDate);
    
    setTodayDate(
      dateObj.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC', // Menggunakan UTC karena selectedDate murni tanggal YYYY-MM-DD
      })
    );

    const { data: allUsers } = await supabase.from('users').select('id, name').eq('role', 'pegawai').eq('status', 'approved');
    const { data: attendanceData } = await supabase.from('attendance').select('*').eq('tanggal', selectedDate);

    const userMap: Record<string, AttendanceEntry> = {};
    (allUsers || []).forEach(u => {
      userMap[u.id] = {
        user_id: u.id, name: u.name, masuk_time: null, pulang_time: null, masuk_status: null, pulang_status: null, masuk_id: null, approval_status: null, foto_url: null, has_alpa: false
      };
    });

    (attendanceData || []).forEach((item: any) => {
      const uid = item.user_id;
      if (!userMap[uid]) return;
      if (item.status === 'alpa') { userMap[uid].has_alpa = true; return; }

      if (item.jenis === 'masuk') {
        userMap[uid].masuk_time = item.waktu_absen;
        userMap[uid].masuk_status = item.status;
        userMap[uid].masuk_id = item.id;
        userMap[uid].approval_status = item.approval_status;
        userMap[uid].foto_url = item.foto_url;
      } else if (item.jenis === 'pulang') {
        userMap[uid].pulang_time = item.waktu_absen;
        userMap[uid].pulang_status = item.status;
      } else if (['izin', 'sakit', 'lupa_absen'].includes(item.jenis)) {
        userMap[uid].masuk_time = item.waktu_absen;
        userMap[uid].masuk_status = item.jenis.toUpperCase().replace('_', ' ');
        userMap[uid].approval_status = item.approval_status;
        userMap[uid].masuk_id = item.id;
      }
    });

    setEntries(Object.values(userMap));
    setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }));
    setLoading(false);
  }

  // Restore & Alpa functions removed for brevity but they should be there
  async function handleRestore(attendanceId: string, isLupa: boolean = false) {
    if (!attendanceId) return;
    if (isLupa && !isTimeModalOpen) {
      setSelectedLupaId(attendanceId);
      setIsTimeModalOpen(true);
      return;
    }
    setActionLoading(attendanceId);
    try {
      const res = await fetch('/api/admin/attendance/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId, masukTime: isLupa ? masukTimeInput : undefined, pulangTime: isLupa ? pulangTimeInput : undefined })
      });
      if (res.ok) { 
        setIsTimeModalOpen(false); 
        fetchLeaderboard(); 
      } else {
        const errData = await res.json();
        alert(errData.error || 'Gagal memulihkan presensi');
      }
    } catch (err) { 
      console.error(err); 
      alert('Masalah koneksi ke server');
    } finally { 
      setActionLoading(null); 
    }
  }

  async function handleAlpa(userId: string) {
    if (!confirm('Berikan penalti Alpa (-5)?')) return;
    setActionLoading(userId);
    try {
      const res = await fetch('/api/admin/attendance/alpa', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ userId, date: selectedDate }) 
      });
      if (res.ok) fetchLeaderboard();
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  }

  async function handleCancelAlpa(userId: string) {
    setActionLoading(userId + '_cancel');
    try {
      const res = await fetch('/api/admin/attendance/alpa/cancel', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ userId, date: selectedDate }) 
      });
      if (res.ok) fetchLeaderboard();
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  }

  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [selectedLupaId, setSelectedLupaId] = useState<string | null>(null);
  const [masukTimeInput, setMasukTimeInput] = useState('08:00');
  const [pulangTimeInput, setPulangTimeInput] = useState('16:00');

  // Weekend Check based on selectedDate
  const dateObj = new Date(selectedDate);
  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Makassar' }).format(dateObj);
  const isWeekendOfSelectedDate = dayName === 'Saturday' || dayName === 'Sunday';
  
  // Logic: Holiday if (Weekend AND NOT overridden to work) OR (Manual Holiday record)
  const isTodayHoliday = (isWeekendOfSelectedDate && !isWorkDayOverride) || isHolidayManual;

  useEffect(() => { 
    fetchLeaderboard(); 
    fetchHolidayStatus();
  }, [selectedDate]); // Reload on date change

  return (
    <div className="space-y-8 pb-20 text-slate-900">
      {/* Sharp Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
           <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
             <CalendarDays size={14} /> Dashboard • Rekap Harian
           </div>
           <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{todayDate}</h1>
             {isTodayHoliday && (
               <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded">Libur</span>
             )}
           </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <div className="flex border border-slate-200 rounded overflow-hidden h-10 bg-white">
             <div className="flex items-center px-3 bg-slate-50 border-r border-slate-200">
                <Calendar size={14} className="text-slate-400" />
             </div>
             <input 
               type="date" 
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 px-4 cursor-pointer hover:bg-slate-50"
             />
           </div>

           <button 
             onClick={toggleHoliday}
             disabled={holidayLoading}
             className={`px-4 py-2 rounded text-xs font-black uppercase tracking-widest border transition-all h-10 ${isTodayHoliday ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'} disabled:opacity-50`}
           >
             {holidayLoading ? '...' : isTodayHoliday ? 'Aktifkan Kerja' : 'Liburkan'}
           </button>
           
           <button onClick={fetchLeaderboard} className="h-10 w-10 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:text-slate-900 bg-white shadow-sm">
             <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
           { label: 'Total Pegawai', val: entries.length, icon: Users, color: 'text-slate-900' },
           { label: 'Hadir / Izin', val: entries.filter(e => e.masuk_time).length, icon: UserCheck, color: 'text-emerald-600' },
           { label: 'Belum Hadir', val: entries.filter(e => !e.masuk_time && !isTodayHoliday).length, icon: ShieldAlert, color: 'text-rose-600' },
           { label: 'Update', val: lastUpdated, icon: Clock, color: 'text-slate-400' }
         ].map((stat, i) => (
           <div key={i} className="bg-white border border-slate-200 p-5 rounded">
              <div className="flex justify-between items-start mb-2">
                 <stat.icon size={16} className="text-slate-300" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
              </div>
              <h3 className={`text-xl font-bold ${stat.color}`}>{stat.val}</h3>
           </div>
         ))}
      </div>

      {/* Main Table */}
      <div className="border border-slate-200 rounded overflow-hidden shadow-sm bg-white">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Pegawai</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Masuk</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pulang</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Aksi Manual</th>
              <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic text-slate-500 font-medium text-xs">
            {loading ? (
              <tr><td colSpan={5} className="p-20 text-center not-italic">Syncing live data...</td></tr>
            ) : entries.map(e => (
              <tr key={e.user_id} className="hover:bg-slate-50/50 transition-colors not-italic text-slate-700">
                <td className="px-6 py-4 font-bold text-slate-900">{e.name}</td>
                <td className="px-6 py-4">
                  {e.masuk_time ? <div className="space-y-0.5">
                    <div className="font-bold text-sm">{formatTime(e.masuk_time)}</div>
                    <div className={`text-[9px] font-black uppercase tracking-tighter ${e.masuk_status === 'terlambat' ? 'text-rose-600' : 'text-slate-400'}`}>{e.masuk_status}</div>
                  </div> : <span className="text-slate-200">-</span>}
                </td>
                <td className="px-6 py-4">
                  {e.pulang_time ? <div className="font-bold text-sm">{formatTime(e.pulang_time)}</div> : <span className="text-slate-200">-</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {/* Status Display */}
                    {e.has_alpa ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-black uppercase">ALPA</span>
                        <button onClick={() => handleCancelAlpa(e.user_id)} className="text-[10px] font-bold text-slate-300 hover:text-rose-600">Batal</button>
                      </div>
                    ) : (e.masuk_status === 'IZIN' || e.masuk_status === 'SAKIT') ? (
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase border rounded ${
                          e.masuk_status === 'SAKIT' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {e.masuk_status}
                        </span>
                      </div>
                    ) : (e.masuk_status === 'LUPA ABSEN') ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase border border-slate-200 rounded">{e.masuk_status}</span>
                        {e.approval_status !== 'dispute_approved' && (
                          <button 
                            disabled={!!actionLoading}
                            onClick={() => handleRestore(e.masuk_id!, true)} 
                            className="px-2 py-0.5 border border-slate-200 rounded text-[9px] font-black uppercase text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all disabled:opacity-50"
                          >
                            {actionLoading === e.masuk_id ? '...' : 'Pulihkan'}
                          </button>
                        )}
                      </div>
                    ) : e.masuk_time ? (
                      <div className="flex items-center gap-2">
                         <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-100">Verified</span>
                         {e.masuk_status === 'terlambat' && e.approval_status !== 'dispute_approved' && (
                           <button 
                             disabled={!!actionLoading}
                             onClick={() => handleRestore(e.masuk_id!)} 
                             className="px-2 py-0.5 border border-slate-200 rounded text-[9px] font-black uppercase text-slate-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all disabled:opacity-50"
                           >
                             {actionLoading === e.masuk_id ? '...' : 'Pulihkan'}
                           </button>
                         )}
                      </div>
                    ) : !isTodayHoliday && (
                      <button onClick={() => handleAlpa(e.user_id)} className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded hover:bg-black uppercase">Alpha</button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  {e.foto_url ? (
                    <a href={e.foto_url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded bg-slate-100 overflow-hidden inline-block border border-slate-200">
                      <img src={e.foto_url} className="w-full h-full object-cover" />
                    </a>
                  ) : <Camera size={14} className="mx-auto text-slate-100" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lupa Absen Modal - Sharp */}
      {isTimeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-sm rounded border border-slate-200 p-8 shadow-2xl">
              <h3 className="text-xl font-bold mb-1">Set Jam Manual</h3>
              <p className="text-xs text-slate-400 mb-6">Lengkapi data jam kerja untuk rekap bulanan.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Jam Masuk</label>
                    <input type="time" value={masukTimeInput} onChange={e => setMasukTimeInput(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm font-bold" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Jam Pulang</label>
                    <input type="time" value={pulangTimeInput} onChange={e => setPulangTimeInput(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm font-bold" />
                 </div>
              </div>

              <div className="flex gap-2">
                 <button onClick={() => setIsTimeModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded text-xs font-bold hover:bg-slate-50">Batal</button>
                 <button onClick={() => handleRestore(selectedLupaId!, true)} className="flex-1 py-3 bg-slate-900 text-white rounded text-xs font-bold hover:bg-black shadow-lg">Simpan</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
