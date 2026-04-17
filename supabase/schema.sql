-- ============================================================
-- SCHEMA: Sistem Absensi TEFA
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABEL USERS (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nim TEXT,
  jabatan TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'pegawai' CHECK (role IN ('admin', 'pegawai')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- ============================================================
-- 2. TABEL QR_TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  expired_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS qr_tokens_token_idx ON public.qr_tokens(token);

-- ============================================================
-- 3. TABEL ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  waktu_absen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jenis TEXT NOT NULL DEFAULT 'masuk' CHECK (jenis IN ('masuk', 'pulang')),
  lat DOUBLE PRECISION,
  long DOUBLE PRECISION,
  foto_url TEXT,
  status TEXT DEFAULT 'hadir',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query leaderboard & cek duplikasi
CREATE INDEX IF NOT EXISTS attendance_user_tanggal_idx ON public.attendance(user_id, tanggal);
CREATE INDEX IF NOT EXISTS attendance_tanggal_waktu_idx ON public.attendance(tanggal, waktu_absen);

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Users: 
-- admin bisa lihat semua, authenticated bisa lihat user lain (untuk nama di leaderboard)
CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT TO authenticated USING (true);

-- Hanya bisa merubah diri sendiri (untuk saat ini) kecuali admin via API bypass service key
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- QR Tokens: hanya admin yang bisa insert, semua yang login bisa baca
CREATE POLICY "qr_tokens_select_authenticated" ON public.qr_tokens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "qr_tokens_insert_service" ON public.qr_tokens
  FOR INSERT WITH CHECK (true); -- dikontrol via service role key di API

-- Attendance: user bisa lihat semua kehadiran (untuk leaderboard)
CREATE POLICY "attendance_select_authenticated" ON public.attendance
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "attendance_insert_authenticated" ON public.attendance
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 5. FUNCTION: Auto-create user profile setelah register
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'pegawai'),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: jalankan function saat user baru register
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. STORAGE BUCKET untuk foto selfie
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "photos_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attendance-photos');

CREATE POLICY "photos_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'attendance-photos');

-- ============================================================
-- 7. STORAGE BUCKET untuk avatar profil
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
