
-- ============================================================================
-- DATABASE SETUP FOR LIKES SYNCHRONIZATION SYSTEM
-- ============================================================================
-- Version: 1.0
-- Date: January 2025
-- Purpose: Setup required database objects for likes sync and share functionality
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE STORAGE BUCKET FOR POST PREVIEWS
-- ----------------------------------------------------------------------------

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-previews',
  'post-previews',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. STORAGE POLICIES FOR POST PREVIEWS
-- ----------------------------------------------------------------------------

-- Allow public read access
CREATE POLICY "Public can view post previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-previews');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload post previews"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-previews' 
  AND auth.uid() IS NOT NULL
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own post previews"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-previews'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ----------------------------------------------------------------------------
-- 3. VERIFY LIKES TABLE STRUCTURE
-- ----------------------------------------------------------------------------

-- Ensure likes table has correct structure
DO $$
BEGIN
  -- Check if likes table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'likes') THEN
    CREATE TABLE public.likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
      usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      local_id UUID REFERENCES public.locales(id) ON DELETE CASCADE,
      tipo TEXT CHECK (tipo IN ('usuario', 'local')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(post_id, usuario_id, COALESCE(local_id, '00000000-0000-0000-0000-000000000000'::uuid))
    );
    
    -- Create indexes
    CREATE INDEX idx_likes_post_id ON public.likes(post_id);
    CREATE INDEX idx_likes_usuario_id ON public.likes(usuario_id);
    CREATE INDEX idx_likes_created_at ON public.likes(created_at DESC);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. RLS POLICIES FOR LIKES TABLE
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Allow users to view all likes
CREATE POLICY "Users can view all likes"
ON public.likes FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own likes
CREATE POLICY "Users can insert their own likes"
ON public.likes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = usuario_id
  OR (
    local_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.propietarios_locales
      WHERE local_id = likes.local_id
      AND propietario_id = auth.uid()
      AND activo = true
    )
  )
);

-- Allow users to delete their own likes
CREATE POLICY "Users can delete their own likes"
ON public.likes FOR DELETE
TO authenticated
USING (
  auth.uid() = usuario_id
  OR (
    local_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.propietarios_locales
      WHERE local_id = likes.local_id
      AND propietario_id = auth.uid()
      AND activo = true
    )
  )
);

-- ----------------------------------------------------------------------------
-- 5. UPDATE POSTS TABLE FOR CACHED COUNTS
-- ----------------------------------------------------------------------------

-- Add cached count columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN likes_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'comentarios_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN comentarios_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'compartidos_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN compartidos_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. FUNCTION TO UPDATE CACHED COUNTS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 7. TRIGGERS FOR AUTOMATIC COUNT UPDATES
-- ----------------------------------------------------------------------------

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON public.likes;

-- Create trigger
CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION update_post_likes_count();

-- ----------------------------------------------------------------------------
-- 8. INITIALIZE CACHED COUNTS FOR EXISTING POSTS
-- ----------------------------------------------------------------------------

-- Update likes_count for all existing posts
UPDATE public.posts p
SET likes_count = (
  SELECT COUNT(*)
  FROM public.likes l
  WHERE l.post_id = p.id
);

-- Update comentarios_count for all existing posts
UPDATE public.posts p
SET comentarios_count = (
  SELECT COUNT(*)
  FROM public.comentarios c
  WHERE c.post_id = p.id
);

-- ----------------------------------------------------------------------------
-- 9. ADD IMAGEN_URL COLUMN TO MENSAJES TABLE (IF NOT EXISTS)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mensajes' 
    AND column_name = 'imagen_url'
  ) THEN
    ALTER TABLE public.mensajes ADD COLUMN imagen_url TEXT;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 10. CREATE INDEX FOR PERFORMANCE
-- ----------------------------------------------------------------------------

-- Index for faster post lookup by likes
CREATE INDEX IF NOT EXISTS idx_posts_likes_count 
ON public.posts(likes_count DESC);

-- Index for faster message lookup by post_id
CREATE INDEX IF NOT EXISTS idx_mensajes_post_id 
ON public.mensajes(post_id) 
WHERE post_id IS NOT NULL;

-- Index for faster message lookup by tipo_mensaje
CREATE INDEX IF NOT EXISTS idx_mensajes_tipo_mensaje 
ON public.mensajes(tipo_mensaje) 
WHERE tipo_mensaje IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 11. VERIFY SETUP
-- ----------------------------------------------------------------------------

-- Check storage bucket
SELECT 
  'Storage Bucket' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'post-previews') 
    THEN '✅ Created' 
    ELSE '❌ Missing' 
  END as status;

-- Check likes table
SELECT 
  'Likes Table' as component,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'likes') 
    THEN '✅ Exists' 
    ELSE '❌ Missing' 
  END as status;

-- Check cached count columns
SELECT 
  'Cached Counts' as component,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'posts' 
      AND column_name IN ('likes_count', 'comentarios_count', 'compartidos_count')
    ) 
    THEN '✅ Added' 
    ELSE '❌ Missing' 
  END as status;

-- Check triggers
SELECT 
  'Triggers' as component,
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_trigger 
      WHERE tgname = 'trigger_update_post_likes_count'
    ) 
    THEN '✅ Created' 
    ELSE '❌ Missing' 
  END as status;

-- ----------------------------------------------------------------------------
-- 12. GRANT PERMISSIONS
-- ----------------------------------------------------------------------------

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT SELECT ON public.posts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mensajes TO authenticated;

-- ----------------------------------------------------------------------------
-- SETUP COMPLETE
-- ----------------------------------------------------------------------------

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup for Likes Synchronization System completed successfully!';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Verify all components show ✅ in the verification section above';
  RAISE NOTICE '   2. Test likes synchronization in the app';
  RAISE NOTICE '   3. Test share functionality with post previews';
  RAISE NOTICE '   4. Monitor real-time subscriptions in Supabase dashboard';
END $$;
