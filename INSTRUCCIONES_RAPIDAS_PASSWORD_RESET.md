
# 🚀 Instrucciones Rápidas: Solucionar "Enlace inválido o expirado"

## ⚡ Solución Rápida (5 minutos)

### Paso 1: Actualizar Plantilla de Email

1. **Ir al Dashboard de Supabase:**
   ```
   https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/templates
   ```

2. **Seleccionar:** "Reset Password" (Restablecer contraseña)

3. **Buscar esta línea en el HTML:**
   ```html
   <a href="{{ .ConfirmationURL }}">
   ```

4. **Reemplazarla con:**
   ```html
   <a href="https://barliveapp.es/auth/restablecer-password#access_token={{ .TokenHash }}&type=recovery">
   ```

5. **Guardar cambios** ✅

### Paso 2: Verificar Redirect URLs

1. **Ir a:**
   ```
   https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/url-configuration
   ```

2. **Asegurarse de que estas URLs estén en la lista:**
   - `https://barliveapp.es/auth/restablecer-password`
   - `https://barliveapp.es/auth/callback`
   - `https://barliveapp.es/*`

3. **Site URL debe ser:**
   - `https://barliveapp.es`

### Paso 3: Probar

1. Ve a tu app: `https://barliveapp.es/auth/recuperar-password`
2. Ingresa tu email
3. Haz clic en "Enviar correo de recuperación"
4. Revisa tu email
5. Haz clic en "Restablecer contraseña"
6. ✅ Deberías ver la página para ingresar nueva contraseña

---

## 📋 Plantilla Completa de Email

Si prefieres copiar y pegar la plantilla completa, usa el archivo:
```
docs/EMAIL_TEMPLATE_PASSWORD_RESET_FINAL.html
```

---

## ❓ ¿Qué cambió?

### Antes (❌ No funcionaba):
```
Email → Supabase Server → Verifica Token → Redirige a App
        (Puede fallar aquí)
```

### Ahora (✅ Funciona):
```
Email → App directamente con Token → App verifica Token
        (Control total del flujo)
```

---

## 🐛 Si Aún No Funciona

### 1. Verifica que el enlace sea correcto

El enlace en el email debe verse así:
```
https://barliveapp.es/auth/restablecer-password#access_token=XXXXX&type=recovery
```

### 2. Verifica que el token no haya expirado

Los tokens expiran en **1 hora**. Si pasó más tiempo, solicita un nuevo enlace.

### 3. Verifica que no hayas usado el enlace antes

Los tokens solo se pueden usar **una vez**. Si ya lo usaste, solicita un nuevo enlace.

### 4. Revisa la consola del navegador

1. Abre el navegador
2. Presiona F12
3. Ve a la pestaña "Console"
4. Busca mensajes que empiecen con `[RestablecerPassword]`
5. Toma captura de pantalla si hay errores

---

## 📞 Soporte

Si después de seguir estos pasos el problema persiste:

1. Toma capturas de pantalla del error
2. Copia los logs de la consola
3. Contacta a: **soporte@barliveapp.es**

---

## ✅ Checklist

- [ ] Actualicé la plantilla de email en Supabase
- [ ] Verifiqué las Redirect URLs
- [ ] Probé solicitar un enlace de recuperación
- [ ] El email llegó correctamente
- [ ] Hice clic en el enlace del email
- [ ] Se abrió la página de restablecer contraseña
- [ ] Pude ingresar una nueva contraseña
- [ ] La contraseña se actualizó correctamente
- [ ] Pude iniciar sesión con la nueva contraseña

---

**Tiempo estimado:** 5-10 minutos
**Dificultad:** Fácil
**Última actualización:** 2 de febrero de 2025
