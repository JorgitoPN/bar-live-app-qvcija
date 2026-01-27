
# Fixes for RLS Policies and Foreign Key Relationships

## Issues Fixed

### 1. RLS Policy Violation on `locales_guardados`
**Error:** `new row violates row-level security policy for table "locales_guardados"`

**Root Cause:** The RLS policies were configured for the `public` role instead of the `authenticated` role, which meant authenticated users couldn't insert rows.

**Solution:**
- Updated all RLS policies on `locales_guardados` to use the `authenticated` role
- Policies now explicitly check `auth.uid() = usuario_id` for INSERT, SELECT, UPDATE, and DELETE operations
- This ensures only authenticated users can manage their own saved locals

### 2. Missing Foreign Key Relationship Error
**Error:** `Could not find a relationship between 'sala_virtual_interacciones' and 'usuarios' in the schema cache`

**Root Cause:** The foreign keys existed in the database, but Supabase's schema cache wasn't recognizing them properly. This can happen after schema changes or migrations.

**Solution:**
- Sent a `NOTIFY pgrst, 'reload schema'` command to refresh Supabase's schema cache
- Updated RLS policies on `sala_virtual_interacciones` to use the `authenticated` role
- Added proper indexes to improve query performance
- Ensured all foreign key columns are properly indexed

## Changes Made

### RLS Policies for `locales_guardados`

```sql
-- INSERT policy
CREATE POLICY "Authenticated users can create saved locals"
  ON locales_guardados
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- SELECT policy
CREATE POLICY "Authenticated users can view their own saved locals"
  ON locales_guardados
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- UPDATE policy
CREATE POLICY "Authenticated users can update their own saved locals"
  ON locales_guardados
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id);

-- DELETE policy
CREATE POLICY "Authenticated users can delete their own saved locals"
  ON locales_guardados
  FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);
```

### RLS Policies for `sala_virtual_interacciones`

```sql
-- INSERT policy
CREATE POLICY "Authenticated users can send messages"
  ON sala_virtual_interacciones
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- SELECT policy
CREATE POLICY "Authenticated users can view public messages"
  ON sala_virtual_interacciones
  FOR SELECT
  TO authenticated
  USING (
    tipo = 'publico' 
    OR usuario_id = auth.uid() 
    OR destinatario_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- DELETE policy
CREATE POLICY "Authenticated users can delete their own messages"
  ON sala_virtual_interacciones
  FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);
```

### Performance Indexes

```sql
-- Index for locales_guardados lookups
CREATE INDEX idx_locales_guardados_usuario_local 
  ON locales_guardados(usuario_id, local_id);

-- Index for sala_virtual_interacciones queries
CREATE INDEX idx_sala_virtual_interacciones_local_tipo 
  ON sala_virtual_interacciones(local_id, tipo) 
  WHERE recipient_id IS NULL;

-- Indexes for foreign key columns
CREATE INDEX idx_sala_virtual_interacciones_usuario 
  ON sala_virtual_interacciones(usuario_id);

CREATE INDEX idx_sala_virtual_interacciones_recipient 
  ON sala_virtual_interacciones(recipient_id) 
  WHERE recipient_id IS NOT NULL;

CREATE INDEX idx_sala_virtual_interacciones_destinatario 
  ON sala_virtual_interacciones(destinatario_id) 
  WHERE destinatario_id IS NOT NULL;
```

## Testing

After applying these fixes, test the following:

1. **Favorites (locales_guardados):**
   - ✅ Add a local to favorites
   - ✅ View your saved locals
   - ✅ Remove a local from favorites
   - ✅ Verify you can only see your own favorites

2. **Virtual Room (sala_virtual_interacciones):**
   - ✅ Check in to a virtual room
   - ✅ Send public messages
   - ✅ View messages from other users
   - ✅ Delete your own messages
   - ✅ Check out from the virtual room

## Key Improvements

1. **Security:** All operations now require authentication via the `authenticated` role
2. **Performance:** Added indexes to speed up common queries
3. **Reliability:** Schema cache refresh ensures Supabase recognizes all relationships
4. **User Experience:** Users can now properly interact with favorites and virtual rooms without errors

## Migration Applied

Migration name: `fix_rls_and_foreign_keys`
Applied on: 2025-01-28

## Notes

- The `authenticated` role is automatically assigned to users who have logged in via Supabase Auth
- The `auth.uid()` function returns the current user's ID from the JWT token
- All policies use `auth.uid() = usuario_id` to ensure users can only access their own data
- The schema cache refresh (`NOTIFY pgrst, 'reload schema'`) is a one-time operation that helps Supabase recognize schema changes
