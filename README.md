# BarLive

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.

---

## 🔧 Storage Configuration (Expo Go Compatible)

### ✅ Current Setup: AsyncStorage Mode

The app is now configured to use **AsyncStorage** for Expo Go compatibility. This resolves the `NitroModules are not supported in Expo Go!` error.

### Storage Architecture

The storage system is **modular** and supports two backends:

1. **AsyncStorage** (Current - Expo Go Compatible)
   - ✅ Works in Expo Go
   - ✅ Cross-platform (iOS, Android, Web)
   - ⚠️ Slower performance (async operations)
   - 📱 Perfect for development and testing

2. **MMKV** (Future - Production Builds)
   - ❌ Requires Development Build (not Expo Go)
   - ✅ 10-30x faster than AsyncStorage
   - ✅ Synchronous operations
   - 🚀 Recommended for production

### How to Switch Between Storage Backends

**File:** `src/lib/supabaseStorage.ts`

```typescript
// 🔧 CONFIGURATION: Set to true to use MMKV (requires Development Build)
// Set to false to use AsyncStorage (works in Expo Go)
const USE_MMKV = false; // ← Change this to true for production
```

### Files Modified

1. **`src/lib/supabaseStorage.ts`** - Main storage adapter
   - Added `USE_MMKV` configuration flag
   - Conditional MMKV initialization
   - Added async methods for AsyncStorage compatibility
   - Exported `storageInfo` for runtime checks

2. **`utils/supabase.ts`** - Supabase client
   - Updated initialization logs
   - Uses `supabaseStorage` adapter

3. **`utils/testMMKV.ts`** - Storage tests
   - Updated to work with both backends
   - Renamed functions to be storage-agnostic
   - Added async/await support

### Benefits of This Approach

✅ **Expo Go Compatible** - Works immediately without native builds  
✅ **Modular Design** - One-line change to switch storage backends  
✅ **Future-Proof** - Easy migration to MMKV for production  
✅ **No Breaking Changes** - All existing code continues to work  
✅ **Type-Safe** - Full TypeScript support

### Storage API

The storage API is consistent regardless of backend:

```typescript
import { supabaseStorage } from '@/src/lib/supabaseStorage';

// All methods are async and work with both backends
await supabaseStorage.getItem('key');
await supabaseStorage.setItem('key', 'value');
await supabaseStorage.removeItem('key');
```

### Troubleshooting

**Error: "NitroModules are not supported in Expo Go!"**
- ✅ Fixed! Make sure `USE_MMKV = false` in `src/lib/supabaseStorage.ts`

**Slow performance in development**
- ⚠️ Expected with AsyncStorage
- 🚀 Enable MMKV in production builds for 10-30x speed improvement

**Session not persisting**
- ✅ Both backends support session persistence
- Check that Supabase client is using `supabaseStorage`
