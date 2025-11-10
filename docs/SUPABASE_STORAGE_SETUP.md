
# 🗄️ Supabase Storage Setup Guide

## Quick Setup for Photo Migration

### Step 1: Create the Storage Bucket

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click on **Storage** in the left sidebar
4. Click **New bucket**
5. Enter the following details:
   - **Name:** `locales`
   - **Public bucket:** ✅ **YES** (check this box)
   - **File size limit:** 50 MB (default is fine)
   - **Allowed MIME types:** Leave empty (allows all image types)
6. Click **Create bucket**

### Step 2: Set Up Storage Policies

The bucket needs policies to allow uploads and public access.

#### Option A: Using the Dashboard (Recommended)

1. Go to **Storage** > **Policies**
2. Click **New policy** for the `locales` bucket
3. Create two policies:

**Policy 1: Allow Public Uploads**
- **Policy name:** `Allow public uploads`
- **Allowed operation:** `INSERT`
- **Target roles:** `public`
- **Policy definition:**
  ```sql
  bucket_id = 'locales'
  ```

**Policy 2: Allow Public Access**
- **Policy name:** `Allow public access`
- **Allowed operation:** `SELECT`
- **Target roles:** `public`
- **Policy definition:**
  ```sql
  bucket_id = 'locales'
  ```

#### Option B: Using SQL (Advanced)

Go to **SQL Editor** and run:

```sql
-- Allow anyone to upload to the locales bucket
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'locales');

-- Allow anyone to read from the locales bucket
CREATE POLICY "Allow public access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'locales');

-- Optional: Allow updates (if you want to replace photos)
CREATE POLICY "Allow public updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'locales')
WITH CHECK (bucket_id = 'locales');

-- Optional: Allow deletes (if you want to remove photos)
CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'locales');
```

### Step 3: Verify the Setup

Test that the bucket is working:

1. Go to **Storage** > **locales** bucket
2. Try uploading a test image manually
3. Check that you can view the uploaded image
4. Copy the public URL and verify it works in a browser

### Step 4: Folder Structure

The app will create photos in this structure:
```
locales/
  └── fotos/
      ├── {localId}_0_{timestamp}.jpg
      ├── {localId}_1_{timestamp}.jpg
      ├── {localId}_streetview_0_{timestamp}.jpg
      └── ...
```

### Common Issues

#### Issue: "Bucket not found"
- **Solution:** Make sure the bucket name is exactly `locales` (lowercase)

#### Issue: "Permission denied"
- **Solution:** Check that you created the storage policies (Step 2)

#### Issue: "File too large"
- **Solution:** Increase the file size limit in bucket settings

#### Issue: "CORS error"
- **Solution:** Supabase handles CORS automatically for public buckets. Make sure the bucket is set to public.

### Security Considerations

**Public Bucket:**
- ✅ Allows anyone to view photos (needed for the app)
- ✅ Allows anyone to upload photos (needed for migration)
- ⚠️ Consider adding authentication later for production

**For Production (Optional):**

If you want to restrict uploads to authenticated users only:

```sql
-- Remove the public upload policy
DROP POLICY "Allow public uploads" ON storage.objects;

-- Add authenticated-only upload policy
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'locales');
```

Then update your app to ensure users are authenticated before uploading.

### Storage Limits

**Free Tier:**
- 1 GB storage
- 2 GB bandwidth per month
- 50 MB max file size

**Pro Tier:**
- 100 GB storage
- 200 GB bandwidth per month
- 5 GB max file size

### Monitoring Storage Usage

1. Go to **Settings** > **Usage**
2. Check **Storage** section
3. Monitor:
   - Total storage used
   - Bandwidth used
   - Number of files

### Cleanup (Optional)

If you need to delete old Google photos after migration:

```sql
-- This is just an example - DO NOT run unless you're sure!
-- First, backup your data!

-- Find locales with both Google and Supabase photos
SELECT id, nombre, imagen_url, galeria_urls
FROM locales
WHERE imagen_url LIKE '%supabase%'
  AND EXISTS (
    SELECT 1 FROM unnest(galeria_urls) AS url 
    WHERE url LIKE '%googleapis.com%'
  );
```

### Next Steps

After setting up the storage bucket:

1. ✅ Bucket created and public
2. ✅ Policies configured
3. ✅ Test upload successful
4. 🚀 Run the photo migration in the app

Go to: **Admin** > **Migrar Fotos a Supabase**
