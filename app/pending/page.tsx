'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PendingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'rejected' | 'approved' | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('status')
        .eq('id', user.id)
        .single();

      if (profile) {
        setStatus(profile.status);
        if (profile.status === 'approved') {
          router.push('/absen');
        }
      }
      setLoading(false);
    }
    checkStatus();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md card text-center">
        {status === 'rejected' ? (
          <>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 text-red-600">Akun Ditolak</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Maaf, pendaftaran akun Anda telah ditolak oleh Administrator. Hubungi admin TEFA untuk informasi lebih lanjut.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Menunggu Persetujuan</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Akun Anda telah terdaftar, namun belum disetujui oleh Administrator. Silakan hubungi admin TEFA untuk mengaktifkan akun Anda.
            </p>
          </>
        )}
        
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.refresh()} className="btn-primary">
            Cek Status
          </button>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}
