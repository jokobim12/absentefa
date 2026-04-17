'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
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
    <main className="min-h-screen bg-[#fafafa] font-sans pb-20">
      {/* Premium Sticky Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/absen" className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-all">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Riwayat Poin</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-8">
        
        {/* Total Points Card - Updated with Status */}
        <div className="bg-slate-900 rounded-[32px] p-8 mb-10 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
           <div className={`absolute top-0 right-0 w-32 h-32 ${status.color} opacity-20 blur-[80px]`}></div>
           <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                 <Star className="text-amber-400 fill-amber-400" size={24} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Total Poin Anda</p>
              <h2 className="text-5xl font-black mb-6">{userPoints}</h2>
              
              {/* Point Status Badge */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${status.bg} ${status.border} text-[10px] font-black uppercase tracking-widest`}>
                 <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse`}></div>
                 {status.label}
              </div>
           </div>
        </div>

        <div className="space-y-4">
           {loading ? (
             <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <RefreshCw className="animate-spin text-slate-300 mb-4" size={32} />
                <p className="text-slate-400 font-bold text-sm tracking-tight">Memuat riwayat...</p>
             </div>
           ) : history.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-[32px] border border-slate-100">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Clock className="text-slate-200" size={32} />
                </div>
                <h3 className="text-slate-900 font-bold mb-1">Belum Ada Riwayat</h3>
                <p className="text-slate-400 text-sm">Aktivitas harian Anda akan muncul di sini.</p>
             </div>
           ) : (
             <>
                {history.map((record) => (
                  <div key={record.id} className="bg-white rounded-[24px] p-5 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 ${record.points_change > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                        {record.points_change > 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm capitalize leading-tight mb-1">
                          {record.jenis === 'izin' || record.jenis === 'sakit' ? `${record.jenis} ${record.approval_status === 'rejected' ? '(Ditolak)' : ''}` : `Absen ${record.jenis}`}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                           <Calendar size={10} /> 
                           <span>{new Date(record.waktu_absen).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                           <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                           <Clock size={10} />
                           <span>{new Date(record.waktu_absen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className={`text-lg font-black tracking-tight ${record.points_change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                         {record.points_change > 0 ? '+' : ''}{record.points_change}
                       </div>
                       <button 
                         onClick={() => setDeleteModal({ isOpen: true, id: record.id })}
                         className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                ))}

                {/* Modern Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                         // Simple sliding window for page numbers
                         let pageNum = i + 1;
                         if (totalPages > 5 && currentPage > 3) {
                            pageNum = currentPage - 3 + i + 1;
                            if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                         }
                         
                         return (
                           <button
                             key={pageNum}
                             onClick={() => setCurrentPage(pageNum)}
                             className={`w-11 h-11 rounded-2xl font-black text-sm transition-all ${currentPage === pageNum ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                           >
                             {pageNum}
                           </button>
                         );
                      })}
                    </div>

                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
             </>
           )}
        </div>
      </div>
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleDeleteHistory}
        isLoading={isDeleting}
        variant="danger"
        title="Hapus Riwayat?"
        message="Anda akan menghapus catatan riwayat poin ini. Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
      />
    </main>
  );
}
