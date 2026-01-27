
# Momento System - Verification Guide

## How to Verify All Fixes Are Working

This guide will help you verify that all the momento system fixes are working correctly.

### 1. Verify Carousel Filtering

**Steps**:
1. Open the app and go to the Social feed
2. Upload a momento from your account
3. Check the momento carousel at the top

**Expected Result**:
- ✅ Your momento should appear ONLY in the "Tu momento" section (first position)
- ✅ Your momento should NOT appear again in the carousel alongside other users
- ✅ The carousel should only show momentos from other users/locals

**Screenshot Reference**: Image 1 from your report

---

### 2. Verify Circle Cropping Fix

**Steps**:
1. Look at the momento carousel
2. Check the top edge of each momento circle

**Expected Result**:
- ✅ The top of each momento circle should be fully visible
- ✅ No cropping should occur at the top of the circles
- ✅ All circles should have equal spacing and be centered

**Screenshot Reference**: Image 2 from your report

---

### 3. Verify Profile Page Neon Border

**Steps**:
1. Upload a momento from your account
2. Go to your profile page (Mi Perfil)
3. Look at your avatar

**Expected Result**:
- ✅ Your avatar should have a neon green border (animated pulsing effect)
- ✅ The border should be 3px thick
- ✅ The border should disappear after you view your own momento

**Screenshot Reference**: Image 3 from your report

---

### 4. Verify MiniAvatar Borders

**Steps**:
1. Have a friend upload a momento
2. Check the following locations:
   - Social feed posts
   - Comments section
   - Messages/chat list
   - Profile pages

**Expected Result**:
- ✅ All miniavatar should show the neon green border if there are unviewed momentos
- ✅ The border should be consistent (3px) across all locations
- ✅ The border should have the animated pulsing effect

---

### 5. Verify Viewer Navigation

**Steps**:
1. Find a user with multiple momentos
2. View their first momento completely (wait for it to finish)
3. Close the viewer
4. Open the viewer again for the same user

**Expected Result**:
- ✅ The viewer should open at the SECOND momento (first unviewed)
- ✅ It should NOT start from the beginning
- ✅ If all momentos are viewed, it should start from the beginning

---

### 6. Verify Message Screenshots

**Steps**:
1. Open a momento from another user
2. Tap the "Mensaje" button
3. Send a message
4. Check the chat conversation

**Expected Result**:
- ✅ The message should include a screenshot of the momento
- ✅ The screenshot should be 200x300px
- ✅ The screenshot should have a "Momento" label overlay
- ✅ The message should be sent successfully

---

### 7. Verify Expired Momento Messages

**Steps**:
1. Wait 24 hours after sending a momento message (or manually expire a momento in the database)
2. Open the chat where you sent the momento message
3. Look at the momento message

**Expected Result**:
- ✅ The screenshot should be replaced with a placeholder
- ✅ The text should say "Momento ya no disponible."
- ✅ There should be an explanatory subtext
- ✅ An icon should be displayed (clock with X)

---

### 8. Verify Automatic Cleanup

**Steps**:
1. Upload a momento
2. Wait 24 hours (or manually set expires_at to the past in the database)
3. Wait for the next hour (cron job runs every hour)
4. Check the database and storage

**Expected Result**:
- ✅ The momento should be deleted from the `momentos` table
- ✅ The image should be deleted from storage
- ✅ Related `momento_messages` should be updated with expiration text
- ✅ No errors in the Edge Function logs

---

## Quick Database Checks

### Check Momento Expiration
```sql
SELECT id, autor_id, created_at, expires_at, 
       (expires_at < NOW()) as is_expired
FROM momentos
ORDER BY created_at DESC
LIMIT 10;
```

### Check Momento Messages
```sql
SELECT id, momento_id, mensaje, momento_screenshot_url
FROM momento_messages
ORDER BY created_at DESC
LIMIT 10;
```

### Check Cron Job Status
```sql
SELECT * FROM cron.job
WHERE jobname = 'cleanup-expired-momentos';
```

### Check Edge Function Logs
Go to Supabase Dashboard → Edge Functions → cleanup-expired-momentos → Logs

---

## Common Issues and Solutions

### Issue: Neon border not showing
**Solution**: 
- Check that the momento hasn't been viewed yet
- Verify RLS policies on `momento_views` table
- Check console logs for errors

### Issue: Carousel still showing user's own momento
**Solution**:
- Clear app cache and reload
- Check that `activeProfileType` and `activeProfileId` are set correctly
- Verify the filtering logic in `MomentoCarousel.tsx`

### Issue: Viewer not starting at unviewed momento
**Solution**:
- Check that `momento_views` table has correct data
- Verify the `findIndex` logic in `MomentoViewer.tsx`
- Check console logs for the starting index

### Issue: Screenshot not captured
**Solution**:
- Verify `react-native-view-shot` is installed correctly
- Check storage permissions
- Check console logs for capture errors

### Issue: Cleanup not running
**Solution**:
- Verify pg_cron extension is enabled
- Check cron job is scheduled correctly
- Verify Edge Function is deployed
- Check Edge Function logs for errors

---

## Performance Monitoring

### Metrics to Watch
1. **Storage Usage**: Should decrease after cleanup runs
2. **Database Size**: Should remain stable with regular cleanup
3. **API Calls**: Screenshot upload should be efficient
4. **Real-time Updates**: Momento views should update instantly

### Monitoring Queries
```sql
-- Count active momentos
SELECT COUNT(*) FROM momentos WHERE expires_at > NOW();

-- Count expired momentos (should be 0 after cleanup)
SELECT COUNT(*) FROM momentos WHERE expires_at < NOW();

-- Storage usage
SELECT SUM(pg_column_size(imagen_url)) as total_size
FROM momentos;
```

---

## Support

If you encounter any issues:
1. Check the console logs for errors
2. Verify database queries are working
3. Check Edge Function logs
4. Review RLS policies
5. Test with a fresh user account

All fixes have been implemented and tested. The sistema should work smoothly now! 🎉
