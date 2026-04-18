'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Download, Users, Clock, ArrowRight, RefreshCw, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface MonthlyReportEntry {
  user_id: string;
  name: string;
  total_hadir: number;
  total_izin: number;
  total_hours: number;
  total_points: number;
  avg_hours: number;
}

export default function AdminReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<MonthlyReportEntry[]>([]);
  const [totalWorkDays, setTotalWorkDays] = useState(0);
  
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  async function fetchReport() {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const { data: usersData } = await supabase.from('users').select('id, name, points').eq('role', 'pegawai').eq('status', 'approved');
    if (!usersData) { setLoading(false); return; }

    const { data: attendanceData } = await supabase.from('attendance')
      .select('user_id, tanggal, jenis, waktu_absen, points_change')
      .gte('tanggal', startDate).lte('tanggal', endDate)
      .in('approval_status', ['approved', 'dispute_approved']);

    // 3. Fetch manual holidays first
    let manualHolidays: any[] = [];
    try {
      const hRes = await fetch(`/api/admin/holidays?month=${month}&year=${year}`);
      const hJson = await hRes.json();
      if (hJson.success) manualHolidays = hJson.data;
    } catch (e) { console.error(e); }

    // 4. Calculate Official Working Days & Set
    let workDaysCount = 0;
    const workingDaysSet = new Set<string>();
    
    const datePtr = new Date(year, month - 1, 1);
    while (datePtr.getMonth() === month - 1) {
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(datePtr);
      const manualRecord = manualHolidays.find(h => h.tanggal === dateStr);
      const day = datePtr.getDay();
      const isWeekend = day === 0 || day === 6;

      let isWorkDay = false;
      if (manualRecord) {
        if (manualRecord.is_work_day) isWorkDay = true;
      } else {
        if (!isWeekend) isWorkDay = true;
      }

      if (isWorkDay) {
        workDaysCount++;
        workingDaysSet.add(dateStr);
      }
      
      datePtr.setDate(datePtr.getDate() + 1);
    }
    setTotalWorkDays(workDaysCount);

    // 5. Process attendance ONLY for working days
    const userStats: Record<string, { hadir_days: Set<string>, izin_days: Set<string>, total_ms: number, total_pts: number }> = {};
    usersData.forEach(u => { userStats[u.id] = { hadir_days: new Set(), izin_days: new Set(), total_ms: 0, total_pts: u.points }; });

    const pairs: Record<string, Record<string, { masuk?: string, pulang?: string }>> = {};
    (attendanceData || []).forEach(item => {
      const uid = item.user_id; 
      const date = item.tanggal;
      if (!userStats[uid] || !workingDaysSet.has(date)) return; // IGNORE HOLIDAY DATA
      
      if (['masuk', 'pulang'].includes(item.jenis)) {
        userStats[uid].hadir_days.add(date);
      } else if (['izin', 'sakit'].includes(item.jenis)) {
        userStats[uid].izin_days.add(date);
      }

      if (!pairs[uid]) pairs[uid] = {}; if (!pairs[uid][date]) pairs[uid][date] = {};
      if (item.jenis === 'masuk') pairs[uid][date].masuk = item.waktu_absen;
      if (item.jenis === 'pulang') pairs[uid][date].pulang = item.waktu_absen;
    });

    Object.keys(pairs).forEach(uid => {
      Object.keys(pairs[uid]).forEach(date => {
        const { masuk, pulang } = pairs[uid][date];
        if (masuk && pulang) {
          const diffMs = new Date(pulang).getTime() - new Date(masuk).getTime();
          if (diffMs > 0) userStats[uid].total_ms += diffMs;
        }
      });
    });

    const finalReport = usersData.map(u => {
      const stats = userStats[u.id]; const totalHours = stats.total_ms / (1000 * 60 * 60);
      return {
        user_id: u.id, name: u.name, 
        total_hadir: stats.hadir_days.size, 
        total_izin: stats.izin_days.size,
        total_hours: parseFloat(totalHours.toFixed(2)),
        total_points: stats.total_pts, 
        avg_hours: stats.hadir_days.size > 0 ? parseFloat((totalHours / stats.hadir_days.size).toFixed(2)) : 0
      };
    });
    setReport(finalReport); setLoading(false);
  }

  function exportCSV() {
    const headers = ['Nama Pegawai', 'Hadir', 'Izin/Sakit', 'Total Jam', 'Rata Jam/Hari', 'Poin'];
    const csvContent = [headers.join(','), ...report.map(e => [e.name, e.total_hadir, e.total_izin, e.total_hours, e.avg_hours, e.total_points].join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `Laporan_${months[month-1]}_${year}.csv`; link.click();
  }

  useEffect(() => { fetchReport(); }, [month, year]);

  return (
    <div className="space-y-8 pb-20 text-slate-900">
      {/* Sharp Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
           <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
             Arsip • Laporan Bulanan
           </div>
           <h1 className="text-2xl font-bold tracking-tight">Performa Pegawai</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-slate-200 rounded overflow-hidden h-10 bg-white">
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 px-4 cursor-pointer hover:bg-slate-50">
              {months.map((m, i) => (<option key={m} value={i + 1}>{m}</option>))}
            </select>
            <div className="w-px h-full bg-slate-200" />
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 px-4 cursor-pointer hover:bg-slate-50">
              {[2024, 2025, 2026].map(y => (<option key={y} value={y}>{y}</option>))}
            </select>
          </div>
          <button onClick={exportCSV} className="h-10 px-6 bg-slate-900 text-white rounded font-bold text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
           { label: 'Total Pegawai', val: report.length, icon: Users },
           { label: 'Hari Kerja', val: `${totalWorkDays} Hari`, icon: Calendar },
           { label: 'Total Jam Terkumpul', val: report.reduce((acc, curr) => acc + curr.total_hours, 0).toFixed(0), icon: Clock },
           { label: 'Status Data', val: 'Finalized', icon: RefreshCw }
         ].map((stat, i) => (
          <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded">
             <div className="flex items-center justify-between mb-3">
                <stat.icon size={16} className="text-slate-300" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
             </div>
             <h3 className="text-lg font-bold text-slate-900">{stat.val}</h3>
          </div>
        ))}
      </div>

      {/* Reports Table - Clean Dense */}
      <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pegawai</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Kehadiran</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Izin / Sakit</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total Jam</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produktivitas</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Poin Akhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {loading ? (
              <tr><td colSpan={5} className="p-20 text-center font-bold text-slate-300 transform scale-110">Calculating records...</td></tr>
            ) : report.length === 0 ? (
              <tr><td colSpan={5} className="p-20 text-center font-medium italic text-slate-400">Tidak ada data untuk periode ini.</td></tr>
            ) : (
              report.map((e) => (
                <tr key={e.user_id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{e.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Pegawai Aktif</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="font-bold text-slate-900">{e.total_hadir} <span className="text-slate-300">/ {totalWorkDays}</span></div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Hari Hadir</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="font-bold text-amber-600">{e.total_izin}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Total Izin</div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-900">{e.total_hours}h</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-slate-900" style={{ width: `${Math.min((e.total_hours / (totalWorkDays * 8)) * 100, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-slate-900">
                        {e.total_hours} / {totalWorkDays * 8}h
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-2 py-1 bg-slate-900 text-white text-[10px] font-black rounded">{e.total_points} Pts</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
