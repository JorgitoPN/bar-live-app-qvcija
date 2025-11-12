
-- Ensure usuarios table has proper structure
ALTER TABLE usuarios 
  ADD COLUMN IF NOT EXISTS rol_app VARCHAR(50) DEFAULT 'cliente',
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_app ON usuarios(rol_app);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

-- Ensure locales table has propietario_id
ALTER TABLE locales
  ADD COLUMN IF NOT EXISTS propietario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- Create index for propietario queries
CREATE INDEX IF NOT EXISTS idx_locales_propietario_id ON locales(propietario_id);

-- Enable RLS on usuarios table if not already enabled
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view users" ON usuarios;
DROP POLICY IF EXISTS "Users can update their own profile" ON usuarios;
DROP POLICY IF EXISTS "Admins can update any user" ON usuarios;

-- RLS Policies for usuarios
CREATE POLICY "Anyone can view users"
  ON usuarios FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON usuarios FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any user"
  ON usuarios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol_app = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON usuarios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol_app = 'admin'
    )
  );

-- Function to validate role changes
CREATE OR REPLACE FUNCTION validate_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only admins can change roles
  IF OLD.rol_app IS DISTINCT FROM NEW.rol_app THEN
    IF NOT EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol_app = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate role changes
DROP TRIGGER IF EXISTS trigger_validate_role_change ON usuarios;
CREATE TRIGGER trigger_validate_role_change
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION validate_role_change();
