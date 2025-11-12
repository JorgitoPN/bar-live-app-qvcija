
-- Ensure perfiles_profesionales table has proper structure
ALTER TABLE perfiles_profesionales
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS provincia VARCHAR(100),
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure ofertas_trabajo table has proper structure
ALTER TABLE ofertas_trabajo
  ADD COLUMN IF NOT EXISTS imagen_url TEXT,
  ADD COLUMN IF NOT EXISTS provincia VARCHAR(100),
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_perfiles_profesionales_usuario_id ON perfiles_profesionales(usuario_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_profesionales_activo ON perfiles_profesionales(activo);
CREATE INDEX IF NOT EXISTS idx_ofertas_trabajo_propietario_id ON ofertas_trabajo(propietario_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_trabajo_local_id ON ofertas_trabajo(local_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_trabajo_activo ON ofertas_trabajo(activo);

-- Enable RLS
ALTER TABLE perfiles_profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_trabajo ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active professional profiles" ON perfiles_profesionales;
DROP POLICY IF EXISTS "Users can create their own professional profile" ON perfiles_profesionales;
DROP POLICY IF EXISTS "Users can update their own professional profile" ON perfiles_profesionales;
DROP POLICY IF EXISTS "Users can delete their own professional profile" ON perfiles_profesionales;

-- RLS Policies for perfiles_profesionales
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active job offers" ON ofertas_trabajo;
DROP POLICY IF EXISTS "Propietarios can create job offers" ON ofertas_trabajo;
DROP POLICY IF EXISTS "Propietarios can update their own job offers" ON ofertas_trabajo;
DROP POLICY IF EXISTS "Propietarios can delete their own job offers" ON ofertas_trabajo;

-- RLS Policies for ofertas_trabajo
CREATE POLICY "Anyone can view active job offers"
  ON ofertas_trabajo FOR SELECT
  USING (activo = true);

CREATE POLICY "Propietarios can create job offers"
  ON ofertas_trabajo FOR INSERT
  WITH CHECK (
    auth.uid() = propietario_id AND
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND (rol_app = 'propietario' OR rol_app = 'admin')
    )
  );

CREATE POLICY "Propietarios can update their own job offers"
  ON ofertas_trabajo FOR UPDATE
  USING (auth.uid() = propietario_id);

CREATE POLICY "Propietarios can delete their own job offers"
  ON ofertas_trabajo FOR DELETE
  USING (auth.uid() = propietario_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_perfiles_profesionales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_perfiles_profesionales_updated_at ON perfiles_profesionales;
CREATE TRIGGER trigger_update_perfiles_profesionales_updated_at
BEFORE UPDATE ON perfiles_profesionales
FOR EACH ROW EXECUTE FUNCTION update_perfiles_profesionales_updated_at();
