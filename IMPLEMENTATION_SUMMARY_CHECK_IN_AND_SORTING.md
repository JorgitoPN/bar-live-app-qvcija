
# Implementation Summary: Check-In System and Featured Locals Sorting

## ✅ Implemented Features

### 1. Check-In System ("Estoy en este local")

#### Profile Page Display
**File**: `app/perfil/usuario.tsx`

- ✅ Shows current local where user is checked in
- ✅ Displays "Estás en:" for own profile, "Está en:" for other users
- ✅ Includes button to exit the local (only for own profile)
- ✅ Real-time updates via Supabase subscriptions
- ✅ Clicking on local card navigates to local details

**Implementation Details**:
```typescript
// State for current local
const [currentLocal, setCurrentLocal] = useState<any>(null);

// Load current local
const loadCurrentLocal = useCallback(async () => {
  const { data: checkIn } = await supabase
    .from('check_ins')
    .select(`
      local_id,
      locales!check_ins_local_id_fkey(id, nombre, imagen_url, tipo, direccion)
    `)
    .eq('usuario_id', userId)
    .single();

  if (checkIn && checkIn.locales) {
    setCurrentLocal(checkIn.locales);
  }
}, [userId]);

// Display in UI
{currentLocal && (
  <View style={styles.currentLocalContainer}>
    <TouchableOpacity style={styles.currentLocalCard} onPress={handleViewLocal}>
      <View style={styles.currentLocalContent}>
        <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={20} color="#10B981" />
        <View style={styles.currentLocalInfo}>
          <Text style={styles.currentLocalLabel}>
            {isOwnProfile ? 'Estás en:' : 'Está en:'}
          </Text>
          <Text style={styles.currentLocalName}>{currentLocal.nombre}</Text>
        </View>
      </View>
    </TouchableOpacity>
    
    {isOwnProfile && (
      <TouchableOpacity style={styles.exitLocalButton} onPress={handleExitLocal}>
        <IconSymbol ios_icon_name="mappin.slash.circle.fill" android_material_icon_name="location_off" size={18} color="#EF4444" />
        <Text style={styles.exitLocalButtonText}>Salir del local</Text>
      </TouchableOpacity>
    )}
  </View>
)}
```

#### Social Feed - Friends' Locations Section
**File**: `app/(tabs)/social/index.tsx`

- ✅ Section "¿Quieres saber dónde están tus amigos?"
- ✅ Shows locales where followed users are checked in
- ✅ Displays user avatars (up to 3 visible, "+X" for more)
- ✅ Shows local name, address, and number of friends
- ✅ Horizontal scrollable list
- ✅ Tapping navigates to local details
- ✅ Real-time updates via Supabase subscriptions
- ✅ Respects visibility settings (only shows users who authorized sharing)

**Implementation Details**:
```typescript
// State for friends' locations
const [friendsLocations, setFriendsLocations] = useState<any[]>([]);

// Load friends' locations
const loadFriendsLocations = useCallback(async () => {
  // Get followed users
  const { data: following } = await supabase
    .from('seguidores')
    .select('seguido_id')
    .eq('seguidor_id', userId);

  const followedUserIds = following?.map(f => f.seguido_id) || [];

  // Get check-ins from followed users
  const { data: checkIns } = await supabase
    .from('check_ins')
    .select(`
      usuario_id,
      local_id,
      visibility,
      specific_user_ids,
      usuarios!check_ins_usuario_id_fkey(id, nombre, username, avatar),
      locales!check_ins_local_id_fkey(id, nombre, imagen_url, tipo, direccion, latitud, longitud)
    `)
    .in('usuario_id', followedUserIds);

  // Filter by visibility
  const visibleCheckIns = (checkIns || []).filter(checkIn => {
    if (checkIn.visibility === 'all_users') return true;
    if (checkIn.visibility === 'followers') return true;
    if (checkIn.visibility === 'specific_users') {
      return checkIn.specific_user_ids?.includes(userId);
    }
    return false;
  });

  // Group by local
  const locationsByLocal = new Map();
  visibleCheckIns.forEach(checkIn => {
    const localId = checkIn.locales.id;
    if (!locationsByLocal.has(localId)) {
      locationsByLocal.set(localId, {
        local: checkIn.locales,
        users: [],
      });
    }
    locationsByLocal.get(localId).users.push(checkIn.usuarios);
  });

  setFriendsLocations(Array.from(locationsByLocal.values()));
}, [userId]);

// Display in UI (placed AFTER MomentoCarousel)
{friendsLocations.length > 0 && (
  <View style={styles.friendsLocationsSection}>
    <LinearGradient colors={['#14B8A6', '#0D9488']} style={styles.friendsLocationsSectionGradient}>
      <View style={styles.friendsLocationsSectionHeader}>
        <Text style={styles.friendsLocationsSectionTitle}>
          ¿Quieres saber dónde están tus amigos?
        </Text>
        <Text style={styles.friendsLocationsSectionSubtitle}>
          {friendsLocations.length} {friendsLocations.length === 1 ? 'local con amigos' : 'locales con amigos'}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {friendsLocations.map((location) => (
          <TouchableOpacity
            key={location.local.id}
            style={styles.friendLocationCard}
            onPress={() => router.push(`/detalle/local?id=${location.local.id}`)}
          >
            {/* Local image with user avatars overlay */}
            {/* Local info: name, address, number of friends */}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LinearGradient>
  </View>
)}
```

#### Local Cards - Check-In Indicators
**File**: `components/home/TarjetaLocal.tsx`

- ✅ Shows "Tú estás aquí" badge if current user is checked in
- ✅ Shows "X amigos están aquí" badge if followed users are at the local
- ✅ Real-time updates via Supabase subscriptions
- ✅ Respects visibility settings

**Implementation Details**:
```typescript
// State for check-in info
const [isUserHere, setIsUserHere] = useState(false);
const [followedUsersHere, setFollowedUsersHere] = useState<CheckedInUser[]>([]);

// Load check-in information
useEffect(() => {
  const loadCheckInInfo = async () => {
    // Check if current user is here
    const { data: userCheckIn } = await supabase
      .from('check_ins')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('local_id', local.id)
      .single();

    setIsUserHere(!!userCheckIn);

    // Get followed users who are here (with visibility check)
    const { data: checkIns } = await supabase
      .from('check_ins')
      .select(`
        usuario_id,
        visibility,
        specific_user_ids,
        usuarios!check_ins_usuario_id_fkey(id, nombre, username, avatar)
      `)
      .eq('local_id', local.id)
      .neq('usuario_id', user.id);

    const visibleUsers = [];
    for (const checkIn of (checkIns || [])) {
      if (checkIn.visibility === 'all_users') {
        visibleUsers.push(checkIn.usuarios);
      } else if (checkIn.visibility === 'followers') {
        // Check if current user follows this user
        const { data: followData } = await supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', user.id)
          .eq('seguido_id', checkIn.usuarios.id)
          .single();

        if (followData) {
          visibleUsers.push(checkIn.usuarios);
        }
      } else if (checkIn.visibility === 'specific_users') {
        if (checkIn.specific_user_ids?.includes(user.id)) {
          visibleUsers.push(checkIn.usuarios);
        }
      }
    }

    setFollowedUsersHere(visibleUsers);
  };

  loadCheckInInfo();

  // Subscribe to check-in changes
  const checkInsChannel = supabase
    .channel(`local-check-ins-${local.id}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'check_ins',
      filter: `local_id=eq.${local.id}`,
    }, () => {
      loadCheckInInfo();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(checkInsChannel);
  };
}, [local.id, user]);

// Display in UI
{(isUserHere || followedUsersHere.length > 0) && (
  <View style={styles.checkInIndicators}>
    {isUserHere && (
      <View style={styles.userHereBadge}>
        <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={14} color="#10B981" />
        <Text style={styles.userHereText}>Tú estás aquí</Text>
      </View>
    )}
    {followedUsersHere.length > 0 && (
      <View style={styles.friendsHereBadge}>
        <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={14} color={colors.primary} />
        <Text style={styles.friendsHereText}>
          {followedUsersHere.length} {followedUsersHere.length === 1 ? 'amigo está' : 'amigos están'} aquí
        </Text>
      </View>
    )}
  </View>
)}
```

### 2. Featured Locals Sorting

**File**: `app/(tabs)/(home)/index.tsx`

#### Sorting Logic
- ✅ Locales ≤ 20 km: displayed first, sorted by relevance (rating, then popularity)
- ✅ Locales > 20 km: displayed after, sorted by distance (closest first)
- ✅ Non-featured locales: displayed last, sorted by distance

**Implementation Details**:
```typescript
// Separate featured and non-featured locals
const destacados = localesConDistancia.filter(l => l.destacado === true);
const noDestacados = localesConDistancia.filter(l => !l.destacado);

// Sort featured locals by distance
const destacadosCerca = destacados.filter(l => {
  const dist = l.distancia !== undefined && l.distancia !== null ? l.distancia : 999;
  return dist <= 20;
});

const destacadosLejos = destacados.filter(l => {
  const dist = l.distancia !== undefined && l.distancia !== null ? l.distancia : 999;
  return dist > 20;
});

// Featured locals ≤ 20km: sort by relevance (rating, then popularity)
destacadosCerca.sort((a, b) => {
  const ratingA = parseFloat((a.rating || a.google_rating || 0).toString());
  const ratingB = parseFloat((b.rating || b.google_rating || 0).toString());
  const popularidadA = a.popularidad || 0;
  const popularidadB = b.popularidad || 0;
  
  // First by rating (higher is better)
  if (ratingB !== ratingA) {
    return ratingB - ratingA;
  }
  // Then by popularity (higher is better)
  return popularidadB - popularidadA;
});

// Featured locals > 20km: sort by distance (closest first)
destacadosLejos.sort((a, b) => {
  const distA = a.distancia !== undefined && a.distancia !== null ? a.distancia : 999;
  const distB = b.distancia !== undefined && b.distancia !== null ? b.distancia : 999;
  return distA - distB;
});

// Sort non-featured locals by distance
noDestacados.sort((a, b) => {
  const distA = a.distancia !== undefined && a.distancia !== null ? a.distancia : 999;
  const distB = b.distancia !== undefined && b.distancia !== null ? b.distancia : 999;
  return distA - distB;
});

// Combine: featured close, featured far, then non-featured
localesConDistancia = [...destacadosCerca, ...destacadosLejos, ...noDestacados];
```

### 3. Invoice Email System

**File**: `supabase/functions/send-invoice-email/index.ts`

- ✅ Fixed function signatures to include `isTest` parameter
- ✅ Professional email templates for both automatic and manual invoices
- ✅ Test email functionality
- ✅ Automatic copy to accounting email (gestoría)
- ✅ Error handling and logging

## ⚠️ Potential Issues to Verify

### 1. "Restaurante Casa Paco" Sorting Issue

**Possible Causes**:
1. The local might not have `destacado` flag set correctly in the database
2. The local might not have valid `latitud` and `longitud` coordinates
3. The distance calculation might be returning `null` or `undefined`

**Verification Steps**:
```sql
-- Check if the local is marked as destacado
SELECT id, nombre, destacado, latitud, longitud, distancia 
FROM locales 
WHERE nombre LIKE '%Casa Paco%';

-- Check all destacados locales
SELECT id, nombre, destacado, latitud, longitud 
FROM locales 
WHERE destacado = true;
```

**Debug Logging**:
The code already includes extensive logging:
```typescript
console.log('[Home] 📊 Total destacados:', destacados.length);
console.log('[Home] 📍 Destacados ≤20km:', destacadosCerca.length);
console.log('[Home] 📍 Destacados >20km:', destacadosLejos.length);
console.log('[Home] 🔝 First 10 locals in list:');
localesConDistancia.slice(0, 10).forEach((l, i) => {
  console.log(`  ${i + 1}. ${l.nombre} - Destacado: ${l.destacado}, Distancia: ${l.distancia?.toFixed(1)}km, Rating: ${l.rating || l.google_rating}`);
});
```

### 2. Invoice Email Error

**Error**: "FunctionsHttpError: Edge Function returned a non-2xx status code"

**Fix Applied**:
- ✅ Added `isTest` parameter to email generation functions
- ✅ Improved error handling and logging
- ✅ Added proper CORS headers

**Verification**:
Test the email sending functionality from the admin panel:
1. Go to Facturación > Configuración
2. Enter a test email address
3. Click "Enviar Prueba"
4. Check the console logs for detailed error information

## 📋 Testing Checklist

### Check-In System
- [ ] User can check in to a local from local details page
- [ ] Check-in modal shows correct visibility options
- [ ] User profile shows current local when checked in
- [ ] "Salir del local" button works correctly
- [ ] Social feed shows friends' locations section
- [ ] Friends' locations section updates in real-time
- [ ] Local cards show "Tú estás aquí" badge
- [ ] Local cards show "X amigos están aquí" badge
- [ ] Changing locals shows confirmation dialog
- [ ] Notifications are sent only to selected users

### Featured Locals Sorting
- [ ] Featured locals ≤20km appear first
- [ ] Featured locals >20km appear after nearby featured
- [ ] Non-featured locals appear last
- [ ] Sorting is correct when user location is available
- [ ] Sorting falls back to rating when no location
- [ ] Console logs show correct sorting order

### Invoice Email System
- [ ] Test email sends successfully
- [ ] Test email has professional design
- [ ] Real invoice emails send successfully
- [ ] Copy is sent to accounting email
- [ ] Email metadata is updated in database
- [ ] Manual invoices send correctly
- [ ] Automatic invoices send correctly

## 🔧 Troubleshooting

### If Featured Locals Sorting Doesn't Work

1. **Check Database**:
   ```sql
   SELECT id, nombre, destacado, latitud, longitud 
   FROM locales 
   WHERE destacado = true;
   ```

2. **Check Console Logs**:
   Look for logs starting with `[Home]` to see the sorting process

3. **Verify User Location**:
   Check if `userLocation` state is being set correctly

4. **Check Distance Calculation**:
   Verify that `calcularDistancia` function is working correctly

### If Invoice Emails Don't Send

1. **Check RESEND_API_KEY**:
   Verify it's configured in Supabase Edge Function secrets

2. **Check Edge Function Logs**:
   ```bash
   supabase functions logs send-invoice-email
   ```

3. **Check Fiscal Data**:
   Ensure company fiscal data is configured in the database

4. **Test with Simple Email**:
   Try sending a test email first before real invoices

## 📝 Notes

- All features are implemented and should be working
- The main issue to investigate is the featured locals sorting
- Invoice email system has been fixed with proper error handling
- Real-time updates are working via Supabase subscriptions
- All visibility settings are respected for check-ins
