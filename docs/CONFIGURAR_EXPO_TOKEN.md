
# Configuración de EXPO_TOKEN

## ¿Qué es EXPO_TOKEN?

`EXPO_TOKEN` es una variable de entorno necesaria para que Expo Go y los servicios de EAS (Expo Application Services) funcionen correctamente. Este token autentica tu aplicación con los servidores de Expo.

## ¿Por qué lo necesitas?

Sin el `EXPO_TOKEN` configurado, puedes experimentar:
- Errores al iniciar la app en Expo Go
- Problemas de autenticación con servicios de Expo
- Fallos en la sincronización de actualizaciones

## Cómo obtener tu EXPO_TOKEN

### Opción 1: Desde la web de Expo (Recomendado)

1. Ve a [https://expo.dev](https://expo.dev)
2. Inicia sesión en tu cuenta de Expo
3. Ve a **Settings** → **Access Tokens**
4. Haz clic en **Create Token**
5. Dale un nombre descriptivo (ej: "BarLive Development")
6. Copia el token generado

### Opción 2: Desde la línea de comandos

```bash
# Primero, inicia sesión en Expo
npx expo login

# Verifica que estás autenticado
npx eas whoami

# El token se guardará automáticamente en tu sistema
```

## Cómo configurar el EXPO_TOKEN

### En tu archivo .env local

Abre tu archivo `.env` y añade la línea:

```env
EXPO_TOKEN=tu_token_aquí
```

**Ejemplo completo del archivo .env:**

```env
# Expo Token - Required for Expo Go and EAS services
EXPO_TOKEN=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz

EXPO_PUBLIC_SUPABASE_URL=https://embntaqwlwmgazvrglaf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Places API Key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=AIzaSyB6HYuMFvVkxhnvnul3QwZJo5tTNrb2Ov8
```

### En tu infraestructura de producción

Si estás usando servicios de CI/CD o hosting, configura la variable de entorno `EXPO_TOKEN` en:

#### Vercel
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Añade `EXPO_TOKEN` con tu token

#### Netlify
1. Ve a tu sitio en Netlify
2. Site settings → Environment variables
3. Añade `EXPO_TOKEN` con tu token

#### GitHub Actions
En tu archivo `.github/workflows/main.yml`:

```yaml
env:
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

Y añade el token en GitHub:
1. Settings → Secrets and variables → Actions
2. New repository secret
3. Name: `EXPO_TOKEN`, Value: tu token

#### Docker / Kubernetes
Añade la variable de entorno en tu configuración:

```yaml
env:
  - name: EXPO_TOKEN
    value: "tu_token_aquí"
```

## Verificación

Después de configurar el token, verifica que funciona:

```bash
# Reinicia el servidor de desarrollo
npm run dev

# O con Expo CLI
npx expo start --clear
```

Si todo está configurado correctamente, la app debería iniciar sin errores relacionados con autenticación de Expo.

## Seguridad

⚠️ **IMPORTANTE:**
- **NUNCA** compartas tu `EXPO_TOKEN` públicamente
- **NUNCA** lo subas a repositorios públicos de Git
- Asegúrate de que `.env` está en tu `.gitignore`
- Rota el token periódicamente desde la configuración de Expo
- Usa diferentes tokens para desarrollo y producción

## Solución de problemas

### El token no funciona
- Verifica que copiaste el token completo sin espacios
- Asegúrate de que el token no ha expirado
- Genera un nuevo token si es necesario

### Errores de autenticación persisten
```bash
# Limpia la caché de Expo
npx expo start --clear

# O limpia completamente
rm -rf node_modules .expo
npm install
```

### Token en Natively
Según la documentación del proyecto, Natively debería configurar automáticamente el `EXPO_TOKEN`. Si estás usando Natively y experimentas problemas:

1. Verifica que Natively tiene acceso a tu cuenta de Expo
2. Revisa los logs de Natively para errores de autenticación
3. Contacta con el soporte de Natively si el problema persiste

## Referencias

- [Expo Access Tokens Documentation](https://docs.expo.dev/accounts/programmatic-access/)
- [Environment Variables in Expo](https://docs.expo.dev/guides/environment-variables/)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
