
# 🔒 Security Enhancements Quick Guide - Version 5.0

## ⚡ Quick Actions Required

### 1. Enable Leaked Password Protection (2 minutes)

**Steps**:
1. Open Supabase Dashboard
2. Go to Authentication → Providers
3. Click "Email"
4. Find "Password Protection" section
5. Toggle ON "Check for leaked passwords"
6. Click "Save"

**Impact**: Prevents users from using compromised passwords from data breaches.

### 2. Add search_path to Functions (5 minutes)

**Copy and paste this into Supabase SQL Editor**:

```sql
DO $$
DECLARE
    func_record RECORD;
    func_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    FOR func_record IN 
        SELECT 
            p.proname as name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.prokind = 'f'
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp', 
                func_record.name, 
                func_record.args
            );
            func_count := func_count + 1;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE NOTICE 'Error updating function %: %', func_record.name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Updated % functions, % errors', func_count, error_count;
END $$;
```

**Impact**: Prevents SQL injection attacks through search_path manipulation.

### 3. Fix Security Definer Views (3 minutes)

**Copy and paste this into Supabase SQL Editor**:

```sql
-- Drop existing views
DROP VIEW IF EXISTS public.eventos_with_details CASCADE;
DROP VIEW IF EXISTS public.vista_seguidos_completa CASCADE;
DROP VIEW IF EXISTS public.users_needing_migration CASCADE;
DROP VIEW IF EXISTS public.locales_favoritos CASCADE;

-- Recreate without SECURITY DEFINER
CREATE VIEW public.eventos_with_details AS
SELECT 
    e.*,
    l.nombre as local_nombre,
    l.direccion as local_direccion,
    l.ciudad as local_ciudad,
    l.provincia as local_provincia,
    l.imagen_url as local_imagen
FROM eventos e
LEFT JOIN locales l ON e.local_id = l.id;

CREATE VIEW public.vista_seguidos_completa AS
SELECT 
    s.id,
    s.seguidor_id,
    s.seguido_id,
    s.local_id,
    s.notificaciones_activas,
    s.created_at,
    CASE 
        WHEN s.local_id IS NOT NULL THEN 'local'
        ELSE 'usuario'
    END as tipo_seguido,
    COALESCE(u.nombre, l.nombre) as nombre_seguido,
    COALESCE(u.username, l.username) as username_seguido,
    COALESCE(u.avatar, l.imagen_url) as avatar_seguido
FROM seguidores s
LEFT JOIN usuarios u ON s.seguido_id = u.id
LEFT JOIN locales l ON s.local_id = l.id;

CREATE VIEW public.users_needing_migration AS
SELECT 
    u.id,
    u.email,
    u.nombre,
    u.provider,
    u.created_at
FROM usuarios u
WHERE u.provider = 'google' 
AND (u.password_hash IS NULL OR u.password_hash = '');

CREATE VIEW public.locales_favoritos AS
SELECT 
    lg.id,
    lg.usuario_id,
    lg.local_id,
    lg.notas,
    lg.created_at,
    l.nombre as local_nombre,
    l.tipo as local_tipo,
    l.direccion as local_direccion,
    l.ciudad as local_ciudad,
    l.provincia as local_provincia,
    l.imagen_url as local_imagen,
    l.rating as local_rating
FROM locales_guardados lg
JOIN locales l ON lg.local_id = l.id;
```

**Impact**: Ensures proper Row Level Security enforcement on views.

## ✅ Verification

After completing the above steps, run this query to verify:

```sql
-- Check security advisors
SELECT 
    'Leaked Password Protection' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_settings 
            WHERE name = 'app.settings.auth_password_hibp_enabled' 
            AND setting = 'true'
        ) THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as status
UNION ALL
SELECT 
    'Functions with search_path' as check_name,
    COUNT(*)::text || ' functions secured' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.prokind = 'f'
AND prosecdef = false
AND proconfig IS NOT NULL
AND 'search_path=public, pg_temp' = ANY(proconfig)
UNION ALL
SELECT 
    'Security Definer Views' as check_name,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO ISSUES'
        ELSE '❌ ' || COUNT(*)::text || ' views need fixing'
    END as status
FROM pg_views
WHERE schemaname = 'public'
AND definition LIKE '%SECURITY DEFINER%';
```

## 📊 Expected Results

After all fixes:
- ✅ Leaked Password Protection: ENABLED
- ✅ Functions with search_path: 100+ functions secured
- ✅ Security Definer Views: NO ISSUES

## 🚨 Troubleshooting

### Issue: "Permission denied" when running SQL
**Solution**: Make sure you're logged in as the project owner or have admin privileges.

### Issue: Functions still showing in security advisors
**Solution**: Wait 5-10 minutes for the advisor cache to refresh, then check again.

### Issue: Views not working after recreation
**Solution**: Check RLS policies on underlying tables. Views now respect RLS.

## 📞 Need Help?

If you encounter any issues:
1. Check the full implementation guide: `VERSION_5.0_IMPLEMENTATION_GUIDE.md`
2. Review Supabase security docs: https://supabase.com/docs/guides/database/database-linter
3. Contact support: soporte@barlive.es

---

**Total Time Required**: ~10 minutes
**Difficulty**: Easy (copy-paste SQL)
**Impact**: Critical security improvements
