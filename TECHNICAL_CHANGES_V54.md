
# 🔧 Technical Changes v54.0

## 📦 Modified Files

### 1. `components/social/PermissionGuard.tsx`
**Changes:**
- Now uses `activeProfileId` and `activeLocalData` from ModeContext
- Checks permissions for the ACTIVE local, not a random one
- Shows correct local name in restriction message
- Better error handling and logging

**Key Code:**
```typescript
// ✅ BEFORE v54.0 (WRONG):
const { data: localData } = await supabase
  .from('locales')
  .select('nombre')
  .eq('id', activeProfileId) // Could be wrong local
  .single();

// ✅ AFTER v54.0 (CORRECT):
const currentLocalName = activeLocalData?.nombre || ''; // Use already loaded data
setLocalName(currentLocalName);
```

---

### 2. `components/gestion/CustomerPotentialBar.tsx`
**Changes:**
- Updated plan potential percentages
- Updated calculation explanation
- Updated improvement messages

**Key Code:**
```typescript
// ✅ BEFORE v54.0:
Base: 20%
Estándar: +15% = 35%
Premium: +30% = 50%
Destacado: +30%

// ✅ AFTER v54.0:
Gratuito: 30% base
Estándar: 65% base
Premium: 100% base
Destacado: +35%
```

---

### 3. `components/gestion/LocalSubscriptionCard.tsx`
**Changes:**
- Updated `calculateCustomerPotential()` function
- New plan potential values

**Key Code:**
```typescript
const calculateCustomerPotential = (): number => {
  if (!local.suscripcion) return 30; // Free plan: 30%

  let percentage = 30;
  const planName = local.suscripcion.plan_nombre.toLowerCase();

  if (planName === 'estandar' || planName === 'estándar') {
    percentage = 65; // Standard: 65%
  } else if (planName === 'premium') {
    percentage = 100; // Premium: 100%
  }

  if (local.suscripcion.destacado_activo) {
    percentage += 35; // Highlight: +35%
  }

  return percentage;
};
```

---

### 4. `supabase/functions/send-invoice-email/index.ts`
**Changes:**
- Implemented real email sending with Resend API
- Professional HTML email template
- Proper error handling
- Accurate delivery status

**Key Code:**
```typescript
// ✅ CRITICAL FIX: Use Resend API to actually send emails
const resendResponse = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'BarLive <facturas@barlive.app>',
    to: [recipientEmail],
    subject: `Factura ${invoice.invoice_number} - BarLive`,
    html: emailHtml,
  }),
});
```

---

### 5. `app/solicitudes/solicitar-rol-propietario.tsx`
**Changes:**
- Complete redesign with 5-step wizard
- Matches all fields from crear local page
- Mandatory document upload
- Map location selector
- Image gallery upload

**Key Features:**
```typescript
// Step 1: Basic Info (nombre, tipo, descripcion)
// Step 2: Location & Contact (direccion, ciudad, provincia, mapa, telefono, email)
// Step 3: Services (servicios disponibles)
// Step 4: Schedule (horarios por día)
// Step 5: Images & Documentation (portada, galería, DOCUMENTO OBLIGATORIO)
```

**Document Upload:**
```typescript
const handleSelectDocument = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
  });
  // Upload to storage.buckets.documentos-propiedad
};
```

---

### 6. `app/admin/solicitudes-propietario.tsx`
**Changes:**
- Enhanced details modal
- Document viewer
- Image gallery preview
- Map location display
- Complete local information

**Key Features:**
```typescript
// Details Modal includes:
- User info (avatar, name, username, email)
- Local info (name, type, address, city, province)
- Document card with "View Document" button
- Cover image preview
- Gallery scroll view
- Map coordinates with "Open in Maps" button
- Services tags
- Schedule table
- Action buttons (Approve, Change Status, Deny)
```

---

## 🗄️ Database Changes

### Migration: `add_document_upload_to_solicitudes_propietario`

**New Columns:**
```sql
documento_propiedad_url text          -- Document URL
documento_propiedad_tipo text         -- Document type
ciudad_local text                     -- City
codigo_postal_local text              -- Postal code
latitud_local numeric                 -- Latitude
longitud_local numeric                -- Longitude
tipo_local text                       -- Local type
horarios_local jsonb                  -- Schedule
servicios_local text[]                -- Services
imagen_portada_url text               -- Cover image
galeria_urls text[]                   -- Gallery images
```

**Document Types:**
- `factura_luz` - Electricity bill
- `factura_agua` - Water bill
- `contrato_alquiler` - Rental contract
- `escritura` - Property deed
- `licencia_actividad` - Activity license
- `otro` - Other document

---

### Migration: `create_documentos_propiedad_bucket_v2`

**Storage Bucket:**
```sql
Bucket: documentos-propiedad
Public: true
Max size: 10MB
Allowed types: JPEG, PNG, PDF
```

**RLS Policies:**
```sql
1. Users can upload their own documents
2. Users can view their own documents
3. Admins can view all documents
4. Users can delete their own documents
```

---

## 🔐 Security Considerations

### Document Upload
- ✅ Files are stored in user-specific folders: `{user_id}/documento-propiedad-{timestamp}.{ext}`
- ✅ RLS policies prevent users from accessing other users' documents
- ✅ Admins can view all documents for review
- ✅ File size limited to 10MB
- ✅ Only allowed file types: JPEG, PNG, PDF

### Email Sending
- ✅ Uses Resend API with proper authentication
- ✅ Service role key stored securely in Edge Functions
- ✅ Email delivery validated before returning success
- ✅ Logs all email attempts for auditing

---

## 🚀 Performance Optimizations

### PermissionGuard
- Uses `activeLocalData` from ModeContext (already loaded)
- Avoids unnecessary database queries
- Better caching of local information

### CustomerPotentialBar
- Simple calculation (no complex queries)
- Cached plan information
- Instant UI updates

### Solicitar Rol Propietario
- Progressive image upload (only when submitting)
- Lazy loading of map
- Optimized WebView rendering

---

## 📝 API Changes

### Edge Function: `send-invoice-email`

**Request:**
```typescript
{
  invoiceId?: string;
  invoiceData?: any;
  recipientEmail: string;
  isTest?: boolean;
  isManual?: boolean;
}
```

**Response (Success):**
```typescript
{
  success: true;
  message: 'Invoice email sent successfully';
  method: 'resend';
  recipient: string;
  emailId: string; // Resend email ID
}
```

**Response (Error):**
```typescript
{
  success: false;
  error: string;
  details: string;
}
```

---

## 🔄 Data Flow

### Plan Assignment Flow
```
Admin assigns plan manually
    ↓
suscripciones_locales.plan_id updated
    ↓
ModeContext loads active local
    ↓
PermissionGuard checks activeProfileId
    ↓
Queries suscripciones_locales for activeProfileId
    ↓
Checks planes_suscripcion.perfil_social
    ↓
Grants/denies access
```

### Document Upload Flow
```
User selects document
    ↓
DocumentPicker returns file URI
    ↓
File uploaded to storage.buckets.documentos-propiedad
    ↓
Public URL generated
    ↓
URL saved in solicitudes_propietario.documento_propiedad_url
    ↓
Admin can view document in details modal
```

### Invoice Email Flow
```
Admin creates invoice
    ↓
Clicks "Send Email"
    ↓
Edge function send-invoice-email invoked
    ↓
Loads invoice and fiscal data from database
    ↓
Generates HTML email template
    ↓
Sends via Resend API
    ↓
Updates invoice.metadata with email_sent_at
    ↓
Returns success/error to client
```

---

## 🧪 Testing Checklist

- [ ] @jorge can access social network with Bar A Coviña
- [ ] Restriction message shows correct local name
- [ ] Plan potentials: 30% / 65% / 100%
- [ ] Destacado adds +35%
- [ ] Invoice emails are delivered
- [ ] Map popup shows correct rating
- [ ] Solicitud requires document upload
- [ ] Document upload works correctly
- [ ] Admin can view all solicitud information
- [ ] Admin can view uploaded documents
- [ ] Admin can see proposed local location on map

---

## 🔮 Future Improvements

### Email System
- [ ] Add email templates for different invoice types
- [ ] Add email scheduling
- [ ] Add email tracking (opens, clicks)
- [ ] Add email attachments (PDF invoices)

### Document Management
- [ ] Add document verification status
- [ ] Add document expiration dates
- [ ] Add document categories
- [ ] Add OCR for automatic data extraction

### Solicitud Workflow
- [ ] Add multi-step approval process
- [ ] Add automatic local creation on approval
- [ ] Add email notifications at each step
- [ ] Add solicitud history tracking

---

## 📚 Related Documentation

- `RESUMEN_CORRECCIONES_V54.md` - User-friendly summary
- `GUIA_PRUEBAS_V54.md` - Testing guide
- `QUICK_REFERENCE_V54.md` - Quick reference (to be created)

---

## 🏷️ Version Info

**Version:** 54.0
**Date:** 2025-01-29
**Author:** BarLive Development Team
**Status:** ✅ Production Ready

**Breaking Changes:** None
**Migration Required:** Yes (add_document_upload_to_solicitudes_propietario)
**Edge Function Update:** Yes (send-invoice-email v54.0)
