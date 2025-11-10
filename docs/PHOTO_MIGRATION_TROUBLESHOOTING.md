
# 📸 Photo Migration Troubleshooting Guide

## Overview
This guide helps you troubleshoot issues when migrating photos from Google Places to Supabase Storage.

## Common Issues and Solutions

### 1. All Migrations Failing (0 successful, 28 failed)

#### Possible Causes:

**A. Supabase Storage Bucket Not Created**
- The `locales` bucket doesn't exist in your Supabase project
- **Solution:**
  1. Go to your Supabase Dashboard
  2. Navigate to Storage
  3. Create a new bucket named `locales`
  4. Make it **public** (so photos can be accessed)
  5. Try the migration again

**B. Insufficient Permissions**
- The bucket exists but doesn't have write permissions
- **Solution:**
  1. Go to Supabase Dashboard > Storage > `locales` bucket
  2. Click on "Policies"
  3. Add a policy to allow INSERT operations:
     ```sql
     CREATE POLICY "Allow public uploads"
     ON storage.objects FOR INSERT
     TO public
     WITH CHECK (bucket_id = 'locales');
     ```
  4. Add a policy to allow SELECT operations:
     ```sql
     CREATE POLICY "Allow public access"
     ON storage.objects FOR SELECT
     TO public
     USING (bucket_id = 'locales');
     ```

**C. Missing Photo Metadata**
- Locales have Google URLs but no `fotos_google` metadata
- Locales don't have `google_place_id` to re-fetch details
- **Solution:** The updated migration code now handles this with 3 strategies:
  1. Uses `fotos_google` metadata if available
  2. Re-fetches from Google Places API if `google_place_id` exists
  3. Downloads directly from Google URLs as fallback

**D. Google Places API Issues**
- API key not configured or invalid
- API quota exceeded
- API not enabled in Google Cloud Console
- **Solution:**
  1. Check your `.env` file has `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`
  2. Verify the API key is valid in Google Cloud Console
  3. Enable "Places API" in Google Cloud Console
  4. Check your API quota hasn't been exceeded

**E. Network/CORS Issues**
- Photos can't be downloaded from Google servers
- CORS blocking the requests
- **Solution:**
  1. Check your internet connection
  2. Try downloading a single photo manually to test
  3. Check browser console for CORS errors

**F. File Size Limits**
- Photos are too large for Supabase Storage
- **Solution:**
  1. Check Supabase Storage limits (default: 50MB per file)
  2. The code downloads photos at 800px width which should be fine
  3. If needed, reduce the size in `getGooglePlacePhotoUrl(photo.photo_reference, 800)`

### 2. Partial Failures (Some successful, some failed)

This is normal and expected. Some locales may:
- Have invalid photo references
- Have photos that are no longer available on Google
- Have network timeouts during download

**Solution:** 
- Review the logs to see which specific locales failed
- Try running the migration again for failed locales
- Some failures are acceptable if most photos migrated successfully

### 3. Debugging Steps

1. **Check Supabase Configuration:**
   ```typescript
   // In your app, check if Supabase is configured
   import { isSupabaseConfigured } from '@/utils/supabase';
   console.log('Supabase configured:', isSupabaseConfigured());
   ```

2. **Test Storage Upload Manually:**
   ```typescript
   // Try uploading a test file
   const testData = new Uint8Array([1, 2, 3, 4, 5]);
   const { data, error } = await supabase.storage
     .from('locales')
     .upload('test/test.txt', testData);
   
   console.log('Upload result:', { data, error });
   ```

3. **Check Bucket Exists:**
   ```typescript
   const { data: buckets, error } = await supabase.storage.listBuckets();
   console.log('Available buckets:', buckets);
   ```

4. **Verify Photo URLs:**
   - Check if the Google photo URLs are still valid
   - Try opening them in a browser
   - They might have expired or been removed

5. **Review Migration Logs:**
   - The migration page shows detailed logs
   - Look for specific error messages
   - Copy logs and analyze them

### 4. Migration Strategies

The updated migration code uses 3 strategies in order:

**Strategy 1: Use Photo Metadata**
- If `fotos_google` field has photo references
- Downloads using Google Places Photo API
- Most reliable if metadata exists

**Strategy 2: Re-fetch from Google Places**
- If `google_place_id` exists
- Calls Google Places Details API to get fresh photo references
- Uses API quota but ensures latest photos

**Strategy 3: Direct URL Download**
- If only Google URLs exist (no metadata or place_id)
- Downloads directly from the URLs
- May fail if URLs have expired

### 5. Best Practices

1. **Run Migration During Off-Peak Hours**
   - Less likely to hit API rate limits
   - Better network performance

2. **Monitor API Costs**
   - Each photo download counts as 1 API call
   - Each Place Details call costs more
   - Check your Google Cloud Console for usage

3. **Backup Before Migration**
   - Export your `locales` table before migrating
   - Keep a copy of the original URLs

4. **Incremental Migration**
   - If you have many locales, migrate in batches
   - Test with a few locales first

5. **Verify After Migration**
   - Check that photos load correctly in the app
   - Verify URLs point to Supabase
   - Test on different devices/networks

## SQL Queries for Troubleshooting

### Check which locales have Google URLs:
```sql
SELECT 
  id, 
  nombre, 
  imagen_url,
  array_length(galeria_urls, 1) as num_galeria,
  google_place_id,
  fotos_google
FROM locales
WHERE 
  activo = true 
  AND enriquecido = true
  AND (
    imagen_url LIKE '%googleapis.com%' 
    OR imagen_url LIKE '%googleusercontent.com%'
    OR EXISTS (
      SELECT 1 FROM unnest(galeria_urls) AS url 
      WHERE url LIKE '%googleapis.com%' 
         OR url LIKE '%googleusercontent.com%'
    )
  );
```

### Check which locales have Supabase URLs:
```sql
SELECT 
  id, 
  nombre, 
  imagen_url,
  array_length(galeria_urls, 1) as num_galeria
FROM locales
WHERE 
  activo = true 
  AND enriquecido = true
  AND (
    imagen_url LIKE '%supabase%'
    OR EXISTS (
      SELECT 1 FROM unnest(galeria_urls) AS url 
      WHERE url LIKE '%supabase%'
    )
  );
```

### Check locales with metadata but no photos:
```sql
SELECT 
  id, 
  nombre, 
  google_place_id,
  fotos_google,
  imagen_url
FROM locales
WHERE 
  activo = true 
  AND enriquecido = true
  AND fotos_google IS NOT NULL
  AND (imagen_url IS NULL OR imagen_url = '');
```

## Next Steps

1. **Create the Supabase Storage Bucket** (most common issue)
2. **Set up proper permissions** on the bucket
3. **Verify your Google Places API key** is configured
4. **Run the migration** and monitor the logs
5. **Review failed locales** and retry if needed

## Support

If you continue to have issues:
1. Copy the migration logs
2. Check the browser console for errors
3. Verify your Supabase and Google API configurations
4. Review the specific error messages in the logs
