
# Event Expiration System

## Overview

The event expiration system automatically removes expired events from the database to keep the data clean and relevant.

## Components

### 1. Database Schema

The `eventos` table includes the following date/time fields:

- `fecha` (date): Start date of the event
- `hora` (time): Start time of the event
- `fecha_fin` (date): End date of the event
- `hora_fin` (time): End time of the event

### 2. Database Function

A PostgreSQL function `mark_expired_events()` automatically marks events as inactive when they expire:

```sql
SELECT mark_expired_events();
```

This function:
- Marks events as `activo = false` when their end date/time has passed
- Handles legacy events without `fecha_fin` by using `fecha + 1 day` as default
- Can be called manually or via cron job

### 3. Edge Function

The `cleanup-expired-events` Edge Function deletes expired events from the database:

**Endpoint:** `https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/cleanup-expired-events`

**Method:** POST

**Response:**
```json
{
  "success": true,
  "message": "Successfully cleaned up 5 expired events",
  "cleaned": 5,
  "deletedEvents": [...]
}
```

### 4. Automatic Cleanup

To set up automatic cleanup, you can use one of these methods:

#### Option A: Supabase Cron (Recommended)

If your Supabase project has pg_cron enabled:

```sql
-- Run cleanup every hour
SELECT cron.schedule(
  'cleanup-expired-events',
  '0 * * * *',
  $$SELECT mark_expired_events()$$
);
```

#### Option B: External Cron Service

Use a service like:
- **Cron-job.org**: Free cron job service
- **EasyCron**: Reliable cron service
- **GitHub Actions**: Free for public repos

Configure it to call the Edge Function every hour:

```bash
curl -X POST https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/cleanup-expired-events \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

#### Option C: Vercel Cron (if using Vercel)

Create a Vercel cron job in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cleanup-events",
    "schedule": "0 * * * *"
  }]
}
```

## Event Lifecycle

1. **Creation**: Event is created with `fecha`, `hora`, `fecha_fin`, `hora_fin`
2. **Active**: Event is visible and searchable while `activo = true`
3. **Live**: Event is considered "live" when current time is between start and end
4. **Expired**: Event is marked as inactive when end date/time passes
5. **Cleanup**: Expired events are deleted from database (optional, can keep for analytics)

## Frontend Components

### EventBanner Component

Displays event with countdown timer:

```tsx
import EventBanner from '@/components/eventos/EventBanner';
import { useLocalEvent } from '@/hooks/useLocalEvent';

const { evento } = useLocalEvent(localId);

{evento && <EventBanner evento={evento} compact={true} />}
```

### useLocalEvent Hook

Fetches the active event for a local:

- Prioritizes LIVE events
- Falls back to next UPCOMING event
- Returns null if no active events

```tsx
const { evento, loading } = useLocalEvent(localId);
```

## Event Display Logic

1. **Local Cards**: Show compact event banner if local has active event
2. **Local Details**: Show full event banner at top of page
3. **Local Profile**: Show compact event banner in header section
4. **Event Details**: Show countdown timer in header and content

## Manual Cleanup

To manually clean up expired events:

```sql
-- Mark as inactive
SELECT mark_expired_events();

-- Delete from database
DELETE FROM eventos 
WHERE activo = false 
  AND updated_at < NOW() - INTERVAL '7 days';
```

## Monitoring

Check for expired events:

```sql
SELECT id, titulo, fecha, fecha_fin, hora, hora_fin, activo
FROM eventos
WHERE fecha_fin < CURRENT_DATE
  OR (fecha_fin = CURRENT_DATE AND hora_fin < CURRENT_TIME)
ORDER BY fecha_fin DESC, hora_fin DESC;
```

## Notes

- Events without `fecha_fin` default to ending 4 hours after start time
- Countdown updates every minute for performance
- Live events have priority over upcoming events in banner display
- Expired events can be kept for analytics or deleted immediately
