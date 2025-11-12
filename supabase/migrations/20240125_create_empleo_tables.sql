
-- Migration: Create Employment System Tables
-- Description: Tables for job postings, professional profiles, and employment interactions

-- 1. Create ofertas_trabajo table (if not exists)
CREATE TABLE IF NOT EXISTS ofertas_trabajo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propietario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  tipo TEXT NOT NULL,
  salario TEXT,
  requisitos TEXT[],
  provincia TEXT,
  imagen_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Create perfiles_profesionales table (if not exists)
CREATE TABLE IF NOT EXISTS perfiles_profesionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
  nombre_completo TEXT NOT NULL,
  puesto_deseado TEXT NOT NULL,
  experiencia TEXT NOT NULL,
  habilidades TEXT,
  disponibilidad TEXT,
  foto_url TEXT,
  provincia TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Create intereses_empleo table for tracking owner interest in job seekers
CREATE TABLE IF NOT EXISTS intereses_empleo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfiles_profesionales(id) ON DELETE CASCADE,
  propietario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'contactado', 'entrevista', 'contratado', 'rechazado')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(perfil_id, propietario_id)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ofertas_trabajo_propietario ON ofertas_trabajo(propietario_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_trabajo_local ON ofertas_trabajo(local_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_trabajo_activo ON ofertas_trabajo(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_ofertas_trabajo_provincia ON ofertas_trabajo(provincia);
CREATE INDEX IF NOT EXISTS idx_ofertas_trabajo_created ON ofertas_trabajo(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_perfiles_profesionales_usuario ON perfiles_profesionales(usuario_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_profesionales_activo ON perfiles_profesionales(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_perfiles_profesionales_provincia ON perfiles_profesionales(provincia);
CREATE INDEX IF NOT EXISTS idx_perfiles_profesionales_puesto ON perfiles_profesionales(puesto_deseado);
CREATE INDEX IF NOT EXISTS idx_perfiles_profesionales_created ON perfiles_profesionales(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intereses_empleo_perfil ON intereses_empleo(perfil_id);
CREATE INDEX IF NOT EXISTS idx_intereses_empleo_propietario ON intereses_empleo(propietario_id);
CREATE INDEX IF NOT EXISTS idx_intereses_empleo_estado ON intereses_empleo(estado);

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_empleo_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_ofertas_trabajo_timestamp ON ofertas_trabajo;
CREATE TRIGGER trigger_update_ofertas_trabajo_timestamp
  BEFORE UPDATE ON ofertas_trabajo
  FOR EACH ROW
  EXECUTE FUNCTION update_empleo_timestamp();

DROP TRIGGER IF EXISTS trigger_update_perfiles_profesionales_timestamp ON perfiles_profesionales;
CREATE TRIGGER trigger_update_perfiles_profesionales_timestamp
  BEFORE UPDATE ON perfiles_profesionales
  FOR EACH ROW
  EXECUTE FUNCTION update_empleo_timestamp();

DROP TRIGGER IF EXISTS trigger_update_intereses_empleo_timestamp ON intereses_empleo;
CREATE TRIGGER trigger_update_intereses_empleo_timestamp
  BEFORE UPDATE ON intereses_empleo
  FOR EACH ROW
  EXECUTE FUNCTION update_empleo_timestamp();

-- 7. Enable Row Level Security
ALTER TABLE ofertas_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles_profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE intereses_empleo ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for ofertas_trabajo
CREATE POLICY "Anyone can view active job offers"
  ON ofertas_trabajo FOR SELECT
  USING (activo = true);

CREATE POLICY "Owners can create job offers"
  ON ofertas_trabajo FOR INSERT
  WITH CHECK (
    auth.uid() = propietario_id AND
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol_app IN ('propietario', 'admin')
    )
  );

CREATE POLICY "Owners can update their own job offers"
  ON ofertas_trabajo FOR UPDATE
  USING (auth.uid() = propietario_id);

CREATE POLICY "Owners can delete their own job offers"
  ON ofertas_trabajo FOR DELETE
  USING (auth.uid() = propietario_id);

CREATE POLICY "Admins can manage all job offers"
  ON ofertas_trabajo FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol_app = 'admin'
    )
  );

-- 9. Create RLS policies for perfiles_profesionales
CREATE POLICY "Anyone can view active professional profiles"
  ON perfiles_profesionales FOR SELECT
  USING (activo = true);

CREATE POLICY "Users can create their own professional profile"
  ON perfiles_profesionales FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own professional profile"
  ON perfiles_profesionales FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own professional profile"
  ON perfiles_profesionales FOR DELETE
  USING (auth.uid() = usuario_id);

-- 10. Create RLS policies for intereses_empleo
CREATE POLICY "Profile owners can view interests in their profile"
  ON intereses_empleo FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_profesionales 
      WHERE id = intereses_empleo.perfil_id 
      AND usuario_id = auth.uid()
    )
  );

CREATE POLICY "Owners can view their own interests"
  ON intereses_empleo FOR SELECT
  USING (auth.uid() = propietario_id);

CREATE POLICY "Owners can create interests"
  ON intereses_empleo FOR INSERT
  WITH CHECK (
    auth.uid() = propietario_id AND
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol_app IN ('propietario', 'admin')
    )
  );

CREATE POLICY "Owners can update their own interests"
  ON intereses_empleo FOR UPDATE
  USING (auth.uid() = propietario_id);

-- 11. Grant permissions
GRANT SELECT ON ofertas_trabajo TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ofertas_trabajo TO authenticated;

GRANT SELECT ON perfiles_profesionales TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON perfiles_profesionales TO authenticated;

GRANT SELECT, INSERT, UPDATE ON intereses_empleo TO authenticated;

-- 12. Create helper views
CREATE OR REPLACE VIEW ofertas_trabajo_con_detalles AS
SELECT 
  ot.*,
  l.nombre as local_nombre,
  l.provincia as local_provincia,
  l.imagen_url as local_imagen,
  u.nombre as propietario_nombre,
  u.email as propietario_email
FROM ofertas_trabajo ot
LEFT JOIN locales l ON l.id = ot.local_id
LEFT JOIN usuarios u ON u.id = ot.propietario_id
WHERE ot.activo = true
ORDER BY ot.created_at DESC;

CREATE OR REPLACE VIEW perfiles_profesionales_con_detalles AS
SELECT 
  pp.*,
  u.nombre as usuario_nombre,
  u.email as usuario_email,
  u.avatar as usuario_avatar,
  u.username as usuario_username,
  (SELECT COUNT(*) FROM intereses_empleo WHERE perfil_id = pp.id) as intereses_count
FROM perfiles_profesionales pp
LEFT JOIN usuarios u ON u.id = pp.usuario_id
WHERE pp.activo = true
ORDER BY pp.created_at DESC;

-- Grant access to views
GRANT SELECT ON ofertas_trabajo_con_detalles TO anon, authenticated;
GRANT SELECT ON perfiles_profesionales_con_detalles TO anon, authenticated;

-- Comments
COMMENT ON TABLE ofertas_trabajo IS 'Job offers posted by venue owners';
COMMENT ON TABLE perfiles_profesionales IS 'Professional profiles of job seekers';
COMMENT ON TABLE intereses_empleo IS 'Tracks owner interest in professional profiles';
