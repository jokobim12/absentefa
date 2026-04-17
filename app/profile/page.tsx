'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Mail, Hash, Briefcase, Camera, Loader2, ChevronLeft, Save, LogOut } from 'lucide-react';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    nim: '',
    jabatan: '',
    avatar_url: ''
  });

  async function fetchProfile() {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      router.push('/login');
      return;
    }

    setUser(authUser);

    const { data: profileData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileData) {
      setProfile({
        name: profileData.name || '',
        email: authUser.email || '',
        nim: profileData.nim || '',
        jabatan: profileData.jabatan || '',
        avatar_url: profileData.avatar_url || ''
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          nim: profile.nim,
          jabatan: profile.jabatan
        })
      });

      if (res.ok) {
        alert('Profil berhasil diperbarui!');
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Gagal: ${data.error}`);
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Limit size to 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto terlalu besar. Maksimal 2MB.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update Database
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: publicUrl })
      });

      if (res.ok) {
        setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
        router.refresh();
      }
    } catch (err: any) {
      alert(`Gagal upload: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Memuat profil...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* Header Statis */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-slate-500 hover:text-blue-600 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Profil Saya</h1>
          <div className="w-6" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-8 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-200 flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-slate-400" />
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-all transform active:scale-95"
              disabled={uploading}
              title="Ganti Foto"
            >
              <Camera size={20} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="text-center">
             <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
             <p className="text-sm text-slate-500">{profile.jabatan || 'Anggota TEFA'}</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="card bg-white shadow-sm border-slate-200">
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Nama */}
               <div className="space-y-1.5 px-1">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <User size={14} /> Nama Lengkap
                 </label>
                 <input
                   type="text"
                   value={profile.name}
                   onChange={(e) => setProfile({...profile, name: e.target.value})}
                   className="input-field"
                   placeholder="Masukkan nama lengkap"
                   required
                 />
               </div>

               {/* NIM */}
               <div className="space-y-1.5 px-1">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <Hash size={14} /> NIM / ID Pegawai
                 </label>
                 <input
                   type="text"
                   value={profile.nim}
                   onChange={(e) => setProfile({...profile, nim: e.target.value})}
                   className="input-field"
                   placeholder="Masukkan NIM"
                 />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Jabatan */}
               <div className="space-y-1.5 px-1">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <Briefcase size={14} /> Jabatan
                 </label>
                 <input
                   type="text"
                   value={profile.jabatan}
                   onChange={(e) => setProfile({...profile, jabatan: e.target.value})}
                   className="input-field"
                   placeholder="Contoh: Web Developer"
                 />
               </div>

               {/* Email (Disabled) */}
               <div className="space-y-1.5 px-1">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <Mail size={14} /> Alamat Email
                 </label>
                 <input
                   type="email"
                   value={profile.email}
                   className="input-field bg-slate-50 cursor-not-allowed text-slate-400"
                   disabled
                 />
                 <p className="text-[10px] text-slate-400 mt-1 italic">* Email tidak dapat diubah</p>
               </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button 
                type="submit" 
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={saving || uploading}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={20} />}
                Simpan Perubahan
              </button>
              
              <button 
                type="button" 
                onClick={() => setIsLogoutModalOpen(true)}
                className="btn-secondary w-full border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                Logout (Keluar Akun)
              </button>
            </div>
          </form>
        </div>

        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 text-center">
           <p className="text-xs text-blue-600 font-medium">
             Data ini akan ditampilkan di Leaderboard dan Dashboard Admin sebagai identitas resmi Anda.
           </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        variant="warning"
        title="Logout Akun?"
        message="Anda akan keluar dari sesi ini. Pastikan data profil Anda sudah tersimpan sebelum keluar."
        confirmText="Ya, Keluar"
      />
    </main>
  );
}
