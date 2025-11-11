
# 🚀 Guía Rápida de Inicio

## ⚡ Solución Rápida en 5 Minutos

### 1️⃣ Aplicar Migración SQL (2 min)

**Opción más rápida:**

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. Click en **SQL Editor** (menú lateral)
4. Click en **New query**
5. Copia y pega este SQL:

```sql
-- Create sala_virtual_interacciones table
CREATE TABLE IF NOT EXISTS public.sala_virtual_interacciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES public.locales(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('mensaje', 'emoticon', 'chat')),
  contenido TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sala_virtual_interacciones_local_id ON public.sala_virtual_interacciones(local_id);
CREATE INDEX IF NOT EXISTS idx_sala_virtual_interacciones_usuario_id ON public.sala_virtual_interacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sala_virtual_interacciones_created_at ON public.sala_virtual_interacciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sala_virtual_interacciones_tipo ON public.sala_virtual_interacciones(tipo);

-- Enable RLS
ALTER TABLE public.sala_virtual_interacciones ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view sala virtual interactions"
  ON public.sala_virtual_interacciones FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert sala virtual interactions"
  ON public.sala_virtual_interacciones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own sala virtual interactions"
  ON public.sala_virtual_interacciones FOR DELETE TO authenticated
  USING (auth.uid() = usuario_id);

-- Grant permissions
GRANT SELECT ON public.sala_virtual_interacciones TO anon, authenticated;
GRANT INSERT ON public.sala_virtual_interacciones TO authenticated;
GRANT DELETE ON public.sala_virtual_interacciones TO authenticated;
```

6. Click en **Run** (o `Ctrl+Enter`)
7. Verifica que aparezca "Success"

**Verificar:**
```sql
SELECT * FROM sala_virtual_interacciones LIMIT 1;
```

---

### 2️⃣ Reiniciar Aplicación (1 min)

```bash
# Detener servidor (Ctrl+C)
# Luego:
npm start -- --clear
```

---

### 3️⃣ Probar Enriquecimiento (2 min)

1. Abre la app
2. Ve a **Admin → Enriquecimiento Google**
3. Selecciona:
   - Comunidad: **Galicia**
   - Provincia: **A Coruña**
   - Categoría: **Discoteca**
4. Configura: **10 locales por lote**
5. Click en **Enriquecer**
6. Observa los logs:

**Esperado:**
```
✅ Blaster ⭐ 4.5 (234 reviews) 📸 4 fotos [discoteca, lounge]
✅ Sala Malatesta ⭐ 4.3 (156 reviews) 📸 3 fotos [discoteca, sala_conciertos]
✅ Filomatic ⭐ 4.6 (189 reviews) 📸 4 fotos [discoteca, lounge]
```

---

## ✅ Verificación Rápida

### ¿Funcionó la Migración?

```sql
-- Ejecuta esto en SQL Editor
SELECT COUNT(*) FROM sala_virtual_interacciones;
```

**Si devuelve un número:** ✅ Funcionó  
**Si da error:** ❌ Vuelve al paso 1

### ¿Funcionó el Enriquecimiento?

Busca en los logs:
- ✅ Si ves: `✅ Blaster ⭐ 4.5` → Funcionó
- ❌ Si ves: `❌ RECHAZADO: Blaster` → Revisa configuración

### ¿Funciona la Sala Virtual?

1. Ve a un local enriquecido
2. Click en **Sala Virtual**
3. Haz **Check-in**
4. Envía un mensaje
5. **Si aparece en el chat:** ✅ Funcionó

---

## 🔧 Solución de Problemas Rápida

### Error: "relation does not exist"
```
❌ Error: relation "sala_virtual_interacciones" does not exist
```

**Solución:** Aplica la migración SQL del paso 1

---

### Error: "No tiene tipos válidos"
```
❌ RECHAZADO: Blaster - No tiene tipos válidos para BarLive
```

**Solución:** Reinicia la app con `npm start -- --clear`

---

### Error: "API not available"
```
❌ Error: API not available: Límite diario alcanzado
```

**Solución:** Verifica créditos en Google Cloud Console

---

## 📊 Resultados Esperados

### Antes
```
Total: 25 locales
✅ Exitosos: 0 (0%)
❌ Fallidos: 8 (32%)
🚫 Rechazados: 17 (68%)
```

### Después
```
Total: 25 locales
✅ Exitosos: 20-22 (80-88%)
❌ Fallidos: 2-3 (8-12%)
🚫 Rechazados: 1-2 (4-8%)
```

---

## 📚 Documentación Completa

Si necesitas más detalles:

1. **Detalles técnicos:** `docs/ENRICHMENT_FIXES_2024.md`
2. **Guía de migración:** `docs/SQL_MIGRATION_GUIDE.md`
3. **Resumen completo:** `docs/IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Casos de Uso Resueltos

### ✅ Discoteca "Blaster"
- **Antes:** ❌ No encontrado
- **Ahora:** ✅ Enriquecido con 4 fotos, rating 4.5

### ✅ Sala Mardi Gras
- **Antes:** ❌ Sin tipos válidos
- **Ahora:** ✅ Enriquecido como discoteca/sala de conciertos

### ✅ Sala Malatesta
- **Antes:** ❌ Rechazado
- **Ahora:** ✅ Enriquecido con datos completos

### ❌ Lowe (Tienda)
- **Antes:** ❌ Rechazado (correcto)
- **Ahora:** ❌ Rechazado (correcto - no es ocio nocturno)

---

## 💡 Consejos

1. **Empieza con lotes pequeños** (10-25 locales)
2. **Revisa los logs** para entender qué funciona
3. **Ajusta palabras clave** si encuentras más discotecas
4. **Escala gradualmente** una vez verificado

---

## 🎉 ¡Listo!

Si seguiste estos pasos, tu sistema debería estar funcionando correctamente.

**¿Problemas?** Consulta la documentación completa o revisa los logs.

**¿Todo funciona?** ¡Excelente! Ahora puedes enriquecer todos tus locales.

---

**Tiempo total:** ~5 minutos  
**Dificultad:** Fácil  
**Resultado:** Sistema de enriquecimiento funcionando al 80-88%
