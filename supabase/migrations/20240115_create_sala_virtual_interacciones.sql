
-- Create sala_virtual_interacciones table for virtual room interactions
CREATE TABLE IF NOT EXISTS public.sala_virtual_interacciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES public.locales(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('mensaje', 'emoticon', 'chat')),
  contenido TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Indexes for performance
  CONSTRAINT sala_virtual_interacciones_tipo_check CHECK (tipo IN ('mensaje', 'emoticon', 'chat'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sala_virtual_interacciones_local_id ON public.sala_virtual_interacciones(local_id);
CREATE INDEX IF NOT EXISTS idx_sala_virtual_interacciones_usuario_id ON public.sala_virtual_interacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sala_virtual_interacciones_created_at ON public.sala_virtual_interacciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sala_virtual_interacciones_tipo ON public.sala_virtual_interacciones(tipo);

-- Enable Row Level Security
ALTER TABLE public.sala_virtual_interacciones ENABLE ROW LEVEL SECURITY;

-- Create policies for sala_virtual_interacciones
-- Allow anyone to read interactions (public chat)
CREATE POLICY "Anyone can view sala virtual interactions"
  ON public.sala_virtual_interacciones
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert interactions
CREATE POLICY "Authenticated users can insert sala virtual interactions"
  ON public.sala_virtual_interacciones
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Allow users to delete their own interactions
CREATE POLICY "Users can delete their own sala virtual interactions"
  ON public.sala_virtual_interacciones
  FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Grant permissions
GRANT SELECT ON public.sala_virtual_interacciones TO anon, authenticated;
GRANT INSERT ON public.sala_virtual_interacciones TO authenticated;
GRANT DELETE ON public.sala_virtual_interacciones TO authenticated;

-- Add comment
COMMENT ON TABLE public.sala_virtual_interacciones IS 'Stores interactions (messages, emoticons, chat) in virtual rooms for each local';
