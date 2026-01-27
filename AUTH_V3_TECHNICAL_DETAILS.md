
# Authentication System 3.0 - Technical Implementation Details

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     BarLive Auth 3.0                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   Frontend   │◄────►│  Supabase    │                   │
│  │   (React     │      │  Auth        │                   │
│  │   Native)    │      │              │                   │
│  └──────────────┘      └──────────────┘                   │
│         │                      │                           │
│         │                      │                           │
│         ▼                      ▼                           │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │  Auth        │      │  PostgreSQL  │                   │
│  │  Context     │◄────►│  (usuarios)  │                   │
│  └──────────────┘      └──────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Structure

### 1. Authentication Screens

#### Login Screen (`app/auth/login.tsx`)

**Purpose:** Email/password login

**Key Features:**
- Email validation
- Password input
- Forgot password link
- Registration link
- Google user detection

**Flow:**
```typescript
handleLogin() {
  1. Validate email format
  2. Check if user exists in database
  3. Check provider type
     - If 'google': Redirect to password setup
     - If 'barlive': Continue
  4. Check email verification
  5. Sign in with Supabase Auth
  6. Navigate to main app
}
```

#### Registration Screen (`app/auth/registro-email.tsx`)

**Purpose:** New user registration

**Key Features:**
- Name input
- Email validation
- Password validation (min 8 chars)
- Password confirmation
- Terms acceptance
- Duplicate email check

**Flow:**
```typescript
handleRegister() {
  1. Validate all fields
  2. Check for existing email
     - If exists with Google: Redirect to password setup
     - If exists with BarLive: Redirect to login
  3. Create user in Supabase Auth
  4. Trigger creates user in usuarios table
  5. Send verification email
  6. Navigate to verification screen
}
```

#### Google Migration Screen (`app/auth/crear-password-google.tsx`)

**Purpose:** Migrate Google users to email/password

**Key Features:**
- Email display (read-only)
- Password setup
- Password confirmation
- Migration explanation
- Data preservation guarantee

**Flow:**
```typescript
handleSetPassword() {
  1. Validate password
  2. Get user from database
  3. Update provider to 'barlive'
  4. Mark email as verified
  5. Create/update password in Supabase Auth
  6. Navigate to login
}
```

### 2. Authentication Utilities (`utils/auth.ts`)

#### Core Functions

**signUpWithBarLive()**
```typescript
Purpose: Register new user with email/password
Input: email, password, nombre
Output: { user: AuthUser | null, error: string | null }

Process:
1. Validate inputs
2. Call Supabase Auth signUp
3. Wait for trigger to create profile
4. Return user object
```

**signInWithBarLive()**
```typescript
Purpose: Login existing user
Input: email, password
Output: { user: AuthUser | null, error: string | null }

Process:
1. Validate inputs
2. Call Supabase Auth signInWithPassword
3. Fetch user profile from database
4. Return user object with all data
```

**getCurrentUser()**
```typescript
Purpose: Get currently authenticated user
Input: none
Output: { user: AuthUser | null, error: string | null }

Process:
1. Get auth user from Supabase
2. Fetch profile from database
3. Merge auth and profile data
4. Return complete user object
```

**resetPassword()**
```typescript
Purpose: Send password reset email
Input: email
Output: { error: string | null }

Process:
1. Validate email
2. Call Supabase Auth resetPasswordForEmail
3. Return success/error
```

### 3. Authentication Context (`contexts/AuthContext.tsx`)

**Purpose:** Global authentication state management

**State:**
```typescript
{
  user: AuthUser | null,
  session: Session | null,
  loading: boolean,
  signOut: () => Promise<void>,
  refreshUser: () => Promise<void>
}
```

**Lifecycle:**
```typescript
useEffect(() => {
  1. Initialize auth state
  2. Get current session
  3. Load user profile
  4. Register push notifications
  5. Listen for auth state changes
     - SIGNED_IN: Load user profile
     - SIGNED_OUT: Clear user state
     - TOKEN_REFRESHED: Update session
     - USER_UPDATED: Refresh user data
}, [])
```

## Database Schema

### usuarios Table

```sql
CREATE TABLE usuarios (
  -- Identity
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  
  -- Authentication
  provider TEXT CHECK (provider IN ('barlive', 'google')),
  email_verified BOOLEAN DEFAULT false,
  verification_code TEXT,
  verification_code_expires_at TIMESTAMPTZ,
  password_hash TEXT, -- Managed by Supabase Auth
  
  -- Profile
  avatar TEXT,
  bio TEXT,
  username TEXT UNIQUE,
  telefono TEXT,
  fecha_nacimiento DATE,
  sitio_web TEXT,
  genero TEXT,
  
  -- Role & Permissions
  rol_app TEXT DEFAULT 'cliente' CHECK (rol_app IN ('cliente', 'propietario', 'admin')),
  activo BOOLEAN DEFAULT true,
  
  -- Social Stats
  seguidores INTEGER DEFAULT 0,
  seguidos INTEGER DEFAULT 0,
  posts INTEGER DEFAULT 0,
  
  -- Settings
  perfil_privado BOOLEAN DEFAULT false,
  permitir_etiquetas BOOLEAN DEFAULT true,
  mostrar_ubicacion BOOLEAN DEFAULT true,
  mostrar_en_linea BOOLEAN DEFAULT true,
  modo_oscuro BOOLEAN DEFAULT false,
  
  -- Metadata
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ultima_actividad TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_provider ON usuarios(provider);
CREATE INDEX idx_usuarios_email_verified ON usuarios(email_verified);
CREATE INDEX idx_usuarios_username ON usuarios(username);
```

### Migration Function

```sql
CREATE OR REPLACE FUNCTION migrate_google_user_to_barlive(
  p_user_id UUID,
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usuarios
  SET 
    provider = 'barlive',
    email_verified = true,
    updated_at = NOW()
  WHERE id = p_user_id AND email = p_email;
  
  RETURN FOUND;
END;
$$;
```

### Monitoring View

```sql
CREATE OR REPLACE VIEW users_needing_migration AS
SELECT 
  id,
  email,
  nombre,
  rol_app,
  provider,
  email_verified,
  created_at
FROM usuarios
WHERE provider = 'google'
ORDER BY created_at DESC;
```

## Security Considerations

### Password Security

**Hashing:**
- Managed by Supabase Auth
- Uses bcrypt algorithm
- Automatic salt generation
- Configurable cost factor

**Validation:**
- Minimum 8 characters
- No maximum length (within reason)
- No special character requirements (for UX)
- Confirmation required on registration

### Email Verification

**Process:**
1. User registers
2. Verification email sent automatically
3. User clicks link or enters code
4. Email marked as verified
5. User can log in

**Security:**
- Verification codes expire
- One-time use codes
- Rate limiting on resend

### Session Management

**Token Storage:**
- Access token: Short-lived (1 hour)
- Refresh token: Long-lived (30 days)
- Stored in AsyncStorage (encrypted)

**Auto-refresh:**
- Automatic token refresh before expiry
- Seamless user experience
- No manual intervention needed

### RLS Policies

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON usuarios FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON usuarios FOR UPDATE
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON usuarios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol_app = 'admin'
  )
);
```

## Error Handling

### Common Errors

**Email Already Exists:**
```typescript
if (error.message.includes('already registered')) {
  Alert.alert('Error', 'Este correo ya está registrado');
}
```

**Invalid Credentials:**
```typescript
if (error.message.includes('Invalid login credentials')) {
  Alert.alert('Error', 'Email o contraseña incorrectos');
}
```

**Email Not Verified:**
```typescript
if (!userData.email_verified) {
  Alert.alert('Email no verificado', 'Por favor verifica tu email');
}
```

**Google User Needs Migration:**
```typescript
if (userData.provider === 'google') {
  Alert.alert('Configuración requerida', 'Configura tu contraseña');
}
```

## Performance Optimizations

### Database Queries

**Indexed Lookups:**
```sql
-- Fast email lookup
SELECT * FROM usuarios WHERE email = $1;
-- Uses idx_usuarios_email

-- Fast provider filtering
SELECT * FROM usuarios WHERE provider = 'google';
-- Uses idx_usuarios_provider
```

**Efficient Joins:**
```sql
-- Get user with all relationships
SELECT 
  u.*,
  COUNT(DISTINCT p.id) as post_count,
  COUNT(DISTINCT s1.id) as follower_count,
  COUNT(DISTINCT s2.id) as following_count
FROM usuarios u
LEFT JOIN posts p ON p.autor_id = u.id
LEFT JOIN seguidores s1 ON s1.seguido_id = u.id
LEFT JOIN seguidores s2 ON s2.seguidor_id = u.id
WHERE u.id = $1
GROUP BY u.id;
```

### Caching Strategy

**User Profile:**
- Cached in AuthContext
- Refreshed on auth state change
- Manual refresh available

**Session:**
- Cached in AsyncStorage
- Auto-loaded on app start
- Persists across app restarts

## Testing Strategy

### Unit Tests

```typescript
describe('Authentication', () => {
  test('validates email format', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid')).toBe(false);
  });
  
  test('validates password length', () => {
    expect(validatePassword('12345678')).toBe(true);
    expect(validatePassword('1234567')).toBe(false);
  });
  
  test('detects Google users', async () => {
    const user = await getUserByEmail('google@example.com');
    expect(user.provider).toBe('google');
  });
});
```

### Integration Tests

```typescript
describe('User Registration', () => {
  test('creates new user successfully', async () => {
    const result = await signUpWithBarLive(
      'new@example.com',
      'password123',
      'New User'
    );
    expect(result.user).toBeDefined();
    expect(result.error).toBeNull();
  });
  
  test('prevents duplicate email', async () => {
    await signUpWithBarLive('dup@example.com', 'pass', 'User 1');
    const result = await signUpWithBarLive('dup@example.com', 'pass', 'User 2');
    expect(result.error).toBeDefined();
  });
});
```

### E2E Tests

```typescript
describe('Login Flow', () => {
  test('complete login flow', async () => {
    // Navigate to login
    await element(by.id('login-button')).tap();
    
    // Enter credentials
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    
    // Submit
    await element(by.id('submit-button')).tap();
    
    // Verify navigation
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
```

## Monitoring & Analytics

### Key Metrics

```typescript
// Track authentication events
analytics.track('user_registered', {
  provider: 'barlive',
  timestamp: new Date(),
});

analytics.track('user_logged_in', {
  provider: 'barlive',
  timestamp: new Date(),
});

analytics.track('google_user_migrated', {
  user_id: userId,
  timestamp: new Date(),
});
```

### Error Tracking

```typescript
// Log authentication errors
logger.error('Authentication failed', {
  error: error.message,
  email: email,
  provider: 'barlive',
  timestamp: new Date(),
});
```

## Deployment Checklist

- [x] Remove Google OAuth configuration
- [x] Update login screen
- [x] Update registration screen
- [x] Create migration screen
- [x] Update auth utilities
- [x] Apply database migration
- [x] Test new user registration
- [x] Test existing user login
- [x] Test Google user migration
- [x] Test password reset
- [x] Update documentation
- [x] Create monitoring queries
- [x] Set up error tracking
- [ ] Notify existing users
- [ ] Monitor migration progress
- [ ] Provide user support

## Rollback Procedure

If issues arise, follow these steps:

1. **Restore Google OAuth:**
   ```typescript
   // Re-enable in utils/auth.ts
   export const signInWithGoogle = async () => { ... }
   ```

2. **Update UI:**
   ```typescript
   // Add Google button back to login screen
   <GoogleSignInButton onPress={handleGoogleSignIn} />
   ```

3. **Database:**
   ```sql
   -- No rollback needed, users with provider='barlive' continue working
   -- Users with provider='google' can use Google again
   ```

4. **Communication:**
   - Notify users of temporary issue
   - Provide alternative login methods
   - Set timeline for resolution

## Support Resources

### Documentation
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [React Native Auth Guide](https://reactnative.dev/docs/security)
- [BarLive Auth V3 Guide](./AUTH_V3_MIGRATION_GUIDE.md)

### Contact
- Technical Support: support@barlive.app
- Developer Docs: docs.barlive.app
- Status Page: status.barlive.app

---

**Version:** 3.0.0  
**Last Updated:** 2025-01-12  
**Status:** ✅ Production Ready
