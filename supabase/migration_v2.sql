-- 1. Tambah kolom points ke tabel users (default 100)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 100;

-- 2. Update constraint jenis di tabel attendance
-- Hapus dulu constraint yang lama jika ada
ALTER TABLE public.attendance 
DROP CONSTRAINT IF EXISTS attendance_jenis_check;

-- Tambahkan constraint baru yang mencakup 'izin' dan 'sakit'
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_jenis_check 
CHECK (jenis IN ('masuk', 'pulang', 'izin', 'sakit'));

-- 3. Tambah kolom pendukung di tabel attendance
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS keterangan TEXT,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS points_change INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Update approval_status untuk data lama
UPDATE public.attendance SET approval_status = 'approved' WHERE approval_status IS NULL;

-- 4. Tambah index untuk pencarian cepat status approval
CREATE INDEX IF NOT EXISTS attendance_approval_status_idx ON public.attendance(approval_status);

-- 5. FUNCTION: Increment points secara aman
CREATE OR REPLACE FUNCTION public.increment_points(user_id_param UUID, increment_by INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET points = COALESCE(points, 100) + increment_by
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
