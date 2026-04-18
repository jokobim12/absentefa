-- ============================================================
-- 8. TABEL HOLIDAYS (Persistensi Libur Manual)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.holidays (
  tanggal DATE PRIMARY KEY,
  is_work_day BOOLEAN DEFAULT FALSE,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atur RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Semua user bisa melihat hari libur
CREATE POLICY "holidays_select_authenticated" ON public.holidays
  FOR SELECT TO authenticated USING (true);

-- Hanya admin (via service role / API) yang bisa rubah
-- (Polisi default RLS biasanya menutup insert/update jika tidak ada policy)
