
# 🔥 Configuración Manual de Firebase y Keystore para Android

## ⚠️ IMPORTANTE
Este proceso requiere que ejecutes comandos en tu terminal local. Natively no puede ejecutar comandos de terminal por ti.

---

## 📋 Requisitos Previos

1. **Archivo Firebase descargado:**
   - Debes tener el archivo JSON de Firebase FCM V1 (Service Account)
   - Normalmente se llama algo como: `barlive-firebase-adminsdk-xxxxx.json`

2. **EAS CLI instalado:**
   ```bash
   npm install -g eas-cli
   ```

3. **Sesión iniciada en Expo:**
   ```bash
   eas login
   ```

---

## 🔑 PASO 1: Generar Keystore de Android

### Opción A: Dejar que EAS genere el Keystore automáticamente (RECOMENDADO)

```bash
# EAS generará y gestionará el keystore por ti
eas build:configure
```

Cuando te pregunte sobre el keystore, selecciona:
- **"Generate new keystore"** (Generar nuevo keystore)

EAS creará y almacenará el keystore de forma segura en sus servidores.

### Opción B: Generar Keystore manualmente (Avanzado)

Si prefieres generar el keystore tú mismo:

```bash
# Genera un keystore con keytool (viene con Java JDK)
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore barlive-release.keystore \
  -alias barlive-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass TU_PASSWORD_SEGURO \
  -keypass TU_PASSWORD_SEGURO \
  -dname "CN=BarLive, OU=Mobile, O=BarLive, L=Madrid, ST=Madrid, C=ES"
```

**Importante:** Guarda el archivo `barlive-release.keystore` en un lugar seguro y **NUNCA** lo subas a Git.

---

## 📤 PASO 2: Subir el Keystore a EAS (Solo si generaste manualmente)

Si generaste el keystore manualmente en el Paso 1B, súbelo a EAS:

```bash
eas credentials
```

Luego:
1. Selecciona **Android**
2. Selecciona **Production**
3. Selecciona **Keystore: Set up a new keystore**
4. Selecciona **Upload existing keystore**
5. Proporciona la ruta al archivo `.keystore`
6. Ingresa el password del keystore
7. Ingresa el alias de la key
8. Ingresa el password de la key

---

## 🔥 PASO 3: Subir el archivo JSON de Firebase a EAS

### 3.1. Coloca el archivo en tu proyecto

1. Copia tu archivo JSON de Firebase al directorio raíz de tu proyecto
2. Renómbralo a `google-services.json` (si no lo está ya)

```bash
# Ejemplo:
cp ~/Downloads/barlive-firebase-adminsdk-xxxxx.json ./google-services.json
```

### 3.2. Verifica que app.json apunte al archivo

Tu `app.json` ya está configurado correctamente:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json",
      "package": "com.barlive.app"
    }
  }
}
```

### 3.3. Sube las credenciales de Firebase a EAS

```bash
eas credentials
```

Luego:
1. Selecciona **Android**
2. Selecciona **Production** (o **Development** si estás en desarrollo)
3. Selecciona **FCM: Manage your FCM Api Key**
4. Selecciona **Set up FCM V1 credentials**
5. Proporciona la ruta a tu archivo JSON: `./google-services.json`

EAS leerá el archivo y extraerá las credenciales necesarias.

---

## 🏗️ PASO 4: Construir la APK/AAB con EAS

### Para Development Build (APK para pruebas):

```bash
eas build --profile development --platform android
```

### Para Production Build (AAB para Google Play):

```bash
eas build --profile production --platform android
```

---

## ✅ PASO 5: Verificar la configuración

Después de construir, verifica que las notificaciones funcionen:

1. Instala la APK/AAB en un dispositivo físico Android
2. Abre la app
3. Acepta los permisos de notificaciones
4. Envía una notificación de prueba desde Firebase Console:
   - Ve a Firebase Console → Cloud Messaging
   - Crea una nueva campaña
   - Selecciona tu app Android
   - Envía la notificación

---

## 🔍 Comandos útiles de EAS

```bash
# Ver todas las credenciales configuradas
eas credentials

# Ver el estado de tus builds
eas build:list

# Ver detalles de un build específico
eas build:view [BUILD_ID]

# Ver logs de un build
eas build:logs [BUILD_ID]
```

---

## 📝 Notas Importantes

1. **Keystore:** Si pierdes el keystore, no podrás actualizar tu app en Google Play. Guárdalo de forma segura.

2. **google-services.json:** Este archivo contiene información sensible. Añádelo a `.gitignore`:
   ```
   google-services.json
   ```

3. **FCM V1 vs Legacy:** Asegúrate de usar FCM V1 (Service Account JSON), no la API Key legacy.

4. **Permisos:** Tu `app.json` ya tiene los permisos necesarios configurados.

5. **Testing:** Las notificaciones push NO funcionan en Expo Go. Debes usar un Development Build o Production Build.

---

## 🆘 Solución de Problemas

### "No se reciben notificaciones"

1. Verifica que el `package` en `app.json` coincida con el de Firebase Console
2. Verifica que hayas subido el archivo JSON correcto a EAS
3. Verifica que la app tenga permisos de notificaciones
4. Verifica que estés usando un build de EAS, no Expo Go

### "Error al subir credenciales"

1. Verifica que el archivo JSON sea válido (ábrelo en un editor de texto)
2. Verifica que sea el archivo de Service Account, no el `google-services.json` de la app
3. Intenta con `eas credentials --clear-cache` y vuelve a intentar

### "Keystore inválido"

1. Verifica que el password sea correcto
2. Verifica que el alias sea correcto
3. Verifica que el archivo no esté corrupto

---

## 📚 Recursos Adicionales

- [Documentación oficial de EAS Build](https://docs.expo.dev/build/introduction/)
- [Configuración de FCM en Expo](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Guía de Keystores en Android](https://developer.android.com/studio/publish/app-signing)

---

## ✨ Resumen de Comandos

```bash
# 1. Instalar EAS CLI (si no lo tienes)
npm install -g eas-cli

# 2. Iniciar sesión
eas login

# 3. Configurar el proyecto
eas build:configure

# 4. Subir credenciales de Firebase
eas credentials
# → Android → Production → FCM → Set up FCM V1 → Proporcionar ruta a google-services.json

# 5. Construir la app
eas build --profile production --platform android

# 6. Verificar el build
eas build:list
```

---

**¡Listo!** Sigue estos pasos en tu terminal y tendrás las notificaciones push configuradas correctamente.
