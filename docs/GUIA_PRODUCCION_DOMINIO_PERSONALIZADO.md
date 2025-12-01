
# 🚀 Guía Completa: BarLive en Producción con Dominio Personalizado

Esta guía te llevará paso a paso desde la compra de un dominio hasta tener tu app BarLive completamente funcional en producción para usuarios finales.

---

## 📋 Índice

1. [Registro y Configuración del Dominio](#1-registro-y-configuración-del-dominio)
2. [Configuración de Hosting Web](#2-configuración-de-hosting-web)
3. [Configuración de DNS](#3-configuración-de-dns)
4. [Configuración de Supabase](#4-configuración-de-supabase)
5. [Configuración de la App Móvil](#5-configuración-de-la-app-móvil)
6. [Build y Deploy de la App](#6-build-y-deploy-de-la-app)
7. [Publicación en App Store y Google Play](#7-publicación-en-app-store-y-google-play)
8. [Verificación Final](#8-verificación-final)
9. [Mantenimiento Post-Lanzamiento](#9-mantenimiento-post-lanzamiento)

---

## 1. Registro y Configuración del Dominio

### 1.1 Comprar el Dominio

**Opciones de Registradores Recomendados:**
- **Namecheap** (recomendado para España): https://www.namecheap.com
- **GoDaddy**: https://www.godaddy.com/es
- **Google Domains** (ahora Squarespace): https://domains.squarespace.com
- **Cloudflare Registrar**: https://www.cloudflare.com/products/registrar/

**Pasos:**
1. Ve al sitio web del registrador de tu elección
2. Busca el dominio que deseas (ejemplo: `barlive.es`, `barlive.app`, `barlive.com`)
3. Verifica disponibilidad
4. Completa la compra (precio típico: 10-15€/año para .com, 8-12€/año para .es)
5. Guarda las credenciales de acceso al panel de control

**💡 Recomendaciones:**
- Elige un dominio corto y fácil de recordar
- Considera `.app` para aplicaciones móviles (requiere HTTPS obligatorio)
- `.es` es ideal si tu público objetivo es España
- Activa la protección de privacidad WHOIS (suele ser gratis)

---

## 2. Configuración de Hosting Web

Para tu app BarLive necesitas hosting para:
- Página web de marketing/landing page
- Páginas de confirmación de email
- Políticas de privacidad y términos de servicio

### 2.1 Opciones de Hosting Recomendadas

#### Opción A: Vercel (Recomendado - Gratis para empezar)

**Ventajas:**
- Gratis para proyectos personales
- SSL automático
- Deploy automático desde GitHub
- Excelente rendimiento global

**Pasos:**
1. Ve a https://vercel.com
2. Crea una cuenta (puedes usar GitHub)
3. Haz clic en "Add New Project"
4. Conecta tu repositorio de GitHub (si tienes uno)
5. O sube los archivos manualmente

#### Opción B: Netlify (Alternativa gratuita)

**Pasos:**
1. Ve a https://www.netlify.com
2. Crea una cuenta
3. Arrastra y suelta tu carpeta de archivos web
4. Netlify te dará una URL temporal

#### Opción C: Cloudflare Pages (Gratis y rápido)

**Pasos:**
1. Ve a https://pages.cloudflare.com
2. Crea una cuenta
3. Conecta tu repositorio o sube archivos
4. Deploy automático

### 2.2 Crear Páginas Esenciales

Necesitas crear estas páginas web básicas:

**Estructura mínima:**
```
/
├── index.html (Landing page)
├── email-confirmed.html (Confirmación de email)
├── auth/
│   └── callback.html (Callback de autenticación)
├── legal/
│   ├── privacidad.html
│   └── terminos.html
└── 404.html (Página de error)
```

---

## 3. Configuración de DNS

### 3.1 Configurar DNS en tu Registrador

Una vez que tengas tu hosting configurado, necesitas apuntar tu dominio a él.

#### Si usas Vercel:

1. En Vercel, ve a tu proyecto → Settings → Domains
2. Añade tu dominio personalizado (ejemplo: `barlive.es`)
3. Vercel te mostrará los registros DNS que necesitas configurar

**Registros DNS típicos para Vercel:**
```
Tipo: A
Nombre: @
Valor: 76.76.21.21

Tipo: CNAME
Nombre: www
Valor: cname.vercel-dns.com
```

#### Si usas Netlify:

**Registros DNS típicos para Netlify:**
```
Tipo: A
Nombre: @
Valor: 75.2.60.5

Tipo: CNAME
Nombre: www
Valor: [tu-sitio].netlify.app
```

#### Si usas Cloudflare Pages:

1. Transfiere tus nameservers a Cloudflare (recomendado)
2. O añade registros CNAME en tu registrador actual

### 3.2 Configurar los Registros DNS

**En tu registrador de dominio:**

1. Inicia sesión en tu cuenta del registrador
2. Busca "DNS Management" o "Gestión de DNS"
3. Añade los registros que te proporcionó tu hosting:

**Ejemplo para Namecheap:**
```
1. Ve a Domain List → Manage
2. Haz clic en "Advanced DNS"
3. Añade los registros A y CNAME
4. Guarda los cambios
```

**⏰ Tiempo de propagación:** 
- Los cambios DNS pueden tardar de 5 minutos a 48 horas
- Normalmente se completan en 1-2 horas
- Puedes verificar con: https://dnschecker.org

---

## 4. Configuración de Supabase

### 4.1 Configurar Site URL

1. Ve a tu proyecto Supabase: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Ve a **Authentication → URL Configuration**
3. Configura el **Site URL**:

```
https://tudominio.com
```

**Ejemplo para BarLive:**
```
https://barlive.es
```

### 4.2 Configurar Redirect URLs

En la misma sección, añade estas **Redirect URLs** (URLs permitidas):

```
# Producción Web
https://barlive.es/email-confirmed
https://barlive.es/auth/callback
https://barlive.es/auth/*

# Producción App Móvil
barlive://auth/callback
barlive://email-confirmed

# Desarrollo (mantener para testing)
http://localhost:19006/auth/callback
exp://localhost:8081/email-confirmed
```

**💡 Nota:** Reemplaza `barlive` con el nombre de tu dominio real.

### 4.3 Configurar Deep Linking Scheme

El esquema `barlive://` debe coincidir con tu configuración en `app.json`:

```json
{
  "expo": {
    "scheme": "barlive",
    "ios": {
      "bundleIdentifier": "com.tuempresa.barlive"
    },
    "android": {
      "package": "com.tuempresa.barlive"
    }
  }
}
```

### 4.4 Configurar Email Templates

1. Ve a **Authentication → Email Templates**
2. Configura las plantillas:

#### Template: Confirm Signup

**Subject:** `Confirma tu email - BarLive`

**Body:**
```html
<h2>¡Bienvenido a BarLive!</h2>
<p>Hola,</p>
<p>Gracias por registrarte en BarLive. Por favor confirma tu dirección de email haciendo clic en el botón de abajo:</p>
<p><a href="{{ .ConfirmationURL }}" style="background-color: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Confirmar Email</a></p>
<p>O copia y pega este enlace en tu navegador:</p>
<p>{{ .ConfirmationURL }}</p>
<p>Este enlace expirará en 24 horas.</p>
<p>Si no creaste esta cuenta, puedes ignorar este email.</p>
<p>Saludos,<br>El equipo de BarLive</p>
```

#### Template: Reset Password

**Subject:** `Restablece tu contraseña - BarLive`

**Body:**
```html
<h2>Restablecer Contraseña</h2>
<p>Hola,</p>
<p>Recibimos una solicitud para restablecer tu contraseña de BarLive.</p>
<p><a href="{{ .ConfirmationURL }}" style="background-color: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Restablecer Contraseña</a></p>
<p>O copia y pega este enlace en tu navegador:</p>
<p>{{ .ConfirmationURL }}</p>
<p>Este enlace expirará en 1 hora.</p>
<p>Si no solicitaste restablecer tu contraseña, puedes ignorar este email.</p>
<p>Saludos,<br>El equipo de BarLive</p>
```

### 4.5 Configurar Email Settings

1. Ve a **Authentication → Settings**
2. Activa estas opciones:
   - ✅ **Enable email confirmations**
   - ✅ **Secure email change**
   - ✅ **Double confirm email changes**

3. Configura el **Email Rate Limit**: 3-4 emails por hora (para evitar spam)

---

## 5. Configuración de la App Móvil

### 5.1 Actualizar Variables de Entorno

Crea o actualiza tu archivo `.env`:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://embntaqwlwmgazvrglaf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui

# Producción
EXPO_PUBLIC_SITE_URL=https://barlive.es
EXPO_PUBLIC_API_URL=https://barlive.es/api

# Deep Linking
EXPO_PUBLIC_SCHEME=barlive
```

### 5.2 Actualizar app.json

```json
{
  "expo": {
    "name": "BarLive",
    "slug": "barlive",
    "version": "1.0.0",
    "scheme": "barlive",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a1a"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.tuempresa.barlive",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "NSCameraUsageDescription": "BarLive necesita acceso a tu cámara para subir fotos.",
        "NSPhotoLibraryUsageDescription": "BarLive necesita acceso a tus fotos para subir imágenes."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#1a1a1a"
      },
      "package": "com.tuempresa.barlive",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/images/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 34,
            "targetSdkVersion": 34,
            "buildToolsVersion": "34.0.0"
          },
          "ios": {
            "deploymentTarget": "13.4"
          }
        }
      ]
    ],
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "tu-project-id-aqui"
      }
    }
  }
}
```

### 5.3 Actualizar Código de Autenticación

Asegúrate de que todos los archivos de autenticación usen el dominio correcto:

**app/auth/registro-email.tsx:**
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://barlive.es/email-confirmed'
  }
});
```

**app/auth/recuperar-password.tsx:**
```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://barlive.es/auth/callback'
});
```

---

## 6. Build y Deploy de la App

### 6.1 Instalar EAS CLI

```bash
npm install -g eas-cli
```

### 6.2 Configurar EAS

```bash
eas login
eas build:configure
```

Esto creará un archivo `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 6.3 Build para Android

```bash
# Build de producción
eas build --platform android --profile production

# Esto generará un .aab (Android App Bundle)
```

### 6.4 Build para iOS

```bash
# Build de producción
eas build --platform ios --profile production

# Necesitarás una cuenta de Apple Developer ($99/año)
```

**⏰ Tiempo de build:** 10-20 minutos por plataforma

---

## 7. Publicación en App Store y Google Play

### 7.1 Google Play Store

#### Requisitos:
- Cuenta de Google Play Developer ($25 pago único)
- Archivo .aab generado por EAS
- Íconos y screenshots
- Descripción de la app
- Política de privacidad (URL pública)

#### Pasos:

1. **Crear cuenta de desarrollador:**
   - Ve a https://play.google.com/console
   - Paga la tarifa de $25
   - Completa tu perfil

2. **Crear nueva aplicación:**
   - Haz clic en "Crear aplicación"
   - Nombre: BarLive
   - Idioma predeterminado: Español
   - Tipo: Aplicación o juego
   - Categoría: Social o Estilo de vida

3. **Completar información:**
   - **Descripción corta** (80 caracteres):
     ```
     Descubre los mejores bares y discotecas cerca de ti
     ```
   
   - **Descripción completa** (4000 caracteres):
     ```
     BarLive es tu guía definitiva para descubrir la mejor vida nocturna.
     
     🍺 Encuentra bares y discotecas cerca de ti
     🎉 Descubre eventos y promociones especiales
     ⭐ Lee reseñas de otros usuarios
     📸 Comparte tus experiencias
     🗺️ Explora con nuestro mapa interactivo
     
     Con BarLive, nunca te perderás la mejor fiesta de la ciudad.
     ```

4. **Subir assets gráficos:**
   - Ícono: 512x512 px
   - Feature graphic: 1024x500 px
   - Screenshots: mínimo 2, máximo 8 (teléfono y tablet)
   - Video promocional (opcional)

5. **Configurar contenido:**
   - Clasificación de contenido
   - Público objetivo
   - Política de privacidad: `https://barlive.es/legal/privacidad`

6. **Subir el .aab:**
   - Ve a "Producción" → "Crear nueva versión"
   - Sube el archivo .aab
   - Completa las notas de la versión
   - Enviar para revisión

**⏰ Tiempo de revisión:** 1-7 días

### 7.2 Apple App Store

#### Requisitos:
- Cuenta de Apple Developer ($99/año)
- Archivo .ipa generado por EAS
- Íconos y screenshots
- Descripción de la app
- Política de privacidad (URL pública)

#### Pasos:

1. **Crear cuenta de desarrollador:**
   - Ve a https://developer.apple.com
   - Inscríbete en el programa ($99/año)
   - Completa tu perfil

2. **Configurar App Store Connect:**
   - Ve a https://appstoreconnect.apple.com
   - Haz clic en "My Apps" → "+"
   - Selecciona "New App"

3. **Información de la app:**
   - Nombre: BarLive
   - Idioma principal: Español
   - Bundle ID: com.tuempresa.barlive
   - SKU: barlive-001

4. **Completar metadata:**
   - **Descripción** (4000 caracteres)
   - **Palabras clave** (100 caracteres):
     ```
     bares,discotecas,fiesta,eventos,vida nocturna,ocio
     ```
   - **URL de soporte**: `https://barlive.es/soporte`
   - **URL de marketing**: `https://barlive.es`
   - **Política de privacidad**: `https://barlive.es/legal/privacidad`

5. **Subir screenshots:**
   - iPhone 6.7": 1290x2796 px (mínimo 3)
   - iPhone 6.5": 1242x2688 px (mínimo 3)
   - iPad Pro 12.9": 2048x2732 px (opcional)

6. **Subir el build:**
   - EAS automáticamente sube el build a TestFlight
   - En App Store Connect, selecciona el build
   - Completa la información de versión
   - Enviar para revisión

**⏰ Tiempo de revisión:** 1-3 días

---

## 8. Verificación Final

### 8.1 Checklist Pre-Lanzamiento

- [ ] **Dominio:**
  - [ ] Dominio comprado y activo
  - [ ] DNS configurado correctamente
  - [ ] SSL/HTTPS funcionando
  - [ ] Páginas web accesibles

- [ ] **Supabase:**
  - [ ] Site URL configurado
  - [ ] Redirect URLs añadidas
  - [ ] Email templates configurados
  - [ ] Email settings activados
  - [ ] RLS policies habilitadas en todas las tablas

- [ ] **App Móvil:**
  - [ ] Variables de entorno actualizadas
  - [ ] Deep linking configurado
  - [ ] Builds de producción generados
  - [ ] Probado en dispositivos reales

- [ ] **Stores:**
  - [ ] Cuenta de Google Play creada
  - [ ] Cuenta de Apple Developer creada
  - [ ] Metadata completada
  - [ ] Screenshots subidos
  - [ ] Apps enviadas para revisión

### 8.2 Pruebas de Funcionalidad

**Prueba estos flujos críticos:**

1. **Registro de usuario:**
   - [ ] Registro con email/password
   - [ ] Email de confirmación recibido
   - [ ] Link de confirmación funciona
   - [ ] Redirección correcta después de confirmar

2. **Login:**
   - [ ] Login con credenciales correctas
   - [ ] Manejo de errores (email no confirmado, password incorrecta)
   - [ ] Persistencia de sesión

3. **Recuperación de contraseña:**
   - [ ] Email de recuperación recibido
   - [ ] Link de recuperación funciona
   - [ ] Cambio de contraseña exitoso

4. **Deep Linking:**
   - [ ] Links desde emails abren la app
   - [ ] Redirección correcta dentro de la app

5. **Funcionalidades principales:**
   - [ ] Búsqueda de locales
   - [ ] Visualización de detalles
   - [ ] Creación de publicaciones
   - [ ] Sistema de favoritos
   - [ ] Notificaciones

---

## 9. Mantenimiento Post-Lanzamiento

### 9.1 Monitoreo

**Herramientas recomendadas:**

1. **Supabase Dashboard:**
   - Monitorea uso de base de datos
   - Revisa logs de autenticación
   - Verifica rate limits

2. **Google Play Console:**
   - Estadísticas de instalación
   - Reportes de crashes
   - Reseñas de usuarios

3. **App Store Connect:**
   - Estadísticas de descargas
   - Reportes de crashes
   - Reseñas de usuarios

4. **Analytics (opcional):**
   - Google Analytics
   - Mixpanel
   - Amplitude

### 9.2 Actualizaciones

**Proceso de actualización:**

1. Hacer cambios en el código
2. Incrementar versión en `app.json`:
   ```json
   {
     "version": "1.0.1",
     "ios": {
       "buildNumber": "1.0.1"
     },
     "android": {
       "versionCode": 2
     }
   }
   ```
3. Generar nuevos builds:
   ```bash
   eas build --platform all --profile production
   ```
4. Subir a las stores
5. Esperar aprobación

### 9.3 Backup y Seguridad

**Recomendaciones:**

1. **Backups de Supabase:**
   - Configura backups automáticos diarios
   - Descarga backups manualmente cada semana

2. **Código fuente:**
   - Usa Git y GitHub/GitLab
   - Haz commits frecuentes
   - Usa branches para features

3. **Seguridad:**
   - Revisa logs de Supabase regularmente
   - Actualiza dependencias mensualmente
   - Monitorea intentos de acceso sospechosos

---

## 📞 Soporte y Recursos

### Documentación Oficial:
- **Expo:** https://docs.expo.dev
- **Supabase:** https://supabase.com/docs
- **React Native:** https://reactnative.dev

### Comunidades:
- **Expo Discord:** https://chat.expo.dev
- **Supabase Discord:** https://discord.supabase.com
- **Stack Overflow:** Etiquetas `expo`, `supabase`, `react-native`

### Contacto de Emergencia:
- **Supabase Support:** support@supabase.io
- **Expo Support:** https://expo.dev/support

---

## ✅ Resumen de Costos

| Servicio | Costo | Frecuencia |
|----------|-------|------------|
| Dominio | €10-15 | Anual |
| Hosting Web (Vercel/Netlify) | Gratis | - |
| Supabase | Gratis (hasta cierto límite) | Mensual |
| Google Play Developer | $25 | Único |
| Apple Developer | $99 | Anual |
| **TOTAL PRIMER AÑO** | **~€130** | - |
| **TOTAL AÑOS SIGUIENTES** | **~€110/año** | - |

---

## 🎉 ¡Felicidades!

Si has seguido todos estos pasos, tu app BarLive debería estar:
- ✅ Funcionando en tu dominio personalizado
- ✅ Configurada correctamente en Supabase
- ✅ Publicada en Google Play Store
- ✅ Publicada en Apple App Store
- ✅ Lista para usuarios finales

**¡Tu app está en producción! 🚀**

---

## 📝 Notas Finales

- **Paciencia:** El proceso completo puede tomar 1-2 semanas
- **Testing:** Prueba exhaustivamente antes de lanzar
- **Feedback:** Escucha a tus primeros usuarios
- **Iteración:** Mejora continuamente basándote en feedback

**¿Preguntas?** Consulta la documentación oficial o las comunidades mencionadas arriba.
