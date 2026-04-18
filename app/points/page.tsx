'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Coins, 
  AlertCircle, 
  Clock, 
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';

export default function PointsHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userPoints, setUserPoints] = useState(0);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPoints(currentPage);
  }, [currentPage]);

  async function fetchPoints(page: number) {
    try {
      setLoading(true);
      const limit = 5;
      const res = await fetch(`/api/points?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
        setTotalPages(data.totalPages);
        setUserPoints(data.points);
      }
    } catch (err) {
      console.error('Failed to fetch points');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteHistory() {
    if (!deleteModal.id) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/points?id=${deleteModal.id}`, { method: 'DELETE' });
      if (res.ok) {
        // Re-fetch to sync pagination and total points real-time
        await fetchPoints(currentPage);
        
        // If the current page is now empty and not the first page, go back one page
        if (history.length <= 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }
        
        setDeleteModal({ isOpen: false, id: null });
      } else {
        alert('Gagal menghapus riwayat');
      }
    } catch (err) {
      alert('Kesalahan jaringan');
    } finally {
      setIsDeleting(false);
    }
  }

  const getPointStatus = (pts: number) => {
    if (pts >= 100) return { label: 'Sangat Aman', color: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' };
    if (pts >= 80) return { label: 'Cukup Aman', color: 'bg-amber-500', bg: 'bg-amber-50 text-amber-600', border: 'border-amber-100' };
    if (pts >= 60) return { label: 'Waspada', color: 'bg-orange-500', bg: 'bg-orange-50 text-orange-600', border: 'border-orange-100' };
    return { label: 'Tidak Aman', color: 'bg-rose-500', bg: 'bg-rose-50 text-rose-600', border: 'border-rose-100' };
  };

  const status = getPointStatus(userPoints);

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-10">
      {/* Sharp Header - Light Blue Theme */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/absen" className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 active:text-sky-500 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="text-center">
             <h1 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Riwayat Poin</h1>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Overview Aktivitas</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 pt-8">
        
        {/* SHARP TOTAL POINTS CARD - LIGHT BLUE */}
        <div className="bg-sky-500 rounded-xl p-10 mb-8 border border-sky-400 relative overflow-hidden">
           <div className={`absolute top-0 right-0 w-32 h-32 ${status.color} opacity-20 blur-[80px]`}></div>
           <div className="relative z-10 flex flex-col items-center text-white">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4 border border-white/20">
                 <Coins className="text-amber-300 fill-amber-300" size={24} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-100 mb-2">Total Akumulasi Poin</p>
              <h2 className="text-6xl font-black text-white tracking-tighter mb-8">{userPoints}</h2>
              
              {/* Point Status Badge - Sharp */}
              <div className={`flex items-center gap-3 px-6 py-2.5 rounded-lg border-2 ${status.bg} ${status.border} text-[10px] font-black uppercase tracking-[0.2em]`}>
                 <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse`}></div>
                 {status.label}
              </div>
           </div>
        </div>

        <div className="space-y-4">
           {loading ? (
             <div className="space-y-3 animate-in fade-in duration-500">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
                        <div className="h-2 w-32 bg-slate-100 animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="w-10 h-6 bg-slate-100 animate-pulse rounded" />
                  </div>
                ))}
             </div>
           ) : history.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                   <Clock className="text-slate-200" size={32} />
                </div>
                <h3 className="text-slate-900 font-black uppercase text-sm tracking-widest mb-2">Tidak Ada Data</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Belum ada riwayat perubahan poin.</p>
             </div>
           ) : (
             <div className="animate-in fade-in duration-500">
                <div className="space-y-3">
                  {history.map((record) => (
                    <div key={record.id} className="bg-white rounded-xl p-5 border border-slate-200 hover:border-sky-200 hover:bg-sky-50/20 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${record.points_change > 0 ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                          {record.points_change > 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight mb-1">
                            {record.jenis === 'izin' || record.jenis === 'sakit' ? `${record.jenis} ${record.approval_status === 'rejected' ? '(REJECTED)' : ''}` : `PRESENSI ${record.jenis}`}
                          </h4>
                          <div className="flex items-center gap-3 text-[9px] text-slate-400 font-black uppercase tracking-widest">
                             <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(record.waktu_absen).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                             <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                             <span className="flex items-center gap-1"><Clock size={10} /> {new Date(record.waktu_absen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className={`text-lg font-black tracking-tighter ${record.points_change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {record.points_change > 0 ? '+' : ''}{record.points_change}
                         </div>
                         <button 
                           onClick={() => setDeleteModal({ isOpen: true, id: record.id })}
                           className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SHARP PAGINATION - LIGHT BLUE */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-20 hover:border-sky-500 hover:text-sky-500 transition-all font-black"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                         let pageNum = i + 1;
                         if (totalPages > 5 && currentPage > 3) {
                            pageNum = currentPage - 3 + i + 1;
                            if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                         }
                         
                         return (
                           <button
                             key={pageNum}
                             onClick={() => setCurrentPage(pageNum)}
                             className={`w-10 h-10 rounded-lg font-black text-xs transition-all border ${currentPage === pageNum ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-sky-500 hover:text-sky-500'}`}
                           >
                             {pageNum}
                           </button>
                         );
                      })}
                    </div>

                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-20 hover:border-sky-500 hover:text-sky-500 transition-all font-black"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
             </div>
           )}
        </div>
      </div>
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleDeleteHistory}
        isLoading={isDeleting}
        variant="danger"
        title="HAPUS RIWAYAT?"
        message="Data riwayat poin akan dihapus permanen dari sistem."
        confirmText="YA, HAPUS"
      />
    </main>
  );
}
