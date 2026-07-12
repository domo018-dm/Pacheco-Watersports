-- Allow single-photo land jobs: many "before/after" shots are already a single
-- composed image (both halves + labels baked in). Make after_url optional so a
-- job can be either one photo (shown plain) or a true pair (shown as a slider).

ALTER TABLE public.land_jobs
  ALTER COLUMN after_url DROP NOT NULL;
