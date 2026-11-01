-- Astralis v1.2: keep direct client access closed and enable room-change events.
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rooms FROM anon, authenticated;
DROP POLICY IF EXISTS "deny direct client access" ON public.rooms;
CREATE POLICY "deny direct client access"
  ON public.rooms AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

ALTER TABLE public.community_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_library FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.community_library FROM anon, authenticated;
DROP POLICY IF EXISTS "deny direct client access" ON public.community_library;
CREATE POLICY "deny direct client access"
  ON public.community_library AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rooms'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms';
  END IF;
END $$;

UPDATE storage.buckets
SET file_size_limit = 157286400
WHERE id IN ('mesa-assets', 'mesa-private', 'mesa-community');