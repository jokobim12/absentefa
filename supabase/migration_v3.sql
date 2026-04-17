-- 1. Hapus constraint lama jika ada
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_jenis_check;
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_status_check;

-- 2. Tambahkan kembali constraint dengan dukungan 'lupa_absen' dan 'alpa'
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_jenis_check 
CHECK (jenis IN ('masuk', 'pulang', 'izin', 'sakit', 'lupa_absen', 'alpa'));

ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_status_check 
CHECK (status IN ('hadir', 'terlambat', 'lembur', 'izin', 'sakit', 'alpa'));
