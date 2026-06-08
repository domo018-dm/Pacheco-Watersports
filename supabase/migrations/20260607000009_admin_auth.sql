-- ============================================================
-- Admin auth: profiles, RLS, storage
-- ============================================================

-- profiles extends auth.users with admin flag
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read only their own profile (admin layout reads this to check is_admin)
CREATE POLICY "profiles_own_select"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

GRANT SELECT ON public.profiles TO authenticated;

-- Auto-create a profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Crafts: admin can read ALL (including inactive) and do full CRUD ─────────
-- The existing "Public can read active crafts" policy (active=true for anon) stays.
-- Permissive SELECT policies are OR'd, so admins see all crafts.
CREATE POLICY "crafts_admin_all"
  ON public.crafts AS PERMISSIVE FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin))
  WITH CHECK(EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crafts TO authenticated;

-- ── Reservations: admin can read all rows and update status ──────────────────
CREATE POLICY "reservations_admin_select"
  ON public.reservations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin));

CREATE POLICY "reservations_admin_update"
  ON public.reservations FOR UPDATE TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin))
  WITH CHECK(EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin));

GRANT SELECT, UPDATE ON public.reservations TO authenticated;

-- Amount paid in cents — set by the Stripe webhook on checkout.session.completed
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS amount_cents INTEGER;

-- ── Availability blocks: admin can create and delete ─────────────────────────
CREATE POLICY "blocks_admin_insert"
  ON public.availability_blocks FOR INSERT TO authenticated
  WITH CHECK(EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin));

CREATE POLICY "blocks_admin_delete"
  ON public.availability_blocks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin));

-- Admin can also SELECT all blocks (the public policy already covers anon/authenticated
-- read, but being explicit here for clarity)
CREATE POLICY "blocks_admin_select"
  ON public.availability_blocks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin));

GRANT INSERT, DELETE ON public.availability_blocks TO authenticated;

-- ── Storage bucket for craft photos ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'craft-images', 'craft-images', TRUE,
  5242880,   -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "craft_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'craft-images');

CREATE POLICY "craft_images_admin_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'craft-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin)
  );

CREATE POLICY "craft_images_admin_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'craft-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin)
  );

CREATE POLICY "craft_images_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'craft-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin)
  );
