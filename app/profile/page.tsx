'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Mail, Hash, Briefcase, Camera, Loader2, ChevronLeft, Save, LogOut, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';
import FaceRegistration from '@/components/FaceRegistration';
import { ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';

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
  const [faceData, setFaceData] = useState<{ isRegistered: boolean, registeredAt?: string } | null>(null);
  const [isFaceRegOpen, setIsFaceRegOpen] = useState(false);

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

    // Fetch Face Data status
    try {
      const res = await fetch('/api/profile/face');
      const data = await res.json();
      setFaceData(data);
    } catch (err) {
      console.error('Failed to fetch face data');
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
      <main className="min-h-screen bg-slate-50 font-sans pb-10">
        {/* Header Skeleton */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg skeleton" />
            <div className="text-center space-y-1">
               <div className="w-32 h-4 skeleton mx-auto" />
               <div className="w-20 h-2 skeleton mx-auto opacity-50" />
            </div>
            <div className="w-10" />
          </div>
        </div>

        <div className="max-w-xl mx-auto px-6 pt-10 space-y-10">
          {/* Avatar Skeleton */}
          <div className="flex flex-col items-center gap-6">
            <div className="w-40 h-40 rounded-2xl skeleton" />
            <div className="text-center space-y-2">
               <div className="w-48 h-6 skeleton mx-auto" />
               <div className="w-32 h-3 skeleton mx-auto opacity-50" />
            </div>
          </div>

          {/* Form Skeleton */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 space-y-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <div className="w-24 h-2 skeleton opacity-50" />
                <div className="w-full h-14 rounded-lg skeleton" />
              </div>
            ))}
            <div className="pt-6 space-y-4">
               <div className="w-full h-16 rounded-lg skeleton" />
               <div className="w-full h-12 rounded-lg skeleton opacity-50" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-10">
      {/* Sharp Header - Light Blue Theme */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-xl mx-auto px-6 py-5 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 active:text-sky-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
             <h1 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Pengaturan Profil</h1>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Identitas Pegawai</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 pt-10 space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="w-40 h-40 rounded-2xl border border-slate-200 overflow-hidden bg-white flex items-center justify-center relative">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-slate-100" />
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-sky-500/60 backdrop-blur-sm flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-sky-500 text-white w-10 h-10 rounded-lg hover:bg-sky-600 transition-all transform active:scale-95 flex items-center justify-center border-2 border-white"
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
             <p className="text-[10px] text-sky-500 font-black uppercase tracking-[0.2em] mt-1">{profile.jabatan || 'Anggota TEFA'}</p>
          </div>
        </div>

        {/* SHARP FORM SECTION - NO SHADOW */}
        <div className="bg-white rounded-xl p-8 border border-slate-200">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors">
                       <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 ring-sky-500 transition-all outline-none"
                      placeholder="Nama Lengkap"
                      required
                    />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Pegawai / NIM</label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors">
                       <Hash size={18} />
                    </div>
                    <input
                      type="text"
                      value={profile.nim}
                      onChange={(e) => setProfile({...profile, nim: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 ring-sky-500 transition-all outline-none"
                      placeholder="Masukkan ID/NIM"
                    />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jabatan</label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors">
                       <Briefcase size={18} />
                    </div>
                    <input
                      type="text"
                      value={profile.jabatan}
                      onChange={(e) => setProfile({...profile, jabatan: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 ring-sky-500 transition-all outline-none"
                      placeholder="Jabatan"
                    />
                 </div>
               </div>

               <div className="space-y-2 opacity-50">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Akun</label>
                 <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                       <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={profile.email}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-4 pl-12 pr-4 text-sm font-bold text-slate-400 cursor-not-allowed"
                      disabled
                    />
                 </div>
               </div>
            </div>

            <div className="pt-6 space-y-4">
              <button 
                type="submit" 
                className="w-full bg-sky-500 text-white font-black py-5 rounded-lg hover:bg-sky-600 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                disabled={saving || uploading}
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save size={20} />}
                SIMPAN PERUBAHAN
              </button>
              
              <button 
                type="button" 
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full bg-white border border-rose-100 text-rose-500 font-black py-4 rounded-lg flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest active:bg-rose-50 transition-all"
              >
                <LogOut size={16} />
                Keluar Dari Akun
              </button>
            </div>
          </form>
        </div>

        <div className="p-6 bg-sky-50 rounded-xl border border-sky-100 text-center">
           <p className="text-[9px] text-sky-600 font-bold leading-relaxed uppercase tracking-[0.2em]">
             IDENTITAS ANDA TERLINDUNGI DAN HANYA DIGUNAKAN UNTUK KEPERLUAN OPERASIONAL TEFA.
           </p>
        </div>

        {/* FACE ID SETTINGS CARD */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${faceData?.isRegistered ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Face ID Keamanan</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {faceData?.isRegistered ? 'Sudah Terdaftar' : 'Belum Ada Data'}
                </p>
              </div>
            </div>
            
            {faceData?.isRegistered ? (
               <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                  <UserCheck size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">AKTIF</span>
               </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-500 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                  <AlertTriangle size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">PENDING</span>
               </div>
            )}
          </div>
          
          <div className="p-8 bg-slate-50/50 flex flex-col gap-4">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
               Gunakan pengenalan wajah untuk mempercepat proses absensi di kantor. Data Anda dienkripsi secara aman.
             </p>
             <button 
               onClick={() => setIsFaceRegOpen(true)}
               className="w-full bg-slate-900 text-white font-black py-4 rounded-lg flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
             >
               <Camera size={16} />
               {faceData?.isRegistered ? 'DAFTAR ULANG WAJAH' : 'DAFTARKAN WAJAH SEKARANG'}
             </button>
          </div>
        </div>
      </div>

      {isFaceRegOpen && (
        <FaceRegistration 
          onSuccess={() => {
            setIsFaceRegOpen(false);
            fetchProfile(); // Refresh status
          }}
          onCancel={() => setIsFaceRegOpen(false)}
        />
      )}

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        variant="warning"
        title="LOGOUT AKUN?"
        message="Anda akan keluar dari sesi ini. Pastikan data profil Anda sudah tersimpan."
        confirmText="YA, KELUAR"
      />
    </main>
  );
}
