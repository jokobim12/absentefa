-- ============================================================
-- TABEL USER_FACES
-- Deskripsi: Menyimpan Face Descriptor (128-float array)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  descriptor FLOAT8[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS user_faces_user_id_idx ON public.user_faces(user_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.user_faces ENABLE ROW LEVEL SECURITY;

-- Users can manage own face data
CREATE POLICY "Users can manage own face data" ON public.user_faces
  FOR ALL USING (auth.uid() = user_id);

-- Admins can read all face data for matching
CREATE POLICY "Admins can read all face data" ON public.user_faces
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
