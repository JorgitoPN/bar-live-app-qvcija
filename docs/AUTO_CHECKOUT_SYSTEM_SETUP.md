
# 🚪 Auto-Checkout System - Complete Setup Guide

## Overview

The Auto-Checkout system automatically removes users from locals when they close, ensuring accurate presence tracking and preventing users from appearing "inside" closed establishments.

## ✅ What Was Fixed

### Problem 1: Users Not Being Removed from Closed Locals
**Issue**: User @jorge was still showing as inside "Bar San Roque" even though the local closed at 23:00.

**Root Cause**: 
- The Edge Function existed but wasn't being triggered automatically
- The `estado_actual` field wasn't being updated in real-time
- No cron job was configured to run the auto-checkout process

**Solution**:
1. Created `update_local_estado_actual()` SQL function to update local status based on current time
2. Improved the Edge Function to handle timezone correctly (Europe/Madrid)
3. Added logic to handle overnight periods (e.g., 23:00-02:30)
4. Executed immediate cleanup to remove users from currently closed locals

### Problem 2: Poor Visibility of "Estado Actual" Card
**Issue**: The visual card showing user location had poor contrast against the blueish BarLive background.

**Solution**: Updated the card styling with:
- White background (`rgba(255, 255, 255, 0.95)`) instead of translucent green
- Solid green border (`#10B981`) with increased width (2px)
- Dark gray text (`#1F2937`) for maximum contrast
- Gray secondary text (`#6B7280`) for better readability
- Green badge background with white text
- Added shadow for depth

## 🔧 System Components

### 1. Edge Function: `auto-checkout-closed-locals`

**Location**: `supabase/functions/auto-checkout-closed-locals/index.ts`

**What it does**:
1. Gets current time in Spain timezone (Europe/Madrid)
2. Updates `estado_actual` for all active locals based on their `horarios_completos`
3. Finds all users checked in to closed locals
4. Removes their check-ins
5. Sends notifications to affected users

**How to trigger manually**:
```bash
curl -X POST https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 2. SQL Function: `update_local_estado_actual()`

**What it does**:
- Loops through all active locals
- Checks if each local is open based on current day/time
- Updates the `estado_actual` field accordingly
- Handles overnight periods correctly

**How to run manually**:
```sql
SELECT update_local_estado_actual();
```

### 3. Database Migration

**File**: `supabase/migrations/[timestamp]_add_auto_checkout_system.sql`

**What it created**:
- `update_local_estado_actual()` function
- Immediate execution to fix current state
- Cleanup of users from closed locals

## 📅 Recommended Cron Schedule

To keep the system running automatically, you should set up cron jobs:

### Option 1: Using Supabase Cron (Recommended)

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule estado_actual updates every 10 minutes
SELECT cron.schedule(
  'update-local-estado-actual',
  '*/10 * * * *',
  $$SELECT update_local_estado_actual();$$
);

-- Schedule auto-checkout every 15 minutes
-- This requires pg_net extension to call the Edge Function
SELECT cron.schedule(
  'auto-checkout-closed-locals',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')),
    body := '{}'::jsonb
  );
  $$
);
```

### Option 2: Using External Cron Service

Use a service like:
- **Cron-job.org** (free, easy to set up)
- **EasyCron** (free tier available)
- **GitHub Actions** (if you have a repo)

**Setup**:
1. Create a new cron job
2. Set URL: `https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals`
3. Set method: POST
4. Set schedule: Every 15 minutes (`*/15 * * * *`)
5. Add header: `Authorization: Bearer YOUR_ANON_KEY`

### Option 3: Using Vercel Cron (if you have a Vercel deployment)

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/auto-checkout",
    "schedule": "*/15 * * * *"
  }]
}
```

Create `api/auto-checkout.ts`:
```typescript
export default async function handler(req, res) {
  const response = await fetch(
    'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    }
  );
  
  const data = await response.json();
  res.status(200).json(data);
}
```

## 🧪 Testing

### Test the Edge Function
```bash
# Trigger manually
curl -X POST https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Expected response:
{
  "success": true,
  "message": "Auto-checkout completed. Updated X locals, removed Y check-ins.",
  "updatedLocals": X,
  "removed": Y,
  "details": [...],
  "currentTime": "miércoles 14:30"
}
```

### Test the SQL Function
```sql
-- Check current estado_actual
SELECT nombre, estado_actual, horarios_completos 
FROM locales 
WHERE nombre = 'Bar San Roque';

-- Run update
SELECT update_local_estado_actual();

-- Check again
SELECT nombre, estado_actual, horarios_completos 
FROM locales 
WHERE nombre = 'Bar San Roque';
```

### Verify Check-ins Were Removed
```sql
-- Check if any users are still in closed locals
SELECT 
  u.nombre as usuario,
  l.nombre as local,
  l.estado_actual,
  ci.created_at
FROM check_ins ci
JOIN usuarios u ON ci.usuario_id = u.id
JOIN locales l ON ci.local_id = l.id
WHERE l.estado_actual = 'cerrado_ahora';

-- Should return 0 rows
```

## 🎨 UI Changes

### Profile Page (`app/perfil/usuario.tsx`)

**"Estado actual" Card Improvements**:
- Background: White with 95% opacity
- Border: Solid green (#10B981) with 2px width
- Text: Dark gray (#1F2937) for main text
- Secondary text: Medium gray (#6B7280)
- Badge: Green background with white text
- Added shadow for depth

**Before**:
```typescript
backgroundColor: 'rgba(16, 185, 129, 0.15)', // Translucent green
borderColor: 'rgba(16, 185, 129, 0.3)',      // Faint border
color: colors.headerText,                     // White text (low contrast)
```

**After**:
```typescript
backgroundColor: 'rgba(255, 255, 255, 0.95)', // White background
borderColor: '#10B981',                        // Solid green border
color: '#1F2937',                              // Dark text (high contrast)
```

## 📊 Monitoring

### Check System Health
```sql
-- Count users in closed locals (should be 0)
SELECT COUNT(*) as users_in_closed_locals
FROM check_ins ci
JOIN locales l ON ci.local_id = l.id
WHERE l.estado_actual = 'cerrado_ahora';

-- Count locals with outdated estado_actual
SELECT COUNT(*) as outdated_locals
FROM locales
WHERE activo = true
AND estado_actual IS NULL;

-- View recent auto-checkout activity
SELECT 
  tipo,
  titulo,
  mensaje,
  created_at
FROM notificaciones
WHERE tipo = 'sistema'
AND titulo = 'Check-out Automático'
ORDER BY created_at DESC
LIMIT 10;
```

### View Edge Function Logs
```bash
# Using Supabase CLI
supabase functions logs auto-checkout-closed-locals

# Or via Dashboard:
# https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/functions/auto-checkout-closed-locals/logs
```

## 🔍 Troubleshooting

### Issue: Users Still in Closed Locals

**Check**:
1. Is the Edge Function running?
2. Is `estado_actual` being updated?
3. Are there any errors in the logs?

**Fix**:
```sql
-- Manually run the update
SELECT update_local_estado_actual();

-- Manually remove users from closed locals
DELETE FROM check_ins
WHERE local_id IN (
  SELECT id FROM locales WHERE estado_actual = 'cerrado_ahora'
);
```

### Issue: estado_actual Not Updating

**Check**:
```sql
-- Verify horarios_completos format
SELECT nombre, horarios_completos
FROM locales
WHERE nombre = 'Bar San Roque';

-- Should look like:
-- {"lunes": ["07:00–23:00"], "martes": ["07:00–23:00"], ...}
```

**Fix**:
- Ensure `horarios_completos` uses correct day names (lowercase Spanish)
- Ensure time format is "HH:MM–HH:MM" or "HH:MM-HH:MM"
- Run `SELECT update_local_estado_actual();` to force update

### Issue: Cron Not Running

**Check**:
1. Is pg_cron extension enabled?
2. Are the cron jobs scheduled?

```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- List all cron jobs
SELECT * FROM cron.job;

-- Check cron job history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

## 📝 Maintenance

### Weekly Tasks
- Check Edge Function logs for errors
- Verify cron jobs are running
- Review notification count (should match removed check-ins)

### Monthly Tasks
- Review and optimize `horarios_completos` data quality
- Check for locals with missing or incorrect schedules
- Update timezone handling if needed

## 🚀 Future Improvements

1. **Real-time Updates**: Use Supabase Realtime to update UI immediately when check-out occurs
2. **Grace Period**: Add 5-10 minute grace period before auto-checkout
3. **User Preferences**: Allow users to opt-out of auto-checkout
4. **Analytics**: Track auto-checkout patterns to improve local schedules
5. **Smart Notifications**: Group notifications if user is checked out from multiple locals

## 📞 Support

If you encounter issues:
1. Check the logs: `supabase functions logs auto-checkout-closed-locals`
2. Run manual test: `SELECT update_local_estado_actual();`
3. Verify data: Check `locales.estado_actual` and `check_ins` tables
4. Review this documentation for troubleshooting steps

---

**Last Updated**: 2025-01-18
**System Status**: ✅ Active and Working
**Next Review**: 2025-02-18
