
# ✅ Checklist Rápido: BarLive a Producción

## 🌐 Dominio (Día 1)
- [ ] Comprar dominio en Namecheap/GoDaddy
- [ ] Anotar credenciales de acceso
- [ ] Activar protección WHOIS

## 🖥️ Hosting Web (Día 1-2)
- [ ] Crear cuenta en Vercel/Netlify
- [ ] Crear páginas esenciales:
  - [ ] `index.html` (landing page)
  - [ ] `email-confirmed.html`
  - [ ] `auth/callback.html`
  - [ ] `legal/privacidad.html`
  - [ ] `legal/terminos.html`
- [ ] Deploy inicial

## 🔗 DNS (Día 2-3)
- [ ] Obtener registros DNS de tu hosting
- [ ] Configurar registros A y CNAME en registrador
- [ ] Esperar propagación (1-48 horas)
- [ ] Verificar con https://dnschecker.org
- [ ] Confirmar HTTPS funcionando

## 🔐 Supabase (Día 3)
- [ ] Configurar Site URL: `https://tudominio.com`
- [ ] Añadir Redirect URLs:
  - [ ] `https://tudominio.com/email-confirmed`
  - [ ] `https://tudominio.com/auth/callback`
  - [ ] `https://tudominio.com/auth/*`
  - [ ] `barlive://auth/callback`
  - [ ] `barlive://email-confirmed`
- [ ] Configurar Email Templates:
  - [ ] Confirm Signup
  - [ ] Reset Password
- [ ] Activar Email Settings:
  - [ ] Enable email confirmations
  - [ ] Secure email change
  - [ ] Double confirm email changes
- [ ] Verificar RLS en todas las tablas

## 📱 App Móvil (Día 4-5)
- [ ] Actualizar `.env` con URLs de producción
- [ ] Actualizar `app.json`:
  - [ ] `scheme: "barlive"`
  - [ ] `bundleIdentifier` (iOS)
  - [ ] `package` (Android)
  - [ ] `version: "1.0.0"`
- [ ] Actualizar código de auth con URLs correctas
- [ ] Probar en desarrollo
- [ ] Instalar EAS CLI: `npm install -g eas-cli`
- [ ] Login EAS: `eas login`
- [ ] Configurar EAS: `eas build:configure`

## 🏗️ Builds (Día 5-6)
- [ ] Build Android: `eas build --platform android --profile production`
- [ ] Build iOS: `eas build --platform ios --profile production`
- [ ] Descargar archivos .aab y .ipa
- [ ] Probar builds en dispositivos reales

## 🤖 Google Play (Día 7-8)
- [ ] Crear cuenta Developer ($25)
- [ ] Crear nueva aplicación
- [ ] Completar información:
  - [ ] Nombre: BarLive
  - [ ] Descripción corta
  - [ ] Descripción completa
  - [ ] Categoría: Social/Estilo de vida
- [ ] Subir assets:
  - [ ] Ícono 512x512
  - [ ] Feature graphic 1024x500
  - [ ] Screenshots (mínimo 2)
- [ ] Configurar:
  - [ ] Clasificación de contenido
  - [ ] Público objetivo
  - [ ] Política de privacidad URL
- [ ] Subir .aab
- [ ] Enviar para revisión
- [ ] Esperar aprobación (1-7 días)

## 🍎 App Store (Día 7-8)
- [ ] Crear cuenta Developer ($99/año)
- [ ] Crear app en App Store Connect
- [ ] Completar información:
  - [ ] Nombre: BarLive
  - [ ] Bundle ID
  - [ ] Descripción
  - [ ] Palabras clave
  - [ ] URLs (soporte, marketing, privacidad)
- [ ] Subir screenshots:
  - [ ] iPhone 6.7" (mínimo 3)
  - [ ] iPhone 6.5" (mínimo 3)
- [ ] Seleccionar build de TestFlight
- [ ] Enviar para revisión
- [ ] Esperar aprobación (1-3 días)

## 🧪 Pruebas Finales (Día 9-10)
- [ ] Registro de usuario
- [ ] Confirmación de email
- [ ] Login
- [ ] Recuperación de contraseña
- [ ] Deep linking desde emails
- [ ] Búsqueda de locales
- [ ] Crear publicación
- [ ] Sistema de favoritos
- [ ] Notificaciones

## 🚀 Lanzamiento (Día 10+)
- [ ] Apps aprobadas en ambas stores
- [ ] Anuncio en redes sociales
- [ ] Email a beta testers
- [ ] Monitorear crashes y errores
- [ ] Responder reseñas

## 📊 Post-Lanzamiento
- [ ] Configurar analytics
- [ ] Monitorear Supabase dashboard
- [ ] Revisar logs diariamente
- [ ] Configurar backups automáticos
- [ ] Planificar primera actualización

---

## ⏱️ Timeline Estimado

| Fase | Duración |
|------|----------|
| Dominio y Hosting | 1-2 días |
| DNS y Configuración | 1-2 días |
| Supabase Setup | 1 día |
| App Configuration | 1-2 días |
| Builds | 1 día |
| Store Submissions | 1 día |
| Revisión de Stores | 3-7 días |
| **TOTAL** | **10-15 días** |

---

## 💰 Costos Totales

- Dominio: €10-15/año
- Google Play: $25 (único)
- Apple Developer: $99/año
- **Total primer año: ~€130**

---

## 🆘 Problemas Comunes

### DNS no propaga
- Espera 24-48 horas
- Verifica registros en https://dnschecker.org
- Limpia caché DNS: `ipconfig /flushdns` (Windows) o `sudo dscacheutil -flushcache` (Mac)

### Emails no llegan
- Verifica Site URL en Supabase
- Revisa Redirect URLs
- Comprueba spam/correo no deseado
- Verifica templates de email

### Deep linking no funciona
- Verifica `scheme` en app.json
- Confirma Redirect URLs en Supabase
- Prueba con build de producción (no Expo Go)

### Build falla
- Actualiza EAS CLI: `npm install -g eas-cli@latest`
- Limpia caché: `eas build:clear-cache`
- Revisa logs de error en EAS dashboard

---

## 📞 Ayuda

Si te atascas en algún paso:
1. Consulta la guía completa: `GUIA_PRODUCCION_DOMINIO_PERSONALIZADO.md`
2. Revisa documentación oficial
3. Pregunta en Discord de Expo/Supabase
4. Busca en Stack Overflow

**¡Éxito con tu lanzamiento! 🎉**
