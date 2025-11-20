
# Event Expiration System

## Overview

The BarLive app now includes an automatic event expiration and cleanup system that removes finished events from both the app UI and the database to save space and keep the event list clean.

## How It Works

### 1. Database Functions

Two PostgreSQL functions have been created to handle event cleanup:

#### `delete_expired_events()`
- **Purpose**: Permanently deletes expired events from the database
- **Logic**: 
  - If `fecha_fin` and `hora_fin` are set, uses them to determine expiration
  - If only `fecha` is set, considers the event expired after that date
- **Returns**: Count of deleted events

#### `mark_expired_events_inactive()`
- **Purpose**: Marks expired events as inactive (soft delete)
- **Logic**: Same as above, but sets `activo = false` instead of deleting
- **Returns**: Count of updated events

### 2. Supabase Edge Function

A serverless Edge Function (`cleanup-expired-events`) runs the cleanup process:

- **Endpoint**: `/functions/v1/cleanup-expired-events`
- **Method**: POST
- **Authentication**: Requires valid Supabase auth token
- **Process**:
  1. Calls `delete_expired_events()` to permanently remove expired events
  2. Calls `mark_expired_events_inactive()` as a backup to mark any remaining expired events
  3. Returns count of deleted and marked events

### 3. Client-Side Integration

The eventos screen (`app/(tabs)/eventos/index.tsx`) includes:

- **Automatic Cleanup**: Runs cleanup on mount and every hour
- **Manual Cleanup**: Runs cleanup when user pulls to refresh
- **Client-Side Filtering**: Filters out expired events using `filterExpiredEvents()` utility
- **Real-Time Updates**: Reloads events after cleanup if any were removed

### 4. Utility Functions

The `utils/eventCleanup.ts` module provides:

- `isEventExpired()`: Check if a single event has expired
- `cleanupExpiredEvents()`: Call the Edge Function to run cleanup
- `deleteExpiredEvent()`: Delete a single event by ID
- `markEventInactive()`: Mark a single event as inactive
- `getExpiredEventsCount()`: Get count of expired events
- `filterExpiredEvents()`: Filter expired events from an array

## Event Expiration Logic

An event is considered expired when:

1. **With End Date/Time**: Current time > `fecha_fin` + `hora_fin`
2. **Without End Date**: Current date > `fecha` (end of day)

Example:
```typescript
// Event with end date
fecha: "2025-01-15"
hora: "20:00:00"
fecha_fin: "2025-01-16"
hora_fin: "02:00:00"
// Expires: 2025-01-16 at 02:00:00

// Event without end date
fecha: "2025-01-15"
hora: "20:00:00"
// Expires: 2025-01-15 at 23:59:59
```

## Manual Cleanup

To manually trigger cleanup:

### From the App
1. Go to the Eventos screen
2. Pull down to refresh
3. Cleanup runs automatically

### From Supabase Dashboard
```sql
-- Delete expired events
SELECT * FROM delete_expired_events();

-- Mark expired events as inactive
SELECT * FROM mark_expired_events_inactive();
```

### Using cURL
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/cleanup-expired-events \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Scheduled Cleanup (Optional)

To run cleanup automatically on a schedule, you can:

### Option 1: Supabase Cron Jobs (Recommended)
Set up a cron job in Supabase to call the Edge Function:

```sql
-- Create a cron job to run cleanup daily at 3 AM
SELECT cron.schedule(
  'cleanup-expired-events',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/cleanup-expired-events',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

### Option 2: External Cron Service
Use a service like:
- **Cron-job.org**: Free cron job service
- **EasyCron**: Scheduled HTTP requests
- **GitHub Actions**: Run on schedule

Example GitHub Action:
```yaml
name: Cleanup Expired Events
on:
  schedule:
    - cron: '0 3 * * *' # Daily at 3 AM UTC
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup function
        run: |
          curl -X POST \
            ${{ secrets.SUPABASE_URL }}/functions/v1/cleanup-expired-events \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

## Database Schema

### eventos Table
```sql
CREATE TABLE eventos (
  id UUID PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  fecha_fin DATE, -- End date (optional)
  hora TIME NOT NULL,
  hora_fin TIME, -- End time (optional)
  activo BOOLEAN DEFAULT true,
  -- ... other columns
);

-- Index for fast expiration queries
CREATE INDEX idx_eventos_expiration 
ON eventos(activo, fecha_fin, fecha) 
WHERE activo = true;
```

## Performance Considerations

- **Index**: An index on `(activo, fecha_fin, fecha)` speeds up expiration queries
- **Batch Deletion**: The cleanup functions delete in batches to avoid long-running transactions
- **Client-Side Filtering**: Additional filtering on the client ensures no expired events are shown
- **Hourly Cleanup**: Running cleanup every hour keeps the database clean without excessive load

## Monitoring

To monitor the cleanup system:

### Check Expired Events Count
```sql
SELECT COUNT(*) 
FROM eventos 
WHERE activo = true 
AND (
  (fecha_fin IS NOT NULL AND hora_fin IS NOT NULL AND 
   (fecha_fin || ' ' || hora_fin)::timestamp < NOW())
  OR
  (fecha_fin IS NULL AND fecha < CURRENT_DATE)
);
```

### View Recent Cleanup Activity
Check the Edge Function logs in Supabase Dashboard:
1. Go to Edge Functions
2. Select `cleanup-expired-events`
3. View logs

### Test Cleanup
```sql
-- Create a test expired event
INSERT INTO eventos (
  titulo, descripcion, fecha, hora, fecha_fin, hora_fin,
  provincia, propietario_id, activo
) VALUES (
  'Test Expired Event',
  'This event should be deleted',
  CURRENT_DATE - INTERVAL '2 days',
  '20:00:00',
  CURRENT_DATE - INTERVAL '1 day',
  '02:00:00',
  'Madrid',
  'your-user-id',
  true
);

-- Run cleanup
SELECT * FROM delete_expired_events();

-- Verify deletion
SELECT * FROM eventos WHERE titulo = 'Test Expired Event';
```

## Troubleshooting

### Events Not Being Deleted

1. **Check if events have end dates**:
   ```sql
   SELECT id, titulo, fecha, fecha_fin, hora_fin 
   FROM eventos 
   WHERE activo = true 
   ORDER BY fecha DESC;
   ```

2. **Manually run cleanup**:
   ```sql
   SELECT * FROM delete_expired_events();
   ```

3. **Check Edge Function logs** in Supabase Dashboard

### Performance Issues

If cleanup is slow:

1. **Check index exists**:
   ```sql
   SELECT * FROM pg_indexes 
   WHERE tablename = 'eventos' 
   AND indexname = 'idx_eventos_expiration';
   ```

2. **Analyze query performance**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM eventos
   WHERE activo = true
   AND fecha_fin < CURRENT_DATE;
   ```

## Future Enhancements

Potential improvements:

1. **Archive Instead of Delete**: Move expired events to an archive table
2. **Configurable Retention**: Allow admins to set how long to keep expired events
3. **Notification Before Deletion**: Notify event owners before deletion
4. **Soft Delete Period**: Keep events inactive for X days before permanent deletion
5. **Analytics**: Track event lifecycle and cleanup statistics

## Summary

The event expiration system ensures that:

- ✅ Finished events are automatically removed from the app
- ✅ Database space is saved by deleting old events
- ✅ Users only see active and upcoming events
- ✅ Cleanup runs automatically without manual intervention
- ✅ Performance is optimized with proper indexing
- ✅ Both hard delete and soft delete options are available

The system is production-ready and requires no additional configuration to work out of the box.
