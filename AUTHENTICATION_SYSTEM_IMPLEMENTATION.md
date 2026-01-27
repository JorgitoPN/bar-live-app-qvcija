
# BarLive Authentication System Implementation

## Overview
This document describes the complete authentication system for BarLive, which has been migrated from Google OAuth to a pure email/password authentication system using Supabase Auth.

## Key Features

### 1. Email/Password Authentication
- **Registration**: Users register with email, password, and name
- **Email Verification**: Users must verify their email before logging in
- **Login**: Standard email/password login
- **Password Recovery**: Users can reset their password via email

### 2. Google OAuth Migration
- **Automatic Detection**: System detects users who registered with Google
- **Password Setup**: Google users are prompted to set a password
- **Role Preservation**: All roles, privileges, and data are preserved during migration
- **Seamless Transition**: After setting password, users can login with email/password

### 3. Security Features
- **Email Verification**: Required before account activation
- **Password Requirements**: Minimum 8 characters
- **Secure Storage**: Passwords hashed by Supabase Auth
- **Session Management**: Automatic token refresh and session persistence
- **RLS Policies**: Row Level Security on all tables

## Database Schema

### usuarios Table
```sql
- id (uuid, primary key, references auth.users)
- email (text, unique)
- nombre (text)
- avatar (text, nullable)
- rol_app (text: 'cliente', 'propietario', 'admin')
- provider (text: 'barlive', 'google')
- email_verified (boolean, default: false)
- verification_code (text, nullable)
- verification_code_expires_at (timestamptz, nullable)
- activo (boolean, default: true)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### Key Indexes
- `idx_usuarios_email`: Fast email lookups
- `idx_usuarios_provider`: Filter by authentication provider
- `idx_usuarios_email_verified`: Filter by verification status

## Authentication Flow

### Registration Flow
1. User enters email, password, and name
2. System checks if email already exists
3. If email exists with Google provider, redirect to password setup
4. Create user in Supabase Auth
5. Trigger automatically creates user in usuarios table
6. Send verification email with 6-digit code
7. User verifies email with code
8. Account activated, user can login

### Login Flow
1. User enters email and password
2. System checks if user exists
3. If user has Google provider, redirect to password setup
4. If email not verified, redirect to verification
5. Authenticate with Supabase Auth
6. Load user profile from usuarios table
7. Navigate to main app

### Google User Migration Flow
1. Google user attempts to login
2. System detects provider = 'google'
3. Redirect to password setup screen
4. User sets new password
5. Update Supabase Auth password
6. Update provider to 'barlive' in usuarios table
7. User can now login with email/password

### Password Recovery Flow
1. User enters email
2. System checks if user exists
3. If Google user, redirect to password setup
4. Send password reset email via Supabase Auth
5. User clicks link in email
6. User sets new password
7. User can login with new password

## Social Network Features

### 1. Unified Feed (Home)
- **Content**: Posts from users and businesses
- **Ordering**: By date or relevance
- **Visual Distinction**: Clear indicators for user vs business posts
- **Interactions**: Likes, comments, shares (all stored in Supabase)
- **Real-time Updates**: Via Supabase Realtime subscriptions

### 2. Social Screen
- **Posts**: User and business content
- **Stories**: Ephemeral 24-hour stories
- **Avatar Sync**: Consistent avatars across stories, profiles, and social screen
- **Trending Hashtags**: Discover popular content
- **Filters**: Show posts from followed users/businesses

### 3. Favorites Screen
- **Quick Access**: Saved businesses
- **Personalized List**: User's favorited businesses
- **Data Source**: `locales_guardados` table

### 4. Profile Screen
- **User Identity**: Avatar, name, bio
- **Content**: User's posts
- **Social**: Followers and following counts
- **Settings**: Profile configuration

## Data Tables

### Social Network Tables
- **posts**: User and business posts
- **likes**: Post likes
- **comentarios**: Post comments
- **historias**: 24-hour stories
- **historia_views**: Story views
- **historia_likes**: Story likes
- **seguidores**: User follow relationships
- **locales_guardados**: Saved businesses
- **notificaciones**: User notifications

### Authentication Tables
- **auth.users**: Supabase Auth users (managed by Supabase)
- **usuarios**: Extended user profiles (managed by app)

## Security Considerations

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:
- Users can view their own data
- Users can view public data
- Users can only modify their own data
- Admin users have elevated permissions

### Password Security
- Passwords are hashed by Supabase Auth (bcrypt)
- Never stored in plain text
- Minimum 8 characters required
- Password reset via secure email link

### Email Verification
- Required before account activation
- 6-digit OTP code
- 10-minute expiration
- Resend capability with cooldown

### Session Management
- Automatic token refresh
- Secure session storage (SecureStore on mobile)
- Session persistence across app restarts
- Automatic logout on token expiration

## API Integration

### Supabase Auth API
- `signUp()`: Create new user
- `signInWithPassword()`: Login with email/password
- `signOut()`: Logout user
- `resetPasswordForEmail()`: Send password reset email
- `updateUser()`: Update user password/metadata
- `getSession()`: Get current session
- `onAuthStateChange()`: Listen for auth events

### Supabase Database API
- `from('usuarios').select()`: Query users
- `from('usuarios').insert()`: Create user profile
- `from('usuarios').update()`: Update user profile
- `from('posts').select()`: Query posts
- `from('historias').select()`: Query stories

### Supabase Realtime API
- Subscribe to table changes
- Real-time post updates
- Real-time story updates
- Real-time notification updates

## Edge Functions

### send-verification-email
Sends verification emails with OTP codes:
- **Input**: email, code, type
- **Output**: success/error
- **Provider**: Resend (or configured email service)

## Migration Guide for Existing Users

### For Google OAuth Users
1. Attempt to login with email
2. System detects Google provider
3. Redirected to password setup screen
4. Set new password (minimum 8 characters)
5. Password saved to Supabase Auth
6. Provider updated to 'barlive'
7. Can now login with email/password

### Data Preservation
- All user data is preserved
- Roles and privileges maintained
- Posts, stories, and interactions intact
- Followers and following relationships preserved
- Saved businesses and favorites maintained

## Testing Checklist

### Registration
- [ ] Register with valid email/password
- [ ] Verify email with code
- [ ] Login after verification
- [ ] Attempt login before verification (should fail)
- [ ] Resend verification code
- [ ] Register with existing email (should fail)

### Login
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Login with unverified email (should fail)
- [ ] Login with Google user (should redirect to password setup)

### Password Recovery
- [ ] Request password reset
- [ ] Receive reset email
- [ ] Reset password via email link
- [ ] Login with new password

### Google Migration
- [ ] Google user attempts login
- [ ] Redirected to password setup
- [ ] Set new password
- [ ] Login with new credentials
- [ ] Verify all data preserved

### Social Features
- [ ] Create post
- [ ] Like post
- [ ] Comment on post
- [ ] Create story
- [ ] View story
- [ ] Follow user
- [ ] Unfollow user
- [ ] Save business
- [ ] View notifications

## Troubleshooting

### Common Issues

**Issue**: Email verification not received
- **Solution**: Check spam folder, resend code, verify email service configuration

**Issue**: Login fails after verification
- **Solution**: Ensure email_verified is true in usuarios table, check Supabase Auth session

**Issue**: Google user can't login
- **Solution**: Redirect to password setup screen, ensure provider is updated after password set

**Issue**: Password reset email not received
- **Solution**: Check spam folder, verify email service configuration, check Supabase Auth settings

**Issue**: Social feed not loading
- **Solution**: Check RLS policies, verify user session, check network connectivity

## Future Enhancements

### Planned Features
- [ ] Two-factor authentication (2FA)
- [ ] Social login with Apple
- [ ] Biometric authentication (Face ID/Touch ID)
- [ ] Email change with verification
- [ ] Account deletion
- [ ] Export user data
- [ ] Privacy settings
- [ ] Block/report users

### Performance Optimizations
- [ ] Implement caching for user profiles
- [ ] Optimize database queries with indexes
- [ ] Implement pagination for posts/stories
- [ ] Add image optimization for avatars
- [ ] Implement lazy loading for social feed

## Support

For issues or questions:
- Check this documentation
- Review Supabase Auth documentation
- Check application logs
- Contact development team

## Version History

### v1.0.0 (Current)
- Initial implementation
- Email/password authentication
- Google OAuth migration
- Social network features
- Email verification
- Password recovery
