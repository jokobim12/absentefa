'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Eye, Edit, Trash2, Users, UserCheck, Clock, X } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

type UserData = {
  id: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: '', status: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // New Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'approve' | null;
    userId: string | null;
  }>({ isOpen: false, type: null, userId: null });

  const supabase = createClient();

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  // Summary counts
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
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
        closeModal();
      } else {
        alert(`Gagal menyimpan: ${data.error}`);
      }
    } catch (e) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setActionLoading(false);
    }
  }

  // --- ACTIONS WITH CONFIRMATION MODAL ---

  const triggerDelete = (id: string) => {
    setConfirmModal({ isOpen: true, type: 'delete', userId: id });
  };

  const triggerApprove = (id: string) => {
    setConfirmModal({ isOpen: true, type: 'approve', userId: id });
  };

  const handleConfirmedAction = async () => {
    const { type, userId } = confirmModal;
    if (!userId) return;

    setActionLoading(true);
    try {
      if (type === 'delete') {
        const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        if (res.ok) fetchUsers();
        else alert('Gagal menghapus user.');
      } 
      else if (type === 'approve') {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' })
        });
        if (res.ok) fetchUsers();
      }
    } catch (e) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setActionLoading(false);
      setConfirmModal({ isOpen: false, type: null, userId: null });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Manajemen User</h1>
          <p className="text-slate-500 text-sm">Kelola data pegawai dan hak akses sistem.</p>
        </div>
        <button onClick={fetchUsers} className="btn-secondary text-sm shrink-0">
          🔄 Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
               <Users size={24} />
            </div>
            <div>
               <p className="text-sm text-slate-500 font-medium">Total Terdaftar</p>
               <h3 className="text-2xl font-bold text-slate-900">{totalUsers}</h3>
            </div>
         </div>
         <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
               <UserCheck size={24} />
            </div>
            <div>
               <p className="text-sm text-slate-500 font-medium">Aktif / Disetujui</p>
               <h3 className="text-2xl font-bold text-slate-900">{approvedUsers}</h3>
            </div>
         </div>
         <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-sm flex items-center gap-4 relative overflow-hidden">
            {pendingUsers > 0 && <div className="absolute top-0 right-0 w-2 h-full bg-amber-400"></div>}
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
               <Clock size={24} />
            </div>
            <div>
               <p className="text-sm text-slate-500 font-medium">Pending Approval</p>
               <h3 className="text-2xl font-bold text-slate-900">{pendingUsers}</h3>
            </div>
         </div>
      </div>

      {/* Main Table */}
      <div className="card p-0 overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Nama Lengkap</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                       <svg className="w-8 h-8 text-blue-500 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                       </svg>
                       <span className="text-slate-500 font-medium text-sm">Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                    Belum ada user yang terdaftar di database.
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{user.name}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {user.status === 'pending' && <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Pending</span>}
                      {user.status === 'approved' && <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">Disetujui</span>}
                      {user.status === 'rejected' && <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-xs font-semibold">Ditolak</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-center items-center gap-2">
                        {user.status === 'pending' && (
                           <button 
                             onClick={() => triggerApprove(user.id)} 
                             className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded font-medium transition-colors shadow-sm"
                           >
                             Terima
                           </button>
                        )}
                        <button 
                          onClick={() => openModal(user, 'view')} 
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Detail / Lihat"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => openModal(user, 'edit')} 
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Edit Akses"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => triggerDelete(user.id)} 
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Hapus Akun Permanen"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal View/Edit User */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">
                {editMode ? 'Edit Pengguna' : 'Detail Pengguna'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-full p-1 transition-colors border border-slate-200">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* ID Info */}
              <div className="flex flex-col gap-1">
                 <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">User ID (Internal)</label>
                 <code className="text-xs bg-slate-100 text-slate-600 p-2 rounded block w-full truncate border border-slate-200">
                   {selectedUser.id}
                 </code>
              </div>

              {/* Name Field */}
              <div className="flex flex-col gap-1">
                 <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
                 {editMode ? (
                   <input
                     type="text"
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                     className="input-field"
                     placeholder="Nama lengkap pegawai"
                   />
                 ) : (
                   <div className="text-sm font-medium text-slate-900 border border-transparent py-2">
                     {selectedUser.name}
                   </div>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {/* Role Field */}
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Akses (Role)</label>
                    {editMode ? (
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="input-field cursor-pointer"
                      >
                        <option value="pegawai">Pegawai</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <div className="text-sm py-2">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold ${selectedUser.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                          {selectedUser.role}
                        </span>
                      </div>
                    )}
                 </div>

                 {/* Status Field */}
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Akun</label>
                    {editMode ? (
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="input-field cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    ) : (
                      <div className="text-sm py-2">
                         {selectedUser.status === 'pending' && <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">Pending</span>}
                         {selectedUser.status === 'approved' && <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">Disetujui</span>}
                         {selectedUser.status === 'rejected' && <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-xs font-semibold">Ditolak</span>}
                      </div>
                    )}
                 </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={closeModal} 
                className="btn-secondary px-5"
                disabled={actionLoading}
              >
                {editMode ? 'Batal' : 'Tutup'}
              </button>
              
              {editMode && (
                <button 
                  onClick={handleSaveEdit}
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-md transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </button>
              )}
            </div>
            
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmedAction}
        isLoading={actionLoading}
        variant={confirmModal.type === 'delete' ? 'danger' : 'info'}
        title={confirmModal.type === 'delete' ? 'Hapus Pengguna?' : 'Setujui Pendaftaran?'}
        message={
          confirmModal.type === 'delete' 
          ? 'Tindakan ini permanen. Seluruh data absensi user ini juga akan ikut terhapus dari sistem.'
          : 'User ini akan diberikan akses penuh untuk melakukan absensi setelah disetujui.'
        }
        confirmText={confirmModal.type === 'delete' ? 'Ya, Hapus' : 'Ya, Setujui'}
      />
    </div>
  );
}
