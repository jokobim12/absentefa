'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Eye, Edit, Trash2, Users, UserCheck, Clock, X, Star, Shield, User as UserIcon, Camera, UserX } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import FaceRegistration from '@/components/FaceRegistration';

type UserData = {
  id: string;
  name: string;
  role: string;
  status: string;
  points: number;
  created_at: string;
  face_registered?: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: '', status: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'approve' | null;
    userId: string | null;
  }>({ isOpen: false, type: null, userId: null });

  const [isFaceRegOpen, setIsFaceRegOpen] = useState(false);
  const [faceRegTarget, setFaceRegTarget] = useState<string | null>(null);

  const supabase = createClient();

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_faces(id)
      `)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const formattedData = data.map((u: any) => ({
        ...u,
        face_registered: u.user_faces && u.user_faces.length > 0
      }));
      setUsers(formattedData);
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  const totalUsers = users.length;
  const approvedUsers = users.filter(u => u.status === 'approved').length;
  const pendingUsers = users.filter(u => u.status === 'pending').length;

  const openModal = (user: UserData, mode: 'view' | 'edit') => {
    setSelectedUser(user);
    setEditMode(mode === 'edit');
    setFormData({ name: user.name, role: user.role, status: user.status });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setEditMode(false);
  };

  async function handleSaveEdit() {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) { fetchUsers(); closeModal(); }
    } catch (e) { alert('Gagal memproses.'); } finally { setActionLoading(false); }
  }

  const triggerDelete = (id: string) => setConfirmModal({ isOpen: true, type: 'delete', userId: id });
  const triggerApprove = (id: string) => setConfirmModal({ isOpen: true, type: 'approve', userId: id });

  const handleConfirmedAction = async () => {
    const { type, userId } = confirmModal;
    if (!userId) return;
    setActionLoading(true);
    try {
      if (type === 'delete') {
        const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        if (res.ok) fetchUsers();
      } else if (type === 'approve') {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' })
        });
        if (res.ok) fetchUsers();
      }
    } catch (e) { alert('Gagal memproses.'); } 
    finally { setActionLoading(false); setConfirmModal({ isOpen: false, type: null, userId: null }); }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Sharp Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
           <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
             Direktori • Manajemen User
           </div>
           <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kelola Seluruh Pegawai</h1>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 transition-colors uppercase tracking-widest">
           Refresh Data
        </button>
      </div>

      {/* Metrics Small Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {[
           { label: 'Total User', val: totalUsers, icon: Users, color: 'text-slate-900' },
           { label: 'Aktif', val: approvedUsers, icon: UserCheck, color: 'text-emerald-600' },
           { label: 'Menunggu', val: pendingUsers, icon: Clock, color: 'text-amber-500' }
         ].map((stat, i) => (
           <div key={i} className="bg-white border border-slate-200 p-4 rounded flex items-center gap-4">
              <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400">
                 <stat.icon size={16} />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                 <h3 className={`text-lg font-bold ${stat.color}`}>{stat.val}</h3>
              </div>
           </div>
         ))}
      </div>

      {/* Sharp Users Table */}
      <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pegawai</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Akses</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Face ID</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Poin</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic font-medium text-slate-400">
            {loading ? (
              <tr><td colSpan={5} className="p-20 text-center not-italic">Synchronizing user data...</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors not-italic text-slate-700">
                <td className="px-6 py-4">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                        <UserIcon size={16} />
                      </div>
                      <span className="font-bold text-slate-900">{user.name}</span>
                   </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {user.face_registered ? (
                       <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <UserCheck size={10} />
                          <span className="text-[9px] font-black uppercase tracking-widest">AKTIF</span>
                       </div>
                    ) : (
                       <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          <UserX size={10} />
                          <span className="text-[9px] font-black uppercase tracking-widest">KOSONG</span>
                       </div>
                    )}
                    <button 
                      onClick={() => {
                        setFaceRegTarget(user.id);
                        setIsFaceRegOpen(true);
                      }}
                      className="p-1 hover:text-sky-500 transition-colors"
                      title="Daftar Wajah"
                    >
                      <Camera size={14} />
                    </button>
                    {user.face_registered && (
                       <button 
                        onClick={async () => {
                          if (confirm('Hapus data wajah user ini?')) {
                            const { error } = await supabase.from('user_faces').delete().eq('user_id', user.id);
                            if (!error) fetchUsers();
                          }
                        }}
                        className="p-1 hover:text-rose-500 transition-colors"
                        title="Hapus Wajah"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-slate-900">{user.points || 0} Pts</td>
                <td className="px-6 py-4">
                   {user.status === 'pending' ? <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-amber-100">Pending</span> :
                    user.status === 'approved' ? <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-emerald-100">Approved</span> :
                    <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-rose-100">Rejected</span>}
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  {user.status === 'pending' && (
                    <button onClick={() => triggerApprove(user.id)} className="bg-slate-900 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest hover:bg-black">Approve</button>
                  )}
                  <button onClick={() => openModal(user, 'view')} className="p-2 border border-slate-100 rounded text-slate-400 hover:text-slate-900"><Eye size={14} /></button>
                  <button onClick={() => openModal(user, 'edit')} className="p-2 border border-slate-100 rounded text-slate-400 hover:text-amber-600"><Edit size={14} /></button>
                  <button onClick={() => triggerDelete(user.id)} className="p-2 border border-slate-100 rounded text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Minimalist Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 transition-all">
          <div className="bg-white rounded border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">{editMode ? 'Edit User' : 'Informasi Pegawai'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-900"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</label>
                  {editMode ? <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-xs font-bold" /> : <p className="text-sm font-bold text-slate-900">{selectedUser.name}</p>}
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hak Akses</label>
                     {editMode ? <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-xs font-bold">
                        <option value="pegawai">Pegawai</option><option value="admin">Admin</option>
                     </select> : <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{selectedUser.role}</p>}
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Akun</label>
                     {editMode ? <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-xs font-bold">
                        <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                     </select> : <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{selectedUser.status}</p>}
                  </div>
               </div>
               {!editMode && (
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akumulasi Poin</span>
                     <span className="text-lg font-black text-amber-500">{selectedUser.points || 0} <span className="text-[10px]">Pts</span></span>
                  </div>
               )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
               <button onClick={closeModal} className="px-4 py-2 border border-slate-200 rounded text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white">{editMode ? 'Batal' : 'Tutup'}</button>
               {editMode && <button onClick={handleSaveEdit} disabled={actionLoading} className="px-4 py-2 bg-slate-900 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-black">Simpan</button>}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmedAction}
        isLoading={actionLoading}
        variant={confirmModal.type === 'delete' ? 'danger' : 'info'}
        title={confirmModal.type === 'delete' ? 'Hapus Pengguna?' : 'Setujui Pendaftaran?'}
        message={confirmModal.type === 'delete' ? 'Tindakan ini tidak dapat dibatalkan.' : 'Berikan akses penuh pada user ini.'}
        confirmText="Konfirmasi"
      />

      {isFaceRegOpen && faceRegTarget && (
        <FaceRegistration 
          targetUserId={faceRegTarget}
          onSuccess={() => {
            setIsFaceRegOpen(false);
            setFaceRegTarget(null);
            fetchUsers();
          }}
          onCancel={() => {
            setIsFaceRegOpen(false);
            setFaceRegTarget(null);
          }}
        />
      )}
    </div>
  );
}
