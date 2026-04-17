'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatTime } from '@/lib/utils';
import { Trophy, Users, Calendar, Download, RefreshCw, Clock } from 'lucide-react';

interface AttendanceEntry {
  rank: number;
  name: string;
  waktu_absen: string;
  foto_url: string | null;
  user_id: string;
}

export default function AdminLeaderboardPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [todayDate, setTodayDate] = useState('');

  async function fetchLeaderboard() {
    setLoading(true);
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
    setLastUpdated(
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta',
      })
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Daftar Kehadiran Hari Ini (WIB)</h1>
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <Calendar size={14} /> {todayDate}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLeaderboard} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="btn-primary text-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Download size={14} /> Ekspor Data
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4 bg-white">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Tercepat Hari Ini</p>
            <h3 className="text-lg font-bold text-slate-900 truncate max-w-[150px]">
              {entries[0]?.name || '-'}
            </h3>
          </div>
        </div>
        <div className="card flex items-center gap-4 bg-white">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Total Hadir</p>
            <h3 className="text-2xl font-bold text-slate-900">{entries.length}</h3>
          </div>
        </div>
        <div className="card flex items-center gap-4 bg-white border-blue-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Update Terakhir</p>
            <h3 className="text-xl font-bold text-slate-900 font-mono">{lastUpdated}</h3>
          </div>
        </div>
      </div>

      {/* Advanced Table for Admin */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200 uppercase tracking-tight text-xs">
              <tr>
                <th className="px-6 py-4">Peringkat</th>
                <th className="px-6 py-4">Pegawai</th>
                <th className="px-6 py-4">Waktu Absen</th>
                <th className="px-6 py-4">Foto Selfie</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Belum ada pegawai yang absen hari ini.
                  </td>
                </tr>
              ) : (
                entries.map((entry: any) => (
                  <tr key={entry.user_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
                        entry.rank === 2 ? 'bg-slate-100 text-slate-500' :
                        entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-white border border-slate-100 text-slate-400'
                      }`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {entry.name}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-600">
                      {formatTime(entry.waktu_absen)}
                    </td>
                    <td className="px-6 py-4">
                      {entry.foto_url ? (
                        <div className="w-12 h-12 rounded border border-slate-200 overflow-hidden group relative cursor-zoom-in">
                          <img 
                            src={entry.foto_url} 
                            alt={entry.name} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">Tanpa Foto</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        entry.status === 'terlambat' 
                          ? 'bg-rose-100 text-rose-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {entry.status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu'}
                      </span>
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
