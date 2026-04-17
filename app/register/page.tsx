'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'pegawai',
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md card text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Pendaftaran Berhasil</h2>
          <p className="text-slate-600 mb-6 text-sm">
            Akun Anda sedang dalam status <strong>Pending</strong>. Harap tunggu admin menyetujui pendaftaran Anda sebelum dapat digunakan untuk absensi.
          </p>
          <Link href="/login" className="btn-primary inline-block">
            Kembali ke Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Daftar Akun Baru</h1>
          <p className="text-slate-500 mt-1 text-sm">Masukan data diri Anda untuk absensi</p>
        </div>

        <div className="card">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <input
                id="name"
                type="text"
                className="input-field"
                placeholder="Rudi Hermawan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="rudi@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-blue-600 font-medium hover:underline">
                Login di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
