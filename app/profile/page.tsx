'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Mail, Hash, Briefcase, Camera, Loader2, ChevronLeft, Save, LogOut, RefreshCw } from 'lucide-react';
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa]">
        <RefreshCw className="w-10 h-10 text-slate-300 animate-spin mb-4" />
        <p className="text-slate-500 font-bold tracking-tight">Memuat profil...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] font-sans pb-20">
      {/* Premium Sticky Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-all">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Pengaturan Profil</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 pt-10 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="w-36 h-36 rounded-[32px] border-4 border-white shadow-2xl shadow-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center relative">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <User size={64} className="text-slate-200" />
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-slate-900 text-white w-10 h-10 rounded-2xl shadow-xl hover:bg-black transition-all transform active:scale-95 flex items-center justify-center"
              disabled={uploading}
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
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">{profile.name}</h2>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">{profile.jabatan || 'Anggota TEFA'}</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-[40px] p-8 border border-slate-200/60 shadow-sm">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
               {/* Nama */}
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    Nama Lengkap
                 </label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">
                       <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 ring-slate-900 transition-all outline-none"
                      placeholder="Nama lengkap sesuai identitas"
                      required
                    />
                 </div>
               </div>

               {/* NIM */}
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    NIM / ID Pegawai
                 </label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">
                       <Hash size={18} />
                    </div>
                    <input
                      type="text"
                      value={profile.nim}
                      onChange={(e) => setProfile({...profile, nim: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 ring-slate-900 transition-all outline-none"
                      placeholder="Masukkan NIM"
                    />
                 </div>
               </div>

               {/* Jabatan */}
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    Jabatan Operasional
                 </label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">
                       <Briefcase size={18} />
                    </div>
                    <input
                      type="text"
                      value={profile.jabatan}
                      onChange={(e) => setProfile({...profile, jabatan: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 ring-slate-900 transition-all outline-none"
                      placeholder="Contoh: Frontend Developer"
                    />
                 </div>
               </div>

               {/* Email (Disabled) */}
               <div className="space-y-2 opacity-60">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    Email Akun
                 </label>
                 <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                       <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={profile.email}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-400 cursor-not-allowed"
                      disabled
                    />
                 </div>
               </div>
            </div>

            <div className="pt-6 space-y-4">
              <button 
                type="submit" 
                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-50"
                disabled={saving || uploading}
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save size={20} />}
                Simpan Profil
              </button>
              
              <button 
                type="button" 
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full bg-white border border-rose-100 text-rose-500 font-bold py-4 rounded-2xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <LogOut size={20} />
                Keluar Sesi
              </button>
            </div>
          </form>
        </div>

        <div className="p-6 bg-slate-900/5 rounded-3xl border border-slate-900/5 text-center">
           <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
             Identitas Anda terlindungi dan hanya digunakan untuk keperluan operasional TEFA.
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
