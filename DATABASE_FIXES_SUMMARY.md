
# Database Fixes Summary

## Overview
This document summarizes the database schema fixes applied to resolve the errors shown in the screenshots.

## Errors Fixed

### 1. ✅ Missing Column: `suscripciones_locales.estado`
**Error:** `column suscripciones_locales.estado does not exist`

**Fix:** Added `estado` column to `suscripciones_locales` table with the following properties:
- Type: `text`
- Default: `'activa'`
- Constraint: `CHECK (estado IN ('activa', 'cancelada', 'pausada', 'expirada'))`

**Usage:** This column tracks the subscription status for local businesses.

---

### 2. ✅ Missing Table: `public.reviews_barlive`
**Error:** `Could not find the table 'public.reviews_barlive' in the schema cache`

**Fix:** Created `reviews_barlive` table with the following schema:
```sql
CREATE TABLE reviews_barlive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id uuid NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  texto text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**RLS Policies:**
- Anyone can view reviews
- Users can create, update, and delete their own reviews

**Indexes:**
- `idx_reviews_barlive_local_id` on `local_id`
- `idx_reviews_barlive_usuario_id` on `usuario_id`

---

### 3. ✅ Missing Column: `posts.likes`
**Error:** `Could not find the 'likes' column of 'posts' in the schema cache`

**Fix:** Added `likes` column to `posts` table:
- Type: `integer`
- Default: `0`
- Synced with existing `likes_count` column

**Trigger:** Created `sync_posts_likes_trigger` to keep `likes` and `likes_count` columns in sync automatically.

---

### 4. ✅ Missing Table: `public.profile_views`
**Error:** `Could not find the table 'public.profile_views' in the schema cache`

**Fix:** Created `profile_views` table with the following schema:
```sql
CREATE TABLE profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id uuid NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  source text CHECK (source IN ('explore', 'search', 'map', 'social', 'direct')),
  created_at timestamptz DEFAULT now()
);
```

**RLS Policies:**
- Anyone can insert profile views
- Users can view their own profile views

**Indexes:**
- `idx_profile_views_local_id` on `local_id`
- `idx_profile_views_usuario_id` on `usuario_id`
- `idx_profile_views_created_at` on `created_at DESC`

**Usage:** Tracks profile views for analytics and recommendations.

---

### 5. ✅ Missing Table: `public.sala_virtual_interacciones`
**Error:** `Could not find the table 'public.sala_virtual_interacciones' in the schema cache`

**Fix:** Renamed `sala_virtual_mensajes` to `sala_virtual_interacciones` and added missing columns:
- Added `recipient_id` column for private messages
- Renamed `mensaje` column to `contenido` for consistency

**Schema:**
```sql
CREATE TABLE sala_virtual_interacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id uuid NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('mensaje', 'emoticon')),
  contenido text NOT NULL,
  recipient_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
```

**RLS Policies:**
- Users can view messages in rooms they're checked into
- Users can insert messages in rooms they're checked into
- Users can delete their own messages

**Indexes:**
- `idx_sala_virtual_interacciones_local_id` on `local_id`
- `idx_sala_virtual_interacciones_usuario_id` on `usuario_id`
- `idx_sala_virtual_interacciones_created_at` on `created_at DESC`

---

## Migration Files Applied

1. **`fix_missing_columns_and_tables`** - Main migration that fixes all 5 issues
2. **`sync_posts_likes_columns`** - Trigger to keep `likes` and `likes_count` in sync

---

## Verification

All fixes have been verified and are now active in the database:

| Fix | Status |
|-----|--------|
| `suscripciones_locales.estado` | ✅ Exists |
| `reviews_barlive` table | ✅ Exists |
| `posts.likes` column | ✅ Exists |
| `profile_views` table | ✅ Exists |
| `sala_virtual_interacciones` table | ✅ Exists |

---

## Next Steps

1. **Test the application** to ensure all errors are resolved
2. **Monitor logs** for any remaining database-related errors
3. **Update documentation** if needed for the new tables and columns

---

## Notes

- All tables have Row Level Security (RLS) enabled
- All tables have appropriate indexes for performance
- All foreign key relationships are properly defined with CASCADE delete rules
- The `posts.likes` column is automatically synced with `posts.likes_count` via trigger
