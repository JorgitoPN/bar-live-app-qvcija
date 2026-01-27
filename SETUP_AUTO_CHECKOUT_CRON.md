
# 🔧 SETUP AUTO-CHECKOUT CRON JOB

## Overview

The auto-checkout system automatically removes users from locals when the local closes. This prevents situations like a user showing they're at "Bar San Roque" when it's 8:06 AM and the bar doesn't open until 9:00 AM.

---

## ✅ Edge Function Deployed

The Edge Function `auto-checkout-closed-locals` has been deployed to your Supabase project.

**Function URL:**
```
https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals
```

---

## 🕐 Setting Up the Cron Job

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Cron Jobs**
3. Click **Create a new cron job**
4. Use the following configuration:

**Name:** `auto-checkout-closed-locals`

**Schedule:** Every 15 minutes
```
*/15 * * * *
```

**Command:**
```sql
SELECT net.http_post(
  url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
  headers := '{"Content-Type": "application/json"}'::jsonb
);
```

5. Click **Create cron job**

---

### Option 2: Using SQL Editor

Run this SQL command in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job
SELECT cron.schedule(
  'auto-checkout-closed-locals',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

---

## 📋 Cron Schedule Options

Choose the frequency that best suits your needs:

### Every 5 minutes (Most responsive)
```
*/5 * * * *
```

### Every 10 minutes (Balanced)
```
*/10 * * * *
```

### Every 15 minutes (Recommended)
```
*/15 * * * *
```

### Every 30 minutes (Less frequent)
```
*/30 * * * *
```

### Every hour (Minimal)
```
0 * * * *
```

---

## 🔍 Verifying the Cron Job

### Check if cron job is created:
```sql
SELECT * FROM cron.job WHERE jobname = 'auto-checkout-closed-locals';
```

### View cron job execution history:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-checkout-closed-locals')
ORDER BY start_time DESC 
LIMIT 10;
```

### Manually trigger the function (for testing):
```sql
SELECT net.http_post(
  url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
  headers := '{"Content-Type": "application/json"}'::jsonb
);
```

---

## 📊 Monitoring

### Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → `auto-checkout-closed-locals`
3. Click on **Logs** tab
4. You should see logs like:

```
🔄 [AUTO-CHECKOUT] Starting auto-checkout process...
⏰ [AUTO-CHECKOUT] Current time: 2025-01-20T08:06:00.000Z
✅ [AUTO-CHECKOUT] Found 5 active check-ins
🔍 [AUTO-CHECKOUT] Checking 3 unique locals
✅ [AUTO-CHECKOUT] Loaded 3 locals
🚪 [AUTO-CHECKOUT] Local "Bar San Roque" is CLOSED, removing user abc123
✅ [AUTO-CHECKOUT] Local "Café Central" is OPEN, keeping user def456
🔄 [AUTO-CHECKOUT] Executing 1 check-outs...
✅ [AUTO-CHECKOUT] Check-outs completed: 1 successful, 0 failed
📬 [AUTO-CHECKOUT] Sent 1 notifications
```

---

## 🎯 How It Works

1. **Cron job triggers** every X minutes (based on your schedule)
2. **Edge Function executes:**
   - Fetches all active check-ins
   - Loads schedule data for each local
   - Determines if each local is currently open
   - Removes check-ins for closed locals
   - Sends notifications to affected users
3. **Users receive notification:**
   - "Has sido retirado de [Local Name] porque el local ha cerrado."
4. **Real-time updates:**
   - Check-in status updates immediately in the app
   - User's profile no longer shows them at the closed local

---

## 🔧 Troubleshooting

### Cron job not running?

1. Check if `pg_cron` extension is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. If not enabled, run:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Edge Function not responding?

1. Check Edge Function logs in Supabase Dashboard
2. Verify the function is deployed and active
3. Test manually using the SQL command above

### Users not being checked out?

1. Check Edge Function logs for errors
2. Verify local schedule data is correct in database
3. Test the schedule logic manually:
```sql
SELECT id, nombre, horarios_completos, estado_negocio
FROM locales
WHERE id = 'your-local-id';
```

---

## 🎉 Success Indicators

You'll know it's working when:

- ✅ Users are automatically removed from closed locals
- ✅ Users receive notifications when auto-checked-out
- ✅ Profile pages update in real-time
- ✅ No users show as being in closed locals
- ✅ Edge Function logs show successful executions

---

## 📝 Example Scenario

**Scenario:** User @jorge is checked in to "Bar San Roque"

**Current time:** 8:06 AM
**Bar opens at:** 9:00 AM

**What happens:**
1. Cron job runs at 8:15 AM
2. Edge Function checks "Bar San Roque" schedule
3. Determines bar is CLOSED (opens at 9:00 AM)
4. Removes @jorge's check-in
5. Sends notification to @jorge: "Has sido retirado de Bar San Roque porque el local ha cerrado."
6. @jorge's profile no longer shows them at Bar San Roque

---

## 🔐 Security

- Edge Function uses service role key (has full database access)
- No JWT verification needed (runs server-side)
- Only accessible via Supabase internal network
- Cron job runs with database privileges

---

**Setup Date:** 2025-01-20
**Version:** 1.0
**Status:** ✅ READY TO ACTIVATE
