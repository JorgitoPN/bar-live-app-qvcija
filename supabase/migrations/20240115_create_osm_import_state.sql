
-- Crear tabla para guardar el estado de las importaciones OSM
CREATE TABLE IF NOT EXISTS osm_import_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provincia TEXT NOT NULL,
  tipos TEXT[] NOT NULL,
  limite_total INTEGER NOT NULL,
  locales_procesados INTEGER DEFAULT 0,
  locales_importados INTEGER DEFAULT 0,
  locales_duplicados INTEGER DEFAULT 0,
  locales_excluidos INTEGER DEFAULT 0,
  ultima_posicion INTEGER DEFAULT 0,
  completada BOOLEAN DEFAULT FALSE,
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_ultima_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_osm_import_state_provincia ON osm_import_state(provincia);
CREATE INDEX IF NOT EXISTS idx_osm_import_state_completada ON osm_import_state(completada);
CREATE INDEX IF NOT EXISTS idx_osm_import_state_fecha_inicio ON osm_import_state(fecha_inicio DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_osm_import_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_osm_import_state_updated_at
  BEFORE UPDATE ON osm_import_state
  FOR EACH ROW
  EXECUTE FUNCTION update_osm_import_state_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE osm_import_state IS 'Guarda el estado de las importaciones desde OpenStreetMap para permitir continuación automática';
COMMENT ON COLUMN osm_import_state.provincia IS 'Provincia de la importación';
COMMENT ON COLUMN osm_import_state.tipos IS 'Array de tipos OSM (bar, restaurant, cafe, etc.)';
COMMENT ON COLUMN osm_import_state.limite_total IS 'Número total de locales a importar';
COMMENT ON COLUMN osm_import_state.locales_procesados IS 'Número de locales procesados hasta ahora';
COMMENT ON COLUMN osm_import_state.locales_importados IS 'Número de locales importados exitosamente';
COMMENT ON COLUMN osm_import_state.locales_duplicados IS 'Número de locales que ya existían';
COMMENT ON COLUMN osm_import_state.locales_excluidos IS 'Número de locales excluidos por filtros';
COMMENT ON COLUMN osm_import_state.ultima_posicion IS 'Última posición procesada en el catálogo OSM';
COMMENT ON COLUMN osm_import_state.completada IS 'Indica si la importación está completada';
COMMENT ON COLUMN osm_import_state.error IS 'Mensaje de error si la importación falló';
