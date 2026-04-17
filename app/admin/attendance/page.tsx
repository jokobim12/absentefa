'use client';

import { useState, useEffect } from 'react';
import { Check, X, Clock, User, FileText, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  user_id: string;
  waktu_absen: string;
  tanggal: string;
  jenis: string;
  keterangan: string;
  foto_url: string;
  approval_status: string;
  users: {
    name: string;
    points: number;
  };
}

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [customPointsMap, setCustomPointsMap] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/attendance');
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          action, 
          customPoints: action === 'approve' ? (customPointsMap[id] ?? -3) : -5 
        }),
      });

      if (res.ok) {
        setRecords(records.filter(r => r.id !== id));
      } else {
        const data = await res.json();
        alert(`${data.error || 'Gagal memproses'}${data.details ? `\n\nDetail: ${data.details}` : ''}`);
      }
    } catch (err) {
      alert('Masalah jaringan');
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-slate-400 mb-4" size={32} />
        <p className="text-slate-500 font-medium">Memuat pengajuan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Persetujuan Presensi</h1>
        <p className="text-slate-500 font-medium">Kelola pengajuan izin, sakit, dan verifikasi kehadiran lainnya.</p>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Semua Selesai!</h3>
          <p className="text-slate-400 text-sm">Tidak ada pengajuan pending saat ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {records.map((record) => (
            <div key={record.id} className="bg-white rounded-[24px] border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:shadow-md transition-shadow">
              
              {/* User Info */}
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                  <User size={24} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">{record.users.name}</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{record.jenis}</p>
                </div>
              </div>

              {/* Request Details */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-4 text-sm text-slate-500">
                   <div className="flex items-center gap-1.5 font-medium whitespace-nowrap">
                     <Clock size={14} /> {new Date(record.waktu_absen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                   </div>
                   <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                   <div className="font-medium whitespace-nowrap">{record.tanggal}</div>
                </div>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  "{record.keterangan || 'Tanpa keterangan'}"
                </p>
              </div>

              {/* Evidence Photo */}
              {record.foto_url && (
                <a href={record.foto_url} target="_blank" rel="noreferrer" className="shrink-0 group relative">
                   <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                      <img src={record.foto_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                   </div>
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <ImageIcon className="text-white" size={16} />
                   </div>
                </a>
              )}

              {/* Actions & Point Adjustment */}
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto shrink-0 items-end md:items-center">
                 
                 {/* Point Selector (Only for Approve) */}
                 <div className="flex flex-col gap-1 w-full md:w-32">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Penyesuaian Poin</label>
                    <select 
                      value={customPointsMap[record.id] ?? -3}
                      onChange={(e) => setCustomPointsMap({...customPointsMap, [record.id]: parseInt(e.target.value)})}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-700 focus:ring-2 ring-slate-900 outline-none cursor-pointer"
                    >
                       <option value="0">0 (Lupa Absen)</option>
                       <option value="-1">-1 (Setengah Hari)</option>
                       <option value="-2">-2 Poin</option>
                       <option value="-3">-3 (Izin Standar)</option>
                       <option value="-5">-5 (Berat)</option>
                    </select>
                 </div>

                 <div className="flex gap-2 w-full md:w-auto">
                   <button
                     disabled={processingId === record.id}
                     onClick={() => handleAction(record.id, 'reject')}
                     className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-rose-100 text-rose-500 font-bold text-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                   >
                     <X size={18} /> Tolak
                   </button>
                   <button
                     disabled={processingId === record.id}
                     onClick={() => handleAction(record.id, 'approve')}
                     className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                   >
                     {processingId === record.id ? <RefreshCw className="animate-spin" size={18} /> : <><Check size={18} /> Setujui</>}
                   </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Point Info Alert */}
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4 items-start">
         <AlertCircle className="text-blue-500 mt-1 shrink-0" size={20} />
         <div>
            <h4 className="font-black text-blue-900 text-sm mb-1 uppercase tracking-tight">Aturan Pengurangan Poin</h4>
            <ul className="text-xs text-blue-700/80 font-medium space-y-1">
               <li>• <strong>Izin Disetujui:</strong> Mengurangi 3 poin dari total poin user.</li>
               <li>• <strong>Izin Ditolak:</strong> Mengurangi 5 poin dari total poin user.</li>
               <li>• <strong>Terlambat/Alpa:</strong> Sudah dihitung otomatis oleh sistem (-1 atau -5).</li>
            </ul>
         </div>
      </div>
    </div>
  );
}
