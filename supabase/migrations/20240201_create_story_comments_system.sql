
-- Create story comments table
CREATE TABLE IF NOT EXISTS historia_comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  historia_id UUID NOT NULL REFERENCES historias(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  likes INTEGER DEFAULT 0,
  parent_comment_id UUID REFERENCES historia_comentarios(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_historia_comentarios_historia_id ON historia_comentarios(historia_id);
CREATE INDEX IF NOT EXISTS idx_historia_comentarios_autor_id ON historia_comentarios(autor_id);
CREATE INDEX IF NOT EXISTS idx_historia_comentarios_parent_id ON historia_comentarios(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_historia_comentarios_created_at ON historia_comentarios(created_at DESC);

-- Create story comment likes table
CREATE TABLE IF NOT EXISTS historia_comentario_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comentario_id UUID NOT NULL REFERENCES historia_comentarios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comentario_id, usuario_id)
);

-- Create index for comment likes
CREATE INDEX IF NOT EXISTS idx_historia_comentario_likes_comentario_id ON historia_comentario_likes(comentario_id);
CREATE INDEX IF NOT EXISTS idx_historia_comentario_likes_usuario_id ON historia_comentario_likes(usuario_id);

-- Enable RLS
ALTER TABLE historia_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE historia_comentario_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for historia_comentarios
CREATE POLICY "Anyone can view story comments"
  ON historia_comentarios FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create story comments"
  ON historia_comentarios FOR INSERT
  WITH CHECK (auth.uid() = autor_id);

CREATE POLICY "Users can update their own story comments"
  ON historia_comentarios FOR UPDATE
  USING (auth.uid() = autor_id);

CREATE POLICY "Users can delete their own story comments"
  ON historia_comentarios FOR DELETE
  USING (auth.uid() = autor_id);

-- RLS Policies for historia_comentario_likes
CREATE POLICY "Anyone can view story comment likes"
  ON historia_comentario_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like story comments"
  ON historia_comentario_likes FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can unlike story comments"
  ON historia_comentario_likes FOR DELETE
  USING (auth.uid() = usuario_id);

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_historia_comentario_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE historia_comentarios
    SET likes = likes + 1
    WHERE id = NEW.comentario_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE historia_comentarios
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = OLD.comentario_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment likes count
DROP TRIGGER IF EXISTS trigger_update_historia_comentario_likes_count ON historia_comentario_likes;
CREATE TRIGGER trigger_update_historia_comentario_likes_count
AFTER INSERT OR DELETE ON historia_comentario_likes
FOR EACH ROW EXECUTE FUNCTION update_historia_comentario_likes_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_historia_comentarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_historia_comentarios_updated_at ON historia_comentarios;
CREATE TRIGGER trigger_update_historia_comentarios_updated_at
BEFORE UPDATE ON historia_comentarios
FOR EACH ROW EXECUTE FUNCTION update_historia_comentarios_updated_at();
