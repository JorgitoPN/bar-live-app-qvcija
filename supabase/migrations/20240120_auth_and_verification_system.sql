
-- Migration: Complete Authentication and Verification System
-- Description: Implements login flow, mode management, and verification progress tracking

-- 1. Create terms_acceptance table for tracking user acceptance
CREATE TABLE IF NOT EXISTS terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  privacy_version TEXT NOT NULL DEFAULT '1.0',
  cookies_consent BOOLEAN NOT NULL DEFAULT true,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(usuario_id, terms_version, privacy_version)
);

-- 2. Create propietario_requests table for owner verification
CREATE TABLE IF NOT EXISTS propietario_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_solicitud TEXT NOT NULL CHECK (tipo_solicitud IN ('reclamar', 'nuevo')),
  
  -- Local information
  nombre_local TEXT NOT NULL,
  direccion TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  provincia TEXT NOT NULL,
  telefono TEXT,
  descripcion TEXT,
  local_id UUID REFERENCES locales(id) ON DELETE SET NULL,
  
  -- Request status
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_revision', 'documentacion_solicitada', 'documentacion_recibida', 'aprobada', 'rechazada')),
  estado_detalle TEXT, -- Detailed status message for user
  
  -- Admin review
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notas TEXT,
  fecha_revision TIMESTAMP WITH TIME ZONE,
  razon_rechazo TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate active requests
  UNIQUE(usuario_id, estado) WHERE estado IN ('pendiente', 'en_revision', 'documentacion_solicitada', 'documentacion_recibida')
);

-- 3. Create verification_status_history table for tracking progress
CREATE TABLE IF NOT EXISTS verification_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES propietario_requests(id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  mensaje TEXT,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('verificacion', 'aprobacion', 'rechazo', 'mensaje', 'like', 'comentario', 'seguidor', 'evento', 'sistema')),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT false,
  
  -- Related entities
  request_id UUID REFERENCES propietario_requests(id) ON DELETE CASCADE,
  usuario_origen_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id UUID,
  evento_id UUID,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  
  -- Action URL
  action_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Update usuarios table with new fields
ALTER TABLE usuarios 
  ADD COLUMN IF NOT EXISTS perfil_completado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ha_aceptado_terminos BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_aceptacion_terminos TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS solicitud_propietario_id UUID REFERENCES propietario_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_aprobacion_propietario TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS genero TEXT,
  ADD COLUMN IF NOT EXISTS intereses TEXT[];

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_usuario ON terms_acceptance(usuario_id);
CREATE INDEX IF NOT EXISTS idx_propietario_requests_usuario ON propietario_requests(usuario_id);
CREATE INDEX IF NOT EXISTS idx_propietario_requests_estado ON propietario_requests(estado);
CREATE INDEX IF NOT EXISTS idx_propietario_requests_created ON propietario_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_history_request ON verification_status_history(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_usuario ON notifications(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notifications_leida ON notifications(leida) WHERE leida = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username) WHERE username IS NOT NULL;

-- 7. Create function to update propietario_requests updated_at
CREATE OR REPLACE FUNCTION update_propietario_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for propietario_requests
DROP TRIGGER IF EXISTS trigger_update_propietario_request_timestamp ON propietario_requests;
CREATE TRIGGER trigger_update_propietario_request_timestamp
  BEFORE UPDATE ON propietario_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_propietario_request_timestamp();

-- 9. Create function to track verification status changes
CREATE OR REPLACE FUNCTION track_verification_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO verification_status_history (
      request_id,
      estado_anterior,
      estado_nuevo,
      mensaje,
      admin_id
    ) VALUES (
      NEW.id,
      OLD.estado,
      NEW.estado,
      NEW.estado_detalle,
      NEW.admin_id
    );
    
    -- Create notification for user
    INSERT INTO notifications (
      usuario_id,
      tipo,
      titulo,
      mensaje,
      request_id
    ) VALUES (
      NEW.usuario_id,
      'verificacion',
      CASE NEW.estado
        WHEN 'en_revision' THEN 'Solicitud en revisión'
        WHEN 'documentacion_solicitada' THEN 'Documentación solicitada'
        WHEN 'documentacion_recibida' THEN 'Documentación recibida'
        WHEN 'aprobada' THEN '¡Solicitud aprobada!'
        WHEN 'rechazada' THEN 'Solicitud rechazada'
        ELSE 'Actualización de solicitud'
      END,
      COALESCE(NEW.estado_detalle, 
        CASE NEW.estado
          WHEN 'en_revision' THEN 'Tu solicitud está siendo revisada por nuestro equipo'
          WHEN 'documentacion_solicitada' THEN 'Necesitamos documentación adicional para procesar tu solicitud'
          WHEN 'documentacion_recibida' THEN 'Hemos recibido tu documentación y la estamos revisando'
          WHEN 'aprobada' THEN 'Tu solicitud ha sido aprobada. ¡Ahora puedes gestionar tu local!'
          WHEN 'rechazada' THEN 'Tu solicitud ha sido rechazada. ' || COALESCE(NEW.razon_rechazo, 'Contacta con soporte para más información.')
          ELSE 'El estado de tu solicitud ha cambiado'
        END
      ),
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for status tracking
DROP TRIGGER IF EXISTS trigger_track_verification_status ON propietario_requests;
CREATE TRIGGER trigger_track_verification_status
  AFTER UPDATE ON propietario_requests
  FOR EACH ROW
  EXECUTE FUNCTION track_verification_status_change();

-- 11. Create function to auto-approve user as propietario
CREATE OR REPLACE FUNCTION approve_propietario_request()
RETURNS TRIGGER AS $$
BEGIN
  -- When request is approved, update user role
  IF NEW.estado = 'aprobada' AND OLD.estado != 'aprobada' THEN
    UPDATE usuarios
    SET 
      rol_app = 'propietario',
      solicitud_propietario_id = NEW.id,
      fecha_aprobacion_propietario = NOW()
    WHERE id = NEW.usuario_id;
    
    -- If local_id is set, link user to local
    IF NEW.local_id IS NOT NULL THEN
      UPDATE locales
      SET propietario_id = NEW.usuario_id
      WHERE id = NEW.local_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger for auto-approval
DROP TRIGGER IF EXISTS trigger_approve_propietario ON propietario_requests;
CREATE TRIGGER trigger_approve_propietario
  AFTER UPDATE ON propietario_requests
  FOR EACH ROW
  EXECUTE FUNCTION approve_propietario_request();

-- 13. Create function to get user verification status
CREATE OR REPLACE FUNCTION get_user_verification_status(user_id UUID)
RETURNS TABLE (
  has_request BOOLEAN,
  request_id UUID,
  estado TEXT,
  estado_detalle TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  can_request BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM propietario_requests WHERE usuario_id = user_id) as has_request,
    pr.id as request_id,
    pr.estado,
    pr.estado_detalle,
    pr.created_at,
    pr.updated_at,
    NOT EXISTS(
      SELECT 1 FROM propietario_requests 
      WHERE usuario_id = user_id 
      AND estado IN ('pendiente', 'en_revision', 'documentacion_solicitada', 'documentacion_recibida')
    ) as can_request
  FROM propietario_requests pr
  WHERE pr.usuario_id = user_id
  ORDER BY pr.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 14. Enable Row Level Security
ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE propietario_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 15. Create RLS policies for terms_acceptance
CREATE POLICY "Users can view their own terms acceptance"
  ON terms_acceptance FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own terms acceptance"
  ON terms_acceptance FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- 16. Create RLS policies for propietario_requests
CREATE POLICY "Users can view their own requests"
  ON propietario_requests FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can create their own requests"
  ON propietario_requests FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own pending requests"
  ON propietario_requests FOR UPDATE
  USING (auth.uid() = usuario_id AND estado IN ('pendiente', 'documentacion_solicitada'));

CREATE POLICY "Admins can view all requests"
  ON propietario_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol_app = 'admin'
    )
  );

CREATE POLICY "Admins can update all requests"
  ON propietario_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol_app = 'admin'
    )
  );

-- 17. Create RLS policies for verification_status_history
CREATE POLICY "Users can view their own verification history"
  ON verification_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM propietario_requests 
      WHERE id = verification_status_history.request_id 
      AND usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all verification history"
  ON verification_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol_app = 'admin'
    )
  );

-- 18. Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 19. Grant permissions
GRANT SELECT, INSERT ON terms_acceptance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON propietario_requests TO authenticated;
GRANT SELECT ON verification_status_history TO authenticated;
GRANT SELECT, UPDATE, DELETE ON notifications TO authenticated;
GRANT INSERT ON notifications TO service_role;

-- 20. Create helper views
CREATE OR REPLACE VIEW pending_propietario_requests AS
SELECT 
  pr.*,
  u.nombre as usuario_nombre,
  u.email as usuario_email,
  u.avatar as usuario_avatar,
  (SELECT COUNT(*) FROM verification_status_history WHERE request_id = pr.id) as status_changes_count
FROM propietario_requests pr
JOIN usuarios u ON u.id = pr.usuario_id
WHERE pr.estado IN ('pendiente', 'en_revision', 'documentacion_solicitada', 'documentacion_recibida')
ORDER BY pr.created_at ASC;

-- Grant access to view
GRANT SELECT ON pending_propietario_requests TO authenticated;

COMMENT ON TABLE terms_acceptance IS 'Tracks user acceptance of terms, privacy policy, and cookies';
COMMENT ON TABLE propietario_requests IS 'Stores owner verification requests with detailed status tracking';
COMMENT ON TABLE verification_status_history IS 'Tracks all status changes for verification requests';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
