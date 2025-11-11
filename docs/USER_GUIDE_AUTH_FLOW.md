
# User Guide: Authentication and Mode Management

## For End Users

### First Time Login

1. **Sign Up/Login**
   - Choose Google Sign-In or email/password
   - Complete authentication

2. **Accept Terms**
   - Review and accept Terms & Conditions
   - Review and accept Privacy Policy
   - Accept cookie usage
   - All three must be accepted to continue

3. **Complete Profile**
   - **Step 1: Basic Information** (Required)
     - Full name
     - Username (unique, 3+ characters, letters/numbers/dots/underscores only)
     - Date of birth (must be 13+ years old)
   
   - **Step 2: Optional Information**
     - Profile photo
     - Bio (150 characters max)
     - Website
     - Gender
     - Interests (select from predefined list)

4. **Start Using BarLive**
   - Explore local businesses
   - Save favorites
   - Create posts and stories
   - Connect with community

### Becoming a Business Owner (Propietario)

#### Option 1: From Welcome Screen
After first login, you'll see options to:
- Claim an existing business
- Register a new business
- Continue as a client

#### Option 2: From Profile
1. Go to your profile
2. Tap "Solicitar Modo Propietario"
3. Fill out the business information form
4. Submit request

#### Request Form:
- Business name *
- Address *
- City *
- Province *
- Phone number
- Description

#### After Submission:
- You'll receive a confirmation
- Check your verification status anytime
- Receive notifications on status changes
- Get email updates

### Tracking Your Verification

1. **View Status**
   - Go to Profile → Verification Status
   - See current status and detailed message
   - View full history of status changes

2. **Status Meanings**:
   - **Solicitud Recibida**: Your request has been received
   - **En Revisión**: Admin is reviewing your request
   - **Documentación Solicitada**: Additional documents needed
   - **Documentación Recibida**: Documents received and being reviewed
   - **Aprobada**: Congratulations! You're now a propietario
   - **Rechazada**: Request was rejected (reason provided)

3. **Notifications**:
   - In-app notifications for all status changes
   - Email notifications sent to your registered email
   - Real-time updates (no need to refresh)

### Using Propietario Mode

Once approved:
1. **Switch Modes**
   - Go to Profile
   - Tap mode switcher
   - Choose between Cliente and Propietario

2. **Propietario Features**:
   - Manage your business listing
   - Create events and promotions
   - Post job offers
   - View analytics
   - Respond to reviews
   - Access business social features

## For Administrators

### Managing Verification Requests

1. **Access Admin Panel**
   - Navigate to Admin → Gestionar Solicitudes
   - View all pending requests

2. **Review Requests**
   - See user information
   - View business details
   - Check request history
   - Filter by status
   - Search by name, email, or business

3. **Update Status**
   - Tap on a request to view details
   - Tap "Actualizar Estado"
   - Choose new status:
     - **En Revisión**: Mark as being reviewed
     - **Documentación Solicitada**: Request additional documents
     - **Documentación Recibida**: Confirm documents received
     - **Aprobada**: Approve the request
     - **Rechazada**: Reject the request
   - Add a custom message for the user
   - If rejecting, provide a reason (required)
   - Submit update

4. **Automatic Actions**:
   - User receives in-app notification
   - Email sent to user
   - Status history recorded
   - If approved: User role updated to propietario

### Best Practices

1. **Communication**:
   - Always provide clear, helpful messages
   - Explain what's needed if requesting documents
   - Give specific reasons for rejection
   - Be professional and courteous

2. **Response Time**:
   - Review requests within 24-48 hours
   - Update status regularly to keep users informed
   - Use intermediate statuses to show progress

3. **Verification**:
   - Verify business ownership
   - Check business legitimacy
   - Ensure compliance with platform policies
   - Request additional documentation if needed

## Troubleshooting

### For Users

**Can't accept terms?**
- Make sure all three checkboxes are checked
- Try refreshing the page
- Contact support if issue persists

**Username already taken?**
- Try a different username
- Add numbers or underscores
- Must be unique across platform

**Request status not updating?**
- Pull down to refresh
- Check your internet connection
- Notifications may take a few seconds

**Didn't receive email?**
- Check spam folder
- Verify email address in profile
- Contact support to resend

### For Admins

**Can't see requests?**
- Verify admin role in database
- Check RLS policies
- Refresh the page

**Status update failed?**
- Check internet connection
- Verify required fields are filled
- Check console for errors

**Email not sending?**
- Verify email configuration in `utils/email.ts`
- Check Supabase email settings
- Review error logs

## Support

Need help?
- **Users**: Tap "Contactar Soporte" in the app
- **Admins**: Check logs in Supabase dashboard
- **Developers**: Review `docs/AUTH_FLOW_IMPLEMENTATION.md`

## Privacy & Security

- All personal data is encrypted
- Terms acceptance is recorded with timestamp
- Verification requests are private
- Only admins can view all requests
- Users can only see their own data
- Email addresses are never shared publicly
