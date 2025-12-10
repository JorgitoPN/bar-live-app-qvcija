
-- ✅ FIX: Add support for following local profiles directly
-- This migration adds a local_id column to the seguidores table to support following local profiles

-- 1. Add local_id column to seguidores table
ALTER TABLE seguidores 
ADD COLUMN IF NOT EXISTS local_id UUID REFERENCES locales(id) ON DELETE CASCADE;

-- 2. Add comment to explain the new column
COMMENT ON COLUMN seguidores.local_id IS 'ID of the local profile being followed (if following a local profile directly)';

-- 3. Update the table comment
COMMENT ON TABLE seguidores IS 'Stores user follows. Can follow either users (seguido_id) or local profiles (local_id). One of seguido_id or local_id must be set.';

-- 4. Add check constraint to ensure either seguido_id or local_id is set (but not both)
ALTER TABLE seguidores 
ADD CONSTRAINT seguidores_follow_type_check 
CHECK (
  (seguido_id IS NOT NULL AND local_id IS NULL) OR 
  (seguido_id IS NULL AND local_id IS NOT NULL)
);

-- 5. Create index for local_id lookups
CREATE INDEX IF NOT EXISTS idx_seguidores_local_id ON seguidores(local_id);
CREATE INDEX IF NOT EXISTS idx_seguidores_seguidor_local ON seguidores(seguidor_id, local_id);

-- 6. Drop and recreate the get_user_seguidos function to support local profiles
DROP FUNCTION IF EXISTS get_user_seguidos(UUID);

CREATE OR REPLACE FUNCTION get_user_seguidos(p_usuario_id UUID)
RETURNS TABLE(
  seguido_id UUID,
  tipo TEXT,
  nombre TEXT,
  username TEXT,
  avatar TEXT,
  bio TEXT,
  local_id UUID,
  local_nombre TEXT,
  local_imagen TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Get user follows
  SELECT 
    s.seguido_id,
    'usuario'::TEXT as tipo,
    u.nombre,
    u.username,
    u.avatar,
    u.bio,
    NULL::UUID as local_id,
    NULL::TEXT as local_nombre,
    NULL::TEXT as local_imagen
  FROM seguidores s
  JOIN usuarios u ON s.seguido_id = u.id
  WHERE s.seguidor_id = p_usuario_id
    AND s.seguido_id IS NOT NULL
    AND s.local_id IS NULL
  
  UNION ALL
  
  -- Get local profile follows
  SELECT 
    NULL::UUID as seguido_id,
    'local'::TEXT as tipo,
    l.nombre,
    NULL::TEXT as username,
    l.imagen_url as avatar,
    l.descripcion_google as bio,
    l.id as local_id,
    l.nombre as local_nombre,
    l.imagen_url as local_imagen
  FROM seguidores s
  JOIN locales l ON s.local_id = l.id
  WHERE s.seguidor_id = p_usuario_id
    AND s.local_id IS NOT NULL
    AND s.seguido_id IS NULL
  
  ORDER BY tipo DESC, nombre ASC;
END;
$$;

-- 7. Create function to follow a local profile
CREATE OR REPLACE FUNCTION follow_local_profile(p_usuario_id UUID, p_local_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if already following
  IF EXISTS (
    SELECT 1 FROM seguidores 
    WHERE seguidor_id = p_usuario_id 
      AND local_id = p_local_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Insert follow relationship
  INSERT INTO seguidores (seguidor_id, local_id)
  VALUES (p_usuario_id, p_local_id);

  -- Update local's follower count
  UPDATE locales
  SET seguidores = seguidores + 1
  WHERE id = p_local_id;

  -- Update user's following count
  UPDATE usuarios
  SET seguidos = seguidos + 1
  WHERE id = p_usuario_id;

  RETURN TRUE;
END;
$$;

-- 8. Create function to unfollow a local profile
CREATE OR REPLACE FUNCTION unfollow_local_profile(p_usuario_id UUID, p_local_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if following
  IF NOT EXISTS (
    SELECT 1 FROM seguidores 
    WHERE seguidor_id = p_usuario_id 
      AND local_id = p_local_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Delete follow relationship
  DELETE FROM seguidores
  WHERE seguidor_id = p_usuario_id 
    AND local_id = p_local_id;

  -- Update local's follower count
  UPDATE locales
  SET seguidores = GREATEST(0, seguidores - 1)
  WHERE id = p_local_id;

  -- Update user's following count
  UPDATE usuarios
  SET seguidos = GREATEST(0, seguidos - 1)
  WHERE id = p_usuario_id;

  RETURN TRUE;
END;
$$;

-- 9. Create function to check if following a local profile
CREATE OR REPLACE FUNCTION is_following_local(p_usuario_id UUID, p_local_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM seguidores 
    WHERE seguidor_id = p_usuario_id 
      AND local_id = p_local_id
  );
END;
$$;

-- 10. Update get_total_siguiendo_count to include local profiles
DROP FUNCTION IF EXISTS get_total_siguiendo_count(UUID);

CREATE OR REPLACE FUNCTION get_total_siguiendo_count(p_usuario_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM seguidores
  WHERE seguidor_id = p_usuario_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- 11. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_seguidos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION follow_local_profile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unfollow_local_profile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_following_local(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_siguiendo_count(UUID) TO authenticated;
