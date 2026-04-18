'use client';

import { useState, useEffect } from 'react';
import { Check, X, Clock, User, FileText, Image as ImageIcon, AlertCircle, RefreshCw, History } from 'lucide-react';

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

  async function handleAction(recordId: string, action: 'approve' | 'reject') {
    setProcessingId(recordId);
    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId, action }),
      });

      if (res.ok) {
        setRecords(records.filter(r => r.id !== recordId));
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal memproses');
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
        <RefreshCw className="animate-spin text-slate-300 mb-4" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Sharp Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Antrean Persetujuan</h1>
        <p className="text-sm text-slate-500">Daftar pengajuan izin, sakit, dan penyesuaian kehadiran yang perlu diverifikasi.</p>
      </div>

      {/* Main List */}
      {records.length === 0 ? (
        <div className="border border-slate-200 py-24 text-center rounded">
          <Check className="mx-auto text-slate-200 mb-4" size={32} />
          <p className="text-sm font-bold text-slate-400">Semua pengajuan telah diproses.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded divide-y divide-slate-100 bg-white">
          <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
            <div className="col-span-4">Pegawai / Jenis</div>
            <div className="col-span-4">Alasan & Waktu</div>
            <div className="col-span-2 text-center">Lampiran</div>
            <div className="col-span-2 text-right">Aksi</div>
          </div>
          
          {records.map((record) => (
            <div key={record.id} className="grid grid-cols-12 px-6 py-5 items-center hover:bg-slate-50/50 transition-colors">
              {/* User Identity */}
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded flex items-center justify-center text-slate-400 shrink-0">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate leading-tight mb-1">{record.users.name}</div>
                  <div className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    record.jenis === 'sakit' ? 'bg-amber-100 text-amber-700' : 
                    record.jenis === 'izin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {record.jenis.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Description & Time */}
              <div className="col-span-4 pr-6">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 font-medium">
                  <Clock size={12} /> {record.tanggal} • {new Date(record.waktu_absen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed truncate-2-lines italic">"{record.keterangan || 'Tanpa alasan'}"</p>
              </div>

              {/* Evidence */}
              <div className="col-span-2 flex justify-center">
                {record.foto_url ? (
                  <a href={record.foto_url} target="_blank" rel="noreferrer" className="w-10 h-10 border border-slate-200 rounded p-0.5 hover:border-slate-400 transition-all">
                    <img src={record.foto_url} className="w-full h-full object-cover rounded-sm" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Gada File</span>
                )}
              </div>

              {/* Decision Actions */}
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  disabled={processingId === record.id}
                  onClick={() => handleAction(record.id, 'reject')}
                  className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <X size={16} />
                </button>
                <button
                  disabled={processingId === record.id}
                  onClick={() => handleAction(record.id, 'approve')}
                  className="px-4 h-10 flex items-center gap-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-black transition-all disabled:opacity-50 shadow-sm"
                >
                  {processingId === record.id ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  Setujui
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logic Explained - Minimal Design */}
      <div className="bg-slate-50 border border-slate-200 rounded p-6">
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
             <AlertCircle size={16} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 leading-none">Kebijakan Otomatisasi Poin</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
               <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-medium text-slate-500">Izin/Sakit Pertama dalam Seminggu</span>
                  <span className="text-xs font-black text-emerald-600">0 Poin</span>
               </div>
               <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-medium text-slate-500">Izin/Sakit Berikutnya (Minggu Sama)</span>
                  <span className="text-xs font-black text-rose-600">-1 Poin</span>
               </div>
               <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-medium text-slate-500">Lupa Absen / Tugas Luar</span>
                  <span className="text-xs font-black text-slate-900">0 Poin</span>
               </div>
               <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-medium text-slate-500">Pengajuan Ditolak (Alasan Tidak Sah)</span>
                  <span className="text-xs font-black text-rose-700">-5 Poin</span>
               </div>
            </div>
            <p className="mt-4 text-[10px] text-slate-400 font-medium italic">Satu minggu dihitung mulai dari hari Senin hingga Minggu.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
