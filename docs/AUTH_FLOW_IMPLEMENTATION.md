
# Authentication Flow and Mode Management Implementation

## Overview
This document describes the complete implementation of the login flow, mode management (Cliente/Propietario), and verification progress tracking system for BarLive.

## Features Implemented

### 1. Database Schema
**File:** `supabase/migrations/20240120_auth_and_verification_system.sql`

#### New Tables:
- **terms_acceptance**: Tracks user acceptance of terms, privacy policy, and cookies
- **propietario_requests**: Stores owner verification requests with detailed status tracking
- **verification_status_history**: Tracks all status changes for verification requests
- **notifications**: In-app notifications for users

#### Updated Tables:
- **usuarios**: Added fields for profile completion, terms acceptance, and verification tracking

#### Key Features:
- Row Level Security (RLS) policies for all tables
- Automatic triggers for status tracking and notifications
- Real-time updates via Supabase subscriptions
- Email notifications on status changes

### 2. Authentication Flow

#### Login Process:
1. **User logs in** (Google or email/password)
2. **Terms Acceptance** (`/auth/terms-acceptance`)
   - User must accept terms, privacy policy, and cookies
   - Recorded in `terms_acceptance` table
3. **Profile Completion** (`/auth/completar-perfil`)
   - New users complete their profile (name, username, date of birth, etc.)
   - Optional: avatar, bio, interests
4. **Main App** - User is redirected to explore screen

#### Files:
- `app/auth/terms-acceptance.tsx` - Terms acceptance screen
- `app/auth/completar-perfil.tsx` - Profile completion screen (already exists)
- `contexts/AuthContext.tsx` - Updated to handle new flow

### 3. Mode Management

#### User Modes:
- **Cliente**: Default mode for all users
- **Propietario**: For business owners (requires approval)
- **Admin**: For administrators

#### Mode Switching:
- Users can switch between available modes from their profile
- Mode is persisted in AsyncStorage
- Context: `contexts/ModeContext.tsx`

### 4. Propietario Request System

#### Request Flow:
1. **User requests propietario mode** (`/solicitudes/solicitar-rol-propietario`)
   - Choose between "reclamar" (claim existing) or "nuevo" (new business)
   - Provide business details
2. **Admin reviews request** (`/admin/gestionar-solicitudes`)
   - View all pending requests
   - Update status with detailed messages
   - Approve or reject requests
3. **User receives notifications**
   - In-app notifications
   - Email notifications
4. **Status tracking** (`/auth/propietario-request-status`)
   - Real-time status updates
   - Full history of status changes

#### Status Flow:
```
pendiente → en_revision → documentacion_solicitada → documentacion_recibida → aprobada/rechazada
```

#### Files:
- `app/solicitudes/solicitar-rol-propietario.tsx` - Request form (already exists)
- `app/auth/propietario-request-status.tsx` - Status tracking screen
- `app/admin/gestionar-solicitudes.tsx` - Admin panel for managing requests

### 5. Verification Progress Tracking

#### Real-time Updates:
- Users can view their verification status in real-time
- Status changes trigger notifications
- Full history of status changes is maintained

#### Notification System:
- In-app notifications for status changes
- Email notifications sent automatically
- Notifications table with RLS policies

### 6. Admin Panel

#### Features:
- View all propietario requests
- Filter by status
- Search by user name, email, or business name
- Update request status with custom messages
- Approve/reject requests
- View request history

#### File:
- `app/admin/gestionar-solicitudes.tsx`

## Integration Points

### AuthContext Updates:
- Check for terms acceptance before allowing app access
- Check for profile completion
- Redirect to appropriate screen based on user state

### Profile Screen:
- Show verification status if user has requested propietario mode
- Allow mode switching for approved propietarios
- Link to request status screen

### Notifications:
- Real-time notifications for verification status changes
- Email notifications via `utils/email.ts`

## Database Functions

### get_user_verification_status(user_id UUID)
Returns the current verification status for a user:
- has_request: boolean
- request_id: UUID
- estado: text
- estado_detalle: text
- created_at: timestamp
- updated_at: timestamp
- can_request: boolean

## Security

### Row Level Security (RLS):
- Users can only view their own requests and notifications
- Admins can view and update all requests
- Proper authentication checks on all operations

### Data Validation:
- Username uniqueness check
- Age verification (minimum 13 years)
- Required fields validation

## User Experience

### Smooth Transitions:
- Animated progress bars
- Loading states
- Refresh controls
- Modal dialogs for important actions

### Clear Communication:
- Status badges with colors
- Detailed status messages
- Timeline view of status changes
- Help sections with support links

## Testing Checklist

- [ ] New user signup flow
- [ ] Terms acceptance
- [ ] Profile completion
- [ ] Propietario request submission
- [ ] Admin request review
- [ ] Status updates and notifications
- [ ] Email notifications
- [ ] Mode switching
- [ ] Real-time updates
- [ ] RLS policies

## Future Enhancements

1. **Document Upload**: Allow users to upload verification documents
2. **WebSockets**: Replace polling with WebSockets for real-time updates
3. **Push Notifications**: Mobile push notifications for status changes
4. **Admin Dashboard**: Analytics and metrics for verification requests
5. **Automated Verification**: AI-powered document verification
6. **Multi-language Support**: Translate all screens and notifications

## API Endpoints

### Supabase Functions:
- `get_user_verification_status(user_id)` - Get verification status
- Triggers for automatic status tracking and notifications

### Email Service:
- `sendEmail(to, subject, body)` - Send email notifications

## Environment Variables

No additional environment variables required. Uses existing Supabase configuration.

## Migration

To apply the database changes:
```bash
# Run the migration
supabase db push

# Or apply manually in Supabase dashboard
# Copy contents of supabase/migrations/20240120_auth_and_verification_system.sql
```

## Support

For issues or questions:
- Check the logs in the console
- Review RLS policies in Supabase dashboard
- Test with different user roles
- Verify email configuration in `utils/email.ts`
