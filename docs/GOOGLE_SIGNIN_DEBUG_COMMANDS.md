
# Comandos de Debugging para Google Sign-In

## Obtener SHA-1 Fingerprints

### Android Debug Keystore
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

### Android Release Keystore
```bash
keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias | grep SHA1
```

### Encontrar tu Release Keystore
```bash
# Buscar en el proyecto
find . -name "*.keystore" -o -name "*.jks"

# Ubicación común
ls -la ~/keystores/
ls -la android/app/
```

## Limpiar y Rebuild

### Limpiar Caché de Expo
```bash
npx expo start --clear
```

### Limpiar Caché de Metro
```bash
npx react-native start --reset-cache
```

### Limpiar Caché de Gradle (Android)
```bash
cd android
./gradlew clean
cd ..
```

### Limpiar Caché de CocoaPods (iOS)
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Rebuild Completo
```bash
# Limpiar todo
rm -rf node_modules
rm -rf android
rm -rf ios
rm -rf .expo

# Reinstalar
npm install

# Prebuild
npx expo prebuild --clean

# Run
npx expo run:android
# o
npx expo run:ios
```

## Verificar Configuración

### Ver Variables de Entorno
```bash
cat .env
```

### Ver app.json
```bash
cat app.json | grep -A 20 "android"
cat app.json | grep -A 20 "ios"
```

### Ver Package Name/Bundle ID
```bash
# Android
cat android/app/build.gradle | grep applicationId

# iOS
cat ios/BarLive/Info.plist | grep -A 1 CFBundleIdentifier
```

## Logs en Tiempo Real

### Logs de Android
```bash
# Todos los logs
adb logcat

# Solo logs de la app
adb logcat | grep "com.barlive.app"

# Solo logs de Google Auth
adb logcat | grep "Google"

# Limpiar y ver logs
adb logcat -c && adb logcat
```

### Logs de iOS
```bash
# Abrir Console.app en Mac
open /Applications/Utilities/Console.app

# O usar xcrun
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "BarLive"'
```

### Logs de Expo
```bash
# Ver logs en terminal
npx expo start

# Ver logs en navegador
# Abre http://localhost:19002 y ve a la pestaña "Logs"
```

## Verificar Conectividad

### Verificar Conexión a Supabase
```bash
curl https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/health
```

### Verificar Conexión a Google
```bash
curl https://accounts.google.com/.well-known/openid-configuration
```

## Testing de Deep Links

### Android
```bash
# Probar deep link
adb shell am start -W -a android.intent.action.VIEW -d "natively://auth/callback?access_token=test&refresh_token=test" com.barlive.app

# Probar con Supabase URL
adb shell am start -W -a android.intent.action.VIEW -d "https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback" com.barlive.app
```

### iOS
```bash
# Probar deep link en simulador
xcrun simctl openurl booted "natively://auth/callback?access_token=test&refresh_token=test"

# Probar con Supabase URL
xcrun simctl openurl booted "https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback"
```

## Verificar Instalación de Paquetes

### Ver versiones instaladas
```bash
npm list @supabase/supabase-js
npm list expo-web-browser
npm list expo-auth-session
npm list expo-linking
```

### Verificar que no hay conflictos
```bash
npm ls
```

## Debugging de Supabase

### Probar conexión con Supabase
```bash
# Crear archivo test.js
cat > test-supabase.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log('Testing Supabase connection...');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'natively://auth/callback',
      skipBrowserRedirect: true,
    },
  });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! OAuth URL:', data.url);
  }
}

test();
EOF

# Ejecutar test
node test-supabase.js

# Limpiar
rm test-supabase.js
```

## Verificar Estado de Google Cloud

### Verificar que la API está habilitada
```bash
# Necesitas gcloud CLI instalado
gcloud services list --enabled --project=YOUR_PROJECT_ID | grep people
```

## Monitoreo en Tiempo Real

### Ver todos los logs relevantes simultáneamente
```bash
# En una terminal
npx expo start

# En otra terminal (Android)
adb logcat | grep -E "(Google|Auth|Supabase)"

# En otra terminal (iOS)
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "BarLive"' | grep -E "(Google|Auth|Supabase)"
```

## Comandos de Emergencia

### Si nada funciona, resetear todo
```bash
#!/bin/bash

echo "🧹 Limpiando todo..."

# Limpiar node_modules
rm -rf node_modules
rm -rf package-lock.json

# Limpiar caché de Expo
rm -rf .expo
rm -rf .expo-shared

# Limpiar builds nativos
rm -rf android
rm -rf ios

# Limpiar caché de Metro
rm -rf /tmp/metro-*
rm -rf /tmp/haste-*

# Reinstalar
echo "📦 Reinstalando dependencias..."
npm install

# Prebuild
echo "🔨 Rebuilding..."
npx expo prebuild --clean

echo "✅ Listo! Ahora ejecuta:"
echo "  npx expo run:android"
echo "  o"
echo "  npx expo run:ios"
```

Guarda este script como `reset-all.sh` y ejecútalo con:
```bash
chmod +x reset-all.sh
./reset-all.sh
```

## Verificar Configuración Final

```bash
#!/bin/bash

echo "🔍 Verificando configuración..."

echo "\n📱 App Configuration:"
echo "  Package (Android): $(cat android/app/build.gradle 2>/dev/null | grep applicationId | awk '{print $2}' | tr -d '"')"
echo "  Bundle ID (iOS): $(cat ios/BarLive/Info.plist 2>/dev/null | grep -A 1 CFBundleIdentifier | tail -1 | sed 's/.*<string>\(.*\)<\/string>/\1/')"

echo "\n🔑 Environment Variables:"
echo "  SUPABASE_URL: ${EXPO_PUBLIC_SUPABASE_URL:0:30}..."
echo "  SUPABASE_KEY: ${EXPO_PUBLIC_SUPABASE_ANON_KEY:0:30}..."

echo "\n📦 Dependencies:"
npm list @supabase/supabase-js expo-web-browser expo-auth-session expo-linking --depth=0

echo "\n✅ Verificación completa!"
```

Guarda este script como `verify-config.sh` y ejecútalo con:
```bash
chmod +x verify-config.sh
./verify-config.sh
```
