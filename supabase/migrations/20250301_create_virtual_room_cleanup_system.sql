
-- ========================================
-- SISTEMA DE LIMPIEZA DE SALAS VIRTUALES
-- ========================================
-- Implementa la gestión de caducidad y eliminación de contenido temporal
-- según los requisitos de la sala virtual

-- 1. Tabla para trackear resets de locales 24/7
CREATE TABLE IF NOT EXISTS sala_virtual_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(local_id)
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_sala_virtual_resets_local_id ON sala_virtual_resets(local_id);
CREATE INDEX IF NOT EXISTS idx_sala_virtual_resets_last_reset ON sala_virtual_resets(last_reset_at);

-- 2. Función para limpiar sala de un local específico
CREATE OR REPLACE FUNCTION limpiar_sala_virtual(p_local_id UUID)
RETURNS JSON AS $$
DECLARE
  v_mensajes_eliminados INTEGER;
  v_checkouts_realizados INTEGER;
  v_result JSON;
BEGIN
  -- Eliminar todos los mensajes (públicos y privados)
  DELETE FROM sala_virtual_interacciones
  WHERE local_id = p_local_id;
  
  GET DIAGNOSTICS v_mensajes_eliminados = ROW_COUNT;
  
  -- Hacer checkout de todos los usuarios activos
  UPDATE sala_virtual_checkins
  SET activo = FALSE,
      checked_out_at = NOW()
  WHERE local_id = p_local_id
    AND activo = TRUE;
  
  GET DIAGNOSTICS v_checkouts_realizados = ROW_COUNT;
  
  -- Construir resultado
  v_result := json_build_object(
    'success', TRUE,
    'local_id', p_local_id,
    'mensajes_eliminados', v_mensajes_eliminados,
    'checkouts_realizados', v_checkouts_realizados,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para resetear sala 24/7
CREATE OR REPLACE FUNCTION resetear_sala_24h(p_local_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Limpiar la sala
  SELECT limpiar_sala_virtual(p_local_id) INTO v_result;
  
  -- Actualizar timestamp del último reset
  INSERT INTO sala_virtual_resets (local_id, last_reset_at)
  VALUES (p_local_id, NOW())
  ON CONFLICT (local_id) 
  DO UPDATE SET last_reset_at = NOW();
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para obtener estadísticas de limpieza
CREATE OR REPLACE FUNCTION obtener_estadisticas_salas_virtuales()
RETURNS JSON AS $$
DECLARE
  v_total_locales INTEGER;
  v_locales_con_usuarios INTEGER;
  v_total_mensajes INTEGER;
  v_total_usuarios_activos INTEGER;
  v_locales_24h INTEGER;
  v_result JSON;
BEGIN
  -- Total de locales activos
  SELECT COUNT(*) INTO v_total_locales
  FROM locales
  WHERE activo = TRUE;
  
  -- Locales con usuarios activos
  SELECT COUNT(DISTINCT local_id) INTO v_locales_con_usuarios
  FROM sala_virtual_checkins
  WHERE activo = TRUE;
  
  -- Total de mensajes
  SELECT COUNT(*) INTO v_total_mensajes
  FROM sala_virtual_interacciones;
  
  -- Total de usuarios activos
  SELECT COUNT(*) INTO v_total_usuarios_activos
  FROM sala_virtual_checkins
  WHERE activo = TRUE;
  
  -- Locales 24/7 con reset reciente
  SELECT COUNT(*) INTO v_locales_24h
  FROM sala_virtual_resets
  WHERE last_reset_at > NOW() - INTERVAL '24 hours';
  
  v_result := json_build_object(
    'total_locales', v_total_locales,
    'locales_con_usuarios', v_locales_con_usuarios,
    'total_mensajes', v_total_mensajes,
    'total_usuarios_activos', v_total_usuarios_activos,
    'locales_24h_activos', v_locales_24h,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para limpiar sala cuando un local cierra
-- (Esto se ejecutará desde el Edge Function con cron job)

-- 6. Política RLS para sala_virtual_resets
ALTER TABLE sala_virtual_resets ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver los resets
CREATE POLICY "Admins can view resets"
  ON sala_virtual_resets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol_app = 'admin'
    )
  );

-- 7. Comentarios para documentación
COMMENT ON TABLE sala_virtual_resets IS 'Trackea los resets de salas virtuales para locales 24/7';
COMMENT ON FUNCTION limpiar_sala_virtual IS 'Elimina todo el contenido de una sala virtual (mensajes y checkouts)';
COMMENT ON FUNCTION resetear_sala_24h IS 'Resetea una sala 24/7 (limpia y actualiza timestamp)';
COMMENT ON FUNCTION obtener_estadisticas_salas_virtuales IS 'Obtiene estadísticas globales de las salas virtuales';

-- ========================================
-- GRANTS
-- ========================================
GRANT EXECUTE ON FUNCTION limpiar_sala_virtual TO authenticated;
GRANT EXECUTE ON FUNCTION resetear_sala_24h TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_estadisticas_salas_virtuales TO authenticated;
