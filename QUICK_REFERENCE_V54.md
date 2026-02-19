
# ⚡ Quick Reference v54.0

## 🎯 What Changed?

### 1. Plan Synchronization ✅
- Fixed: @jorge can now access social network with Bar A Coviña (Estándar plan)
- Fixed: Restriction message shows correct local name
- Fixed: Admin-assigned plans are recognized immediately

### 2. Plan Potentials ✅
- Gratuito: **30%** (was 20%)
- Estándar: **65%** (was 35%)
- Premium: **100%** (was 50%)
- Destacado: **+35%** (was +30%)

### 3. Invoice Emails ✅
- Fixed: Emails are now actually sent using Resend API
- Fixed: No more false "success" messages
- Fixed: Professional HTML email template

### 4. Review Rating ✅
- Fixed: Map popup shows actual review average
- Fixed: Shows review count
- Fixed: No more "0.0" when reviews exist

### 5. Local Creation Requirements ✅
- Added: Mandatory fields validation
- Added: **REQUIRED** ownership document upload
- Added: Same fields as "Crear Local" page

### 6. Admin Solicitudes View ✅
- Added: Complete information display
- Added: Document viewer
- Added: Image gallery preview
- Added: Map location display

---

## 🚀 Quick Commands

### Check @jorge's Plan
```sql
SELECT 
  l.nombre,
  p.nombre as plan,
  p.perfil_social,
  s.estado
FROM locales l
JOIN suscripciones_locales s ON s.local_id = l.id
JOIN planes_suscripcion p ON p.id = s.plan_id
WHERE l.nombre = 'Bar A Coviña';
```

### Check Plan Potentials
```sql
SELECT 
  nombre,
  precio_mensual,
  perfil_social,
  eventos_mes,
  promos_destacadas
FROM planes_suscripcion
WHERE activo = true
ORDER BY precio_mensual ASC;
```

### Check Storage Bucket
```sql
SELECT * FROM storage.buckets WHERE name = 'documentos-propiedad';
```

### Check Solicitudes with Documents
```sql
SELECT 
  id,
  nombre_local,
  tipo_solicitud,
  documento_propiedad_url,
  documento_propiedad_tipo,
  estado
FROM solicitudes_propietario
WHERE documento_propiedad_url IS NOT NULL
ORDER BY created_at DESC;
```

---

## 🐛 Common Issues

### Issue: Email not delivered
**Solution:**
1. Check `RESEND_API_KEY` in Edge Functions environment variables
2. Verify domain in Resend dashboard
3. Check Edge Function logs

### Issue: Document upload fails
**Solution:**
1. Check bucket exists: `SELECT * FROM storage.buckets WHERE name = 'documentos-propiedad';`
2. Check RLS policies
3. Check user is authenticated

### Issue: Wrong local name in restriction
**Solution:**
1. Check ModeContext is providing correct `activeProfileId`
2. Check `activeLocalData` is loaded
3. Refresh the app

---

## 📊 Plan Potential Calculator

```
Gratuito:
- Base: 30%
- + Destacado: 65%

Estándar:
- Base: 65%
- + Destacado: 100%

Premium:
- Base: 100%
- + Destacado: 135%
```

---

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `components/social/PermissionGuard.tsx` | Access control for social features |
| `components/gestion/CustomerPotentialBar.tsx` | Shows customer potential percentage |
| `components/gestion/LocalSubscriptionCard.tsx` | Local subscription card with potential |
| `supabase/functions/send-invoice-email/index.ts` | Sends invoice emails via Resend |
| `app/solicitudes/solicitar-rol-propietario.tsx` | Owner request form with document upload |
| `app/admin/solicitudes-propietario.tsx` | Admin view for reviewing requests |

---

## 📞 Support

**Email:** soporte@barlive.app
**Admin Panel:** Admin > Soporte y Ayuda
