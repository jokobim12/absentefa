'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Download, Users, Clock, ArrowRight, RefreshCw, FileSpreadsheet } from 'lucide-react';

interface MonthlyReportEntry {
  user_id: string;
  name: string;
  total_hadir: number;
  total_hours: number;
  total_points: number;
  avg_hours: number;
}

export default function AdminReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<MonthlyReportEntry[]>([]);
  
  // Filter states
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  async function fetchReport() {
    setLoading(true);
    
    // Calculate date range for the month (Asia/Makassar)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // 1. Fetch all users
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, points')
      .eq('role', 'pegawai')
      .eq('status', 'approved');

    if (!usersData) {
      setLoading(false);
      return;
    }

    // 2. Fetch all attendance for the month
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('user_id, tanggal, jenis, waktu_absen, points_change')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .eq('approval_status', 'approved') // Only count official/approved ones
      .or('approval_status.eq.dispute_approved');

    // 3. Process data
    const userStats: Record<string, { hadir_days: Set<string>, total_ms: number, total_pts: number }> = {};
    
    usersData.forEach(u => {
      userStats[u.id] = { hadir_days: new Set(), total_ms: 0, total_pts: u.points };
    });

    // Grouping by user and date to find pairs
    const pairs: Record<string, Record<string, { masuk?: string, pulang?: string }>> = {};

    (attendanceData || []).forEach(item => {
      const uid = item.user_id;
      const date = item.tanggal;
      if (!userStats[uid]) return;

      userStats[uid].hadir_days.add(date);
      
      if (!pairs[uid]) pairs[uid] = {};
      if (!pairs[uid][date]) pairs[uid][date] = {};

      if (item.jenis === 'masuk') pairs[uid][date].masuk = item.waktu_absen;
      if (item.jenis === 'pulang') pairs[uid][date].pulang = item.waktu_absen;
    });

    // Calculate hours from pairs
    Object.keys(pairs).forEach(uid => {
      Object.keys(pairs[uid]).forEach(date => {
        const { masuk, pulang } = pairs[uid][date];
        if (masuk && pulang) {
          const start = new Date(masuk);
          const end = new Date(pulang);
          const diffMs = end.getTime() - start.getTime();
          if (diffMs > 0) {
            userStats[uid].total_ms += diffMs;
          }
        }
      });
    });

    const finalReport = usersData.map(u => {
      const stats = userStats[u.id];
      const totalHours = stats.total_ms / (1000 * 60 * 60);
      return {
        user_id: u.id,
        name: u.name,
        total_hadir: stats.hadir_days.size,
        total_hours: parseFloat(totalHours.toFixed(2)),
        total_points: stats.total_pts,
        avg_hours: stats.hadir_days.size > 0 ? parseFloat((totalHours / stats.hadir_days.size).toFixed(2)) : 0
      };
    });

    setReport(finalReport);
    setLoading(false);
  }

  function exportCSV() {
    const headers = ['Nama Pegawai', 'Total Kehadiran (Hari)', 'Total Jam Kerja', 'Rata-rata Jam/Hari', 'Total Poin'];
    const rows = report.map(e => [
      e.name,
      e.total_hadir,
      e.total_hours,
      e.avg_hours,
      e.total_points
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Bulanan_${months[month-1]}_${year}.csv`);
    link.click();
  }

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Laporan Bulanan</h1>
          <p className="text-slate-400 font-medium text-sm">Ringkasan performa dan jam kerja pegawai.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex items-center shadow-sm">
            <select 
              value={month} 
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 px-4"
            >
              {months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-slate-100 mx-1" />
            <select 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 px-4"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={exportCSV}
            className="h-[52px] px-6 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-2"
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
            <Users size={20} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pegawai</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{report.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-4">
            <Calendar size={20} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode</p>
          <h3 className="text-xl font-black text-slate-900 mt-1">{months[month-1]} {year}</h3>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
            <Clock size={20} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Jam Kerja</p>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            {report.reduce((acc, curr) => acc + curr.total_hours, 0).toFixed(0)} <span className="text-xs font-medium text-slate-400">Jam</span>
          </h3>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
            <RefreshCw size={20} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Terakhir</p>
          <h3 className="text-xl font-black text-slate-900 mt-1">Real-time</h3>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Pegawai</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Hadir</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Jam</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Rata-rata/Hari</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Poin Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic font-medium">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400">Mengkalkulasi laporan...</td></tr>
              ) : report.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400">Tidak ada data untuk periode ini.</td></tr>
              ) : (
                report.map((e) => (
                  <tr key={e.user_id} className="hover:bg-slate-50/30 transition-all not-italic">
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-900">{e.name}</div>
                      <div className="text-[9px] text-slate-300 font-mono tracking-widest uppercase">Member Active</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-700">{e.total_hadir}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Hari</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-700">{e.total_hours}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Jam</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-50 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-emerald-400 rounded-full" 
                             style={{ width: `${Math.min((e.avg_hours/8)*100, 100)}%` }}
                           />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{e.avg_hours}h</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center px-3 py-1 bg-amber-50 text-amber-600 rounded-xl text-xs font-black border border-amber-100">
                        {e.total_points} Pts
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
