
# Virtual Room Auto-Closure Cron Setup

## Overview
The virtual room auto-closure system requires a periodic check to determine when locals close and automatically close their virtual rooms. This is implemented using a Supabase Edge Function that should be triggered via a cron job.

---

## Setup Instructions

### Option 1: Supabase Dashboard (Recommended)

1. **Navigate to Edge Functions**
   - Go to Supabase Dashboard
   - Select your project: `embntaqwlwmgazvrglaf`
   - Click on "Edge Functions" in the left sidebar

2. **Find the Function**
   - Locate `check-virtual-room-closure` in the list
   - Click on it to open details

3. **Set Up Cron Trigger**
   - Click on "Cron Triggers" tab
   - Click "Create Cron Trigger"
   - Configure:
     - **Name**: `virtual-room-closure-check`
     - **Schedule**: `*/5 * * * *` (every 5 minutes)
     - **HTTP Method**: POST
     - **Headers**: None required
     - **Body**: None required

4. **Save and Enable**
   - Click "Create"
   - Ensure the trigger is enabled

---

### Option 2: External Cron Service

If Supabase cron triggers are not available in your plan, use an external service:

#### Using Cron-Job.org

1. **Create Account**
   - Go to https://cron-job.org
   - Sign up for free account

2. **Create Cron Job**
   - Click "Create Cronjob"
   - Configure:
     - **Title**: Virtual Room Closure Check
     - **URL**: `https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/check-virtual-room-closure`
     - **Schedule**: Every 5 minutes
     - **HTTP Method**: POST
     - **Headers**: 
       ```
       Authorization: Bearer YOUR_ANON_KEY
       ```

3. **Save and Enable**

#### Using EasyCron

1. **Create Account**
   - Go to https://www.easycron.com
   - Sign up for free account

2. **Create Cron Job**
   - Click "Create Cron Job"
   - Configure:
     - **URL**: `https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/check-virtual-room-closure`
     - **Cron Expression**: `*/5 * * * *`
     - **HTTP Method**: POST
     - **Headers**: Add Authorization header with anon key

3. **Save and Enable**

---

### Option 3: GitHub Actions (For Developers)

Create a GitHub Actions workflow:

```yaml
name: Virtual Room Closure Check

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  check-closure:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/check-virtual-room-closure
```

**Setup:**
1. Create `.github/workflows/virtual-room-check.yml` in your repository
2. Add `SUPABASE_ANON_KEY` to repository secrets
3. Commit and push

---

## Cron Schedule Options

Choose based on your needs:

### Every 5 Minutes (Recommended)
```
*/5 * * * *
```
- **Pros**: Quick response to closures
- **Cons**: More function invocations

### Every 10 Minutes
```
*/10 * * * *
```
- **Pros**: Balanced approach
- **Cons**: Slight delay in closure detection

### Every 15 Minutes
```
*/15 * * * *
```
- **Pros**: Fewer invocations
- **Cons**: Users may stay in closed rooms longer

---

## Verification

### Test the Function Manually

1. **Using cURL**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/check-virtual-room-closure
```

2. **Expected Response**
```json
{
  "success": true,
  "message": "Virtual room closure check completed"
}
```

### Monitor Logs

1. **Supabase Dashboard**
   - Go to Edge Functions
   - Click on `check-virtual-room-closure`
   - View "Logs" tab
   - Check for successful executions

2. **Look for**
   - `[VirtualRoomClosure] Check completed successfully`
   - No error messages
   - Regular execution timestamps

---

## Troubleshooting

### Function Not Running

**Check:**
1. Cron trigger is enabled
2. Function is deployed and active
3. Authorization header is correct
4. URL is correct

**Solution:**
- Manually trigger function to test
- Check Supabase logs for errors
- Verify cron service is active

### Users Not Being Expelled

**Check:**
1. Function is running regularly
2. Local `horarios_completos` data is correct
3. Timezone is set correctly (Europe/Madrid)

**Solution:**
- Verify local hours in database
- Check function logs for execution
- Test with a local that should be closed

### Messages Not Clearing

**Check:**
1. Database function has proper permissions
2. RLS policies allow deletion
3. Function is executing without errors

**Solution:**
- Check database logs
- Verify `SECURITY DEFINER` is set
- Test function manually

---

## Cost Considerations

### Supabase Edge Functions
- **Free Tier**: 500,000 invocations/month
- **Pro Tier**: 2,000,000 invocations/month

### Calculation
- Every 5 minutes: ~8,640 invocations/month
- Every 10 minutes: ~4,320 invocations/month
- Every 15 minutes: ~2,880 invocations/month

**Recommendation**: Even with 5-minute intervals, you're well within free tier limits.

---

## Monitoring

### Set Up Alerts

1. **Supabase Dashboard**
   - Go to Project Settings
   - Click on "Alerts"
   - Create alert for Edge Function failures

2. **External Monitoring**
   - Use UptimeRobot or similar
   - Monitor function endpoint
   - Get notified of failures

### Key Metrics to Track

1. **Function Execution Rate**
   - Should match cron schedule
   - No missed executions

2. **Error Rate**
   - Should be near 0%
   - Investigate any errors immediately

3. **Execution Time**
   - Should be < 1 second
   - Increase if many active rooms

---

## Maintenance

### Regular Checks

**Weekly:**
- Verify cron is running
- Check error logs
- Monitor execution times

**Monthly:**
- Review invocation counts
- Optimize if needed
- Update schedule if necessary

### Updates

When updating the function:
1. Deploy new version
2. Test manually
3. Monitor first few executions
4. Verify no regressions

---

## Alternative: Client-Side Polling

If cron setup is not possible, implement client-side polling:

```typescript
// In sala-virtual.tsx
useEffect(() => {
  const checkClosure = async () => {
    const estadoLocal = getEstadoLocal(local);
    if (!estadoLocal.estaAbierto) {
      Alert.alert(
        'Local Cerrado',
        'El local ha cerrado. Serás expulsado de la sala.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const interval = setInterval(checkClosure, 60000); // Every minute
  return () => clearInterval(interval);
}, [local]);
```

**Note**: This is less reliable as it depends on users being in the room.

---

## Summary

1. ✅ Choose a cron setup method (Supabase Dashboard recommended)
2. ✅ Configure to run every 5-10 minutes
3. ✅ Test manually to verify functionality
4. ✅ Monitor logs for successful execution
5. ✅ Set up alerts for failures

The system will automatically:
- Check all locals with active virtual rooms
- Close rooms when locals close
- Expel all users
- Clear all messages
- Broadcast closure events

No additional code changes needed - just set up the cron trigger!
