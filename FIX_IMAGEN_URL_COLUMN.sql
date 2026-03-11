
-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FIX: Rename media_url to imagen_url in mensajes table
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- PROBLEMA: La aplicación intenta usar 'imagen_url' pero la base de datos tiene 'media_url'
-- ERROR: "Could not find the 'imagen_url' column of 'mensajes' in the esquema cache"
--
-- SOLUCIÓN: Renombrar la columna media_url a imagen_url
--
-- CÓMO EJECUTAR:
-- 1. Ve al Dashboard de Supabase: https://supabase.com/dashboard
-- 2. Selecciona tu proyecto (embntaqwlwmgazvrglaf)
-- 3. Ve a "SQL Editor" en el menú lateral
-- 4. Haz clic en "New Query"
-- 5. Pega este script completo
-- 6. Haz clic en "Run" (o presiona Ctrl+Enter)
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar el estado actual de la tabla mensajes
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'mensajes'
    AND column_name IN ('media_url', 'imagen_url')
ORDER BY column_name;

-- Renombrar la columna media_url a imagen_url
DO $$
BEGIN
    -- Si media_url existe y imagen_url no existe, renombrar
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mensajes' 
        AND column_name = 'media_url'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mensajes' 
        AND column_name = 'imagen_url'
    ) THEN
        ALTER TABLE public.mensajes RENAME COLUMN media_url TO imagen_url;
        RAISE NOTICE '✅ Columna media_url renombrada a imagen_url exitosamente';
    
    -- Si imagen_url ya existe, no hacer nada
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mensajes' 
        AND column_name = 'imagen_url'
    ) THEN
        RAISE NOTICE '✅ La columna imagen_url ya existe, no se requiere cambio';
    
    -- Si ninguna existe, crear imagen_url
    ELSE
        ALTER TABLE public.mensajes ADD COLUMN imagen_url TEXT;
        RAISE NOTICE '✅ Columna imagen_url creada exitosamente';
    END IF;
END $$;

-- Verificar que el cambio se aplicó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'mensajes'
    AND column_name IN ('media_url', 'imagen_url')
ORDER BY column_name;

-- Mostrar estadísticas de mensajes con imágenes
SELECT 
    COUNT(*) as total_mensajes,
    COUNT(imagen_url) as mensajes_con_imagen,
    COUNT(*) - COUNT(imagen_url) as mensajes_sin_imagen
FROM public.mensajes;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    imagen_url_exists BOOLEAN;
    media_url_exists BOOLEAN;
BEGIN
    -- Verificar si imagen_url existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mensajes' 
        AND column_name = 'imagen_url'
    ) INTO imagen_url_exists;
    
    -- Verificar si media_url todavía existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mensajes' 
        AND column_name = 'media_url'
    ) INTO media_url_exists;
    
    -- Mostrar resultados
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ VERIFICACIÓN DE CORRECCIÓN - COLUMNA IMAGEN_URL';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📍 Columna imagen_url existe: %', CASE WHEN imagen_url_exists THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE '📍 Columna media_url existe: %', CASE WHEN media_url_exists THEN '⚠️ SÍ (debería ser NO)' ELSE '✅ NO (correcto)' END;
    RAISE NOTICE '';
    
    IF imagen_url_exists AND NOT media_url_exists THEN
        RAISE NOTICE '🎉 ¡CORRECCIÓN COMPLETADA CON ÉXITO!';
        RAISE NOTICE '';
        RAISE NOTICE '✨ La columna imagen_url está disponible';
        RAISE NOTICE '✨ El error "Could not find the imagen_url column" está resuelto';
        RAISE NOTICE '✨ La aplicación ahora puede enviar imágenes correctamente';
    ELSIF imagen_url_exists AND media_url_exists THEN
        RAISE NOTICE '⚠️ ADVERTENCIA: Ambas columnas existen';
        RAISE NOTICE '   Considera eliminar media_url si no se usa:';
        RAISE NOTICE '   ALTER TABLE public.mensajes DROP COLUMN media_url;';
    ELSE
        RAISE NOTICE '❌ ERROR: La columna imagen_url no existe';
        RAISE NOTICE '   Revisa los mensajes de error anteriores';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📚 NOTAS IMPORTANTES
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- 1. ESTE SCRIPT ES SEGURO:
--    - Solo renombra la columna, no elimina datos
--    - Es idempotente (puedes ejecutarlo múltiples veces)
--    - No afecta a otras tablas
--
-- 2. DESPUÉS DE EJECUTAR:
--    - Reinicia la aplicación
--    - Prueba enviar una imagen en el chat
--    - El error debería desaparecer
--
-- 3. SI EL ERROR PERSISTE:
--    - Verifica que el script se ejecutó sin errores
--    - Ejecuta: SELECT column_name FROM information_schema.columns 
--              WHERE table_name = 'mensajes' AND column_name = 'imagen_url';
--    - Si devuelve una fila, la columna existe correctamente
--
-- 4. REVERSIÓN (si necesitas volver atrás):
--    ALTER TABLE public.mensajes RENAME COLUMN imagen_url TO media_url;
--
-- ═══════════════════════════════════════════════════════════════════════════════
