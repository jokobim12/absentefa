'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Email atau password salah. Coba lagi.');
      setLoading(false);
      return;
    }

    if (data.user) {
      // Check role and status for redirect
      const { data: profile } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', data.user.id)
        .single();
        
      if (profile?.status === 'pending' || profile?.status === 'rejected') {
         router.push('/pending');
      } else if (profile?.role === 'admin') {
         router.push('/admin/users');
      } else {
         router.push('/absen');
      }
      
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Login Sistem</h1>
          <p className="text-slate-500 mt-1 text-sm">Masuk untuk melakukan absensi</p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Belum punya akun?{' '}
              <Link href="/register" className="text-blue-600 font-medium hover:underline">
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
