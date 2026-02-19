
# 🧪 Guía de Pruebas - Correcciones Implementadas

## 🎯 Objetivo
Verificar que las 3 correcciones críticas funcionan correctamente.

---

## 1. ✅ Pruebas del Sistema de Likes

### Prueba 1.1: Like Optimista
**Pasos**:
1. Abre la app y ve a la pestaña "Social"
2. Encuentra una publicación
3. Toca el corazón ❤️
4. **Verificar**: El corazón se pone rojo INSTANTÁNEAMENTE (<100ms)
5. **Verificar**: El contador aumenta en +1 INSTANTÁNEAMENTE
6. **Verificar**: Sientes una vibración sutil (haptic feedback)

**Resultado Esperado**: ✅ Cambio instantáneo sin esperar al servidor

---

### Prueba 1.2: Unlike Optimista
**Pasos**:
1. En una publicación que ya tiene tu like (corazón rojo)
2. Toca el corazón de nuevo
3. **Verificar**: El corazón se pone gris INSTANTÁNEAMENTE
4. **Verificar**: El contador disminuye en -1 INSTANTÁNEAMENTE

**Resultado Esperado**: ✅ Cambio instantáneo sin esperar al servidor

---

### Prueba 1.3: Texto "Le gusta a ti..."
**Pasos**:
1. Da like a una publicación que NO tiene likes
2. **Verificar**: Aparece "Le gusta a ti"
3. Otro usuario da like (usa otra cuenta o pide a alguien)
4. **Verificar**: Cambia a "Les gusta a ti y a 1 persona más"
5. Da unlike
6. **Verificar**: Cambia a "Le gusta a [NombreDelOtroUsuario]"

**Resultado Esperado**: 
- ✅ Con tu like: "Le gusta a ti..."
- ✅ Sin tu like: "Le gusta a [Usuario]..."

---

### Prueba 1.4: Persistencia
**Pasos**:
1. Da like a una publicación
2. Cierra la app completamente
3. Abre la app de nuevo
4. Ve a la misma publicación
5. **Verificar**: El corazón sigue rojo
6. **Verificar**: El contador mantiene el número correcto

**Resultado Esperado**: ✅ Like persiste después de cerrar/abrir app

---

### Prueba 1.5: Doble Tap
**Pasos**:
1. Encuentra una publicación con imagen
2. Haz doble tap rápido en la imagen
3. **Verificar**: Aparece un corazón grande en el centro
4. **Verificar**: El corazón hace una animación de "bounce"
5. **Verificar**: El like se registra (corazón pequeño se pone rojo)

**Resultado Esperado**: ✅ Animación de corazón grande + like registrado

---

### Prueba 1.6: Tap Rápido Múltiple
**Pasos**:
1. Toca el corazón 10 veces muy rápido
2. **Verificar**: El UI responde a cada tap
3. Espera 1 segundo
4. **Verificar**: Solo se envía 1 petición al servidor (debouncing)

**Resultado Esperado**: ✅ UI responde instantáneamente, servidor recibe 1 petición

---

### Prueba 1.7: Error de Red
**Pasos**:
1. Activa modo avión
2. Da like a una publicación
3. **Verificar**: El corazón se pone rojo (optimistic)
4. Espera 2 segundos
5. **Verificar**: Aparece mensaje de error
6. **Verificar**: El corazón vuelve a gris (rollback)

**Resultado Esperado**: ✅ Rollback automático en caso de error

---

## 2. 🚪 Pruebas de Sala Virtual

### Prueba 2.1: Entrada Automática
**Pasos**:
1. Ve a un local que esté ABIERTO
2. Toca "Sala Virtual"
3. **Verificar**: Entras automáticamente (auto check-in)
4. **Verificar**: NO aparece error de "Acceso denegado"
5. **Verificar**: Puedes ver el chat

**Resultado Esperado**: ✅ Entrada automática sin errores

---

### Prueba 2.2: Envío de Mensajes
**Pasos**:
1. Estando en la sala virtual
2. Escribe un mensaje: "Hola, esto es una prueba"
3. Toca el botón de enviar
4. **Verificar**: El mensaje aparece INSTANTÁNEAMENTE en tu pantalla
5. **Verificar**: NO aparece error de "Debes entrar en la sala"
6. Espera 1 segundo
7. **Verificar**: El mensaje se guarda en la base de datos

**Resultado Esperado**: ✅ Mensaje aparece instantáneamente sin errores

---

### Prueba 2.3: Recepción de Mensajes
**Pasos**:
1. Abre la sala virtual en 2 dispositivos (o 2 cuentas)
2. Desde el dispositivo A, envía un mensaje
3. **Verificar**: En dispositivo B, el mensaje aparece automáticamente
4. **Verificar**: NO hay error de "Unexpected operation type"

**Resultado Esperado**: ✅ Mensajes se reciben en tiempo real sin errores

---

### Prueba 2.4: Local Cerrado
**Pasos**:
1. Ve a un local que esté CERRADO
2. Toca "Sala Virtual"
3. **Verificar**: Aparece pantalla de "Local Cerrado"
4. **Verificar**: NO puedes entrar a la sala
5. **Verificar**: Mensaje claro: "Este local está cerrado actualmente"

**Resultado Esperado**: ✅ Bloqueo claro cuando local está cerrado

---

### Prueba 2.5: Usuarios Activos
**Pasos**:
1. Entra a una sala virtual
2. Cambia a la pestaña "Usuarios"
3. **Verificar**: Apareces en la lista con badge "(Tú)"
4. **Verificar**: Hay un punto verde pulsante junto a tu avatar
5. Otro usuario entra
6. **Verificar**: Aparece en la lista automáticamente

**Resultado Esperado**: ✅ Lista de usuarios activos en tiempo real

---

### Prueba 2.6: Salir de Sala
**Pasos**:
1. Estando en la sala virtual
2. Ve a pestaña "Usuarios"
3. Toca "Salir de la Sala"
4. Confirma
5. **Verificar**: Vuelves a la pantalla anterior
6. **Verificar**: Tu check-in se marca como inactivo en BD

**Resultado Esperado**: ✅ Check-out correcto

---

## 3. 🔐 Pruebas de Autenticación Google

### Prueba 3.1: Usuario de Google Sin Contraseña
**Pasos**:
1. Crea una cuenta con Google (o usa una existente)
2. Cierra sesión
3. Ve a "Iniciar sesión"
4. Ingresa el email de la cuenta de Google
5. Ingresa cualquier contraseña
6. Toca "Iniciar sesión"
7. **Verificar**: Aparece mensaje "Configuración de contraseña requerida"
8. **Verificar**: Opciones: "Configurar contraseña" o "Usar Google"

**Resultado Esperado**: ✅ Detección correcta de usuario de Google sin contraseña

---

### Prueba 3.2: Configurar Contraseña
**Pasos**:
1. Desde el mensaje anterior, toca "Configurar contraseña"
2. **Verificar**: Redirige a pantalla de configuración
3. Toca "Enviar código de verificación"
4. **Verificar**: Recibes email con código de 6 dígitos
5. Ingresa el código
6. **Verificar**: Redirige a pantalla de nueva contraseña
7. Configura una contraseña segura
8. **Verificar**: Mensaje de éxito
9. **Verificar**: Redirige a login

**Resultado Esperado**: ✅ Flujo completo sin errores

---

### Prueba 3.3: Login con Nueva Contraseña
**Pasos**:
1. Después de configurar contraseña
2. Ve a "Iniciar sesión"
3. Ingresa email y la nueva contraseña
4. Toca "Iniciar sesión"
5. **Verificar**: Login exitoso
6. **Verificar**: NO aparece "Configuración requerida"
7. **Verificar**: Entras a la app normalmente

**Resultado Esperado**: ✅ Login exitoso sin bucle

---

### Prueba 3.4: Login con Google Sigue Funcionando
**Pasos**:
1. Cierra sesión
2. Toca "Continuar con Google"
3. Selecciona tu cuenta de Google
4. **Verificar**: Login exitoso
5. **Verificar**: Entras a la app normalmente

**Resultado Esperado**: ✅ Ambos métodos funcionan (Google + Email/Password)

---

### Prueba 3.5: Verificar Provider en BD
**SQL**:
```sql
-- Verificar que el provider se actualizó
SELECT id, email, provider 
FROM usuarios 
WHERE email = 'TU_EMAIL_DE_GOOGLE@gmail.com';

-- Debería mostrar: provider = 'barlive'
```

**Resultado Esperado**: ✅ `provider = 'barlive'` después de configurar contraseña

---

## 🐛 Errores Comunes y Soluciones

### Error: "Like desaparece al refrescar"
**Causa**: No se está guardando en la base de datos
**Solución**: Verificar que la petición al servidor se completa exitosamente
**Verificar**: Logs de consola `[InstagramPostCard] ✅ Like added successfully`

---

### Error: "Acceso denegado" en sala virtual
**Causa**: Race condition entre check-in y validación
**Solución**: Ya corregido con delays estratégicos
**Verificar**: Logs de consola `[SalaVirtual] ✅ Checked in successfully, user is now in_room: true`

---

### Error: "Configuración requerida" en bucle
**Causa**: Campo `provider` no se actualiza después de configurar contraseña
**Solución**: Ya corregido en `nueva-password-token.tsx`
**Verificar**: Logs de consola `[NuevaPasswordToken] ✅ Provider actualizado a "barlive"`

---

### Error: "Unexpected operation type: message_created"
**Causa**: Uso de broadcast en lugar de postgres_changes
**Solución**: Ya corregido - ahora usa postgres_changes
**Verificar**: Logs de consola `[SalaVirtual] 📨 New message via postgres_changes`

---

## 📊 Checklist de Verificación Final

### Sistema de Likes
- [ ] ✅ Like instantáneo
- [ ] ✅ Unlike instantáneo
- [ ] ✅ Texto "Le gusta a ti..." cuando usuario ha dado like
- [ ] ✅ Texto "Le gusta a [Usuario]..." cuando usuario NO ha dado like
- [ ] ✅ Persistencia después de refrescar
- [ ] ✅ Real-time updates de otros usuarios
- [ ] ✅ Rollback en caso de error
- [ ] ✅ Debouncing funcionando
- [ ] ✅ Animaciones fluidas
- [ ] ✅ Haptic feedback

### Sala Virtual
- [ ] ✅ Auto check-in funcionando
- [ ] ✅ Sin error "Acceso denegado"
- [ ] ✅ Sin error "Debes entrar en la sala"
- [ ] ✅ Sin error "Unexpected operation type"
- [ ] ✅ Mensajes se envían correctamente
- [ ] ✅ Mensajes se reciben en tiempo real
- [ ] ✅ Usuarios activos se actualizan
- [ ] ✅ Check-out funciona correctamente

### Autenticación Google
- [ ] ✅ Detección de usuarios sin contraseña
- [ ] ✅ Flujo de configuración completo
- [ ] ✅ Email con código recibido
- [ ] ✅ Contraseña configurada exitosamente
- [ ] ✅ Provider actualizado a 'barlive'
- [ ] ✅ Login con email/password funciona
- [ ] ✅ Login con Google sigue funcionando
- [ ] ✅ Sin bucle de "Configuración requerida"

---

## 🎉 ¡Listo!

Si todas las pruebas pasan, las correcciones están funcionando correctamente.

**Recuerda**:
- Revisar logs de consola para debugging
- Verificar base de datos para confirmar persistencia
- Probar con múltiples usuarios para verificar real-time
- Probar en diferentes dispositivos (iOS, Android, Web)

---

**Última Actualización**: 2025-01-22
