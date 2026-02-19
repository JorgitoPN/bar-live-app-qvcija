
# 📊 Diagrama de Flujo Completo: Autenticación y Usernames

## 🔄 Flujo de Registro y Verificación

```
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRO DE NUEVO USUARIO                     │
└─────────────────────────────────────────────────────────────────┘

1. Usuario abre app
   │
   ├─> Navega a /auth/registro-v6
   │
   └─> Completa formulario:
       ├─ Nombre: "Juan Pérez"
       ├─ Email: "juan@ejemplo.com"
       ├─ Contraseña: "Password123"
       └─ Acepta términos ✓

2. Usuario hace clic en "Crear cuenta"
   │
   ├─> Sistema valida datos
   │   ├─ ✅ Nombre válido
   │   ├─ ✅ Email válido
   │   ├─ ✅ Contraseña válida
   │   └─ ✅ Términos aceptados
   │
   ├─> Sistema verifica email no existe
   │   └─ ✅ Email disponible
   │
   ├─> Sistema genera username automático
   │   ├─ Base: "juan_perez"
   │   ├─ Verifica disponibilidad
   │   ├─ Verifica no está reservado
   │   └─ ✅ Username: "juan_perez"
   │
   ├─> Sistema crea usuario en Supabase Auth
   │   ├─ Email: juan@ejemplo.com
   │   ├─ Password: [encrypted]
   │   ├─ Metadata: { nombre, username, provider: 'barlive' }
   │   └─ ✅ Usuario creado (ID: xxx-xxx-xxx)
   │
   ├─> Sistema actualiza tabla usuarios
   │   ├─ username: "juan_perez"
   │   ├─ email_verified: false
   │   └─ ✅ Perfil actualizado
   │
   ├─> Sistema genera token de verificación
   │   ├─ Token: "123456" (6 dígitos aleatorios)
   │   ├─ Expira en: 1 hora
   │   └─ ✅ Token almacenado en verification_tokens
   │
   ├─> Sistema envía email con token
   │   ├─ Edge Function: request-verification-token
   │   ├─ Servicio: Resend API
   │   ├─ De: BarLive <noreply@barliveapp.es>
   │   ├─ Para: juan@ejemplo.com
   │   ├─ Asunto: "🎉 Verifica tu cuenta de Barlive"
   │   ├─ Contenido: Token de 6 dígitos + instrucciones
   │   └─ ✅ Email enviado (o ⚠️ error si Resend no configurado)
   │
   └─> App redirige a verificación
       ├─ Ruta: /auth/verificar-cuenta-token
       ├─ Params: { email, nombre }
       └─ ✅ Pantalla de token mostrada

3. Usuario en pantalla de verificación
   │
   ├─> Ve instrucciones claras:
   │   ├─ "¡Correo enviado!"
   │   ├─ Email mostrado: juan@ejemplo.com
   │   ├─ Pasos numerados 1-4
   │   └─ Campos para 6 dígitos
   │
   └─> Revisa su email
       ├─ Bandeja de entrada (o spam)
       ├─ Email de BarLive
       ├─ Token: 123456
       └─ ✅ Copia token

4. Usuario introduce token
   │
   ├─> Escribe/pega token en 6 campos
   │   └─ Token completo: "123456"
   │
   ├─> Hace clic en "Verificar cuenta"
   │
   ├─> Sistema valida token
   │   ├─ Edge Function: validate-verification-token
   │   ├─ Verifica email + token
   │   ├─ Verifica no expirado
   │   ├─ Verifica no usado
   │   └─ ✅ Token válido
   │
   ├─> Sistema verifica cuenta
   │   ├─ Edge Function: verify-account-with-token
   │   ├─ Marca email_verified = true
   │   ├─ Marca token como usado
   │   └─ ✅ Cuenta verificada
   │
   └─> App muestra éxito
       ├─ Alert: "✅ ¡Cuenta verificada!"
       ├─ Mensaje: "Ahora puedes iniciar sesión"
       └─ Redirige a: /auth/login-v6

5. Usuario inicia sesión
   │
   ├─> Introduce email y contraseña
   │
   ├─> Sistema verifica credenciales
   │   ├─ Email: juan@ejemplo.com
   │   ├─ Password: Password123
   │   ├─ Email verificado: ✅ true
   │   └─ ✅ Credenciales válidas
   │
   └─> Login exitoso
       ├─ Session creada
       ├─ User data cargada
       └─ Redirige a: /(tabs)/explorar

┌─────────────────────────────────────────────────────────────────┐
│                    ✅ REGISTRO COMPLETADO                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Edición de Username

```
┌─────────────────────────────────────────────────────────────────┐
│                    EDICIÓN DE USERNAME                           │
└─────────────────────────────────────────────────────────────────┘

1. Usuario navega a editar perfil
   │
   ├─> Ruta: /editar/perfil
   │
   └─> Sistema carga datos actuales
       ├─ Nombre: "Juan Pérez"
       ├─ Username actual: "juan_perez"
       ├─ Bio, sitio web, etc.
       └─ ✅ Datos cargados

2. Sistema genera sugerencias
   │
   ├─> Componente: UsernameSuggestions
   │
   ├─> Función: generateUsernameSuggestions("Juan Pérez", 5)
   │
   ├─> Genera variaciones:
   │   ├─ "juan_perez" (si disponible)
   │   ├─ "juan_perez_oficial"
   │   ├─ "juan_perez_real"
   │   ├─ "juan_perez1"
   │   └─ "juan_perez_app"
   │
   ├─> Verifica disponibilidad de cada una
   │   ├─ Consulta tabla usuarios
   │   ├─ Consulta tabla locales
   │   └─ Filtra solo disponibles
   │
   └─> Muestra sugerencias
       └─ ✅ 5 chips horizontales con usernames

3. Usuario selecciona o escribe username
   │
   ├─> Opción A: Selecciona sugerencia
   │   ├─ Click en chip "juan_perez_oficial"
   │   └─ Username actualizado: "juan_perez_oficial"
   │
   └─> Opción B: Escribe manualmente
       ├─ Escribe: "juan_oficial"
       ├─ Sistema valida formato en tiempo real
       └─ Username actualizado: "juan_oficial"

4. Usuario guarda cambios
   │
   ├─> Sistema valida username
   │   ├─ ✅ Formato válido (solo a-z, 0-9, ., _)
   │   ├─ ✅ Longitud válida (3-30 caracteres)
   │   ├─ ✅ No está reservado
   │   └─ ✅ No está en uso
   │
   ├─> Sistema actualiza base de datos
   │   ├─ UPDATE usuarios SET username = 'juan_oficial'
   │   └─ ✅ Username actualizado
   │
   ├─> Sistema registra cambio en historial
   │   ├─ INSERT INTO username_history
   │   ├─ entity_type: 'user'
   │   ├─ entity_id: [user_id]
   │   ├─ old_username: 'juan_perez'
   │   ├─ new_username: 'juan_oficial'
   │   ├─ changed_by: [user_id]
   │   ├─ change_reason: 'Usuario editó su perfil'
   │   └─ ✅ Cambio registrado
   │
   └─> App muestra éxito
       ├─ Alert: "Éxito"
       ├─ Mensaje: "Perfil actualizado correctamente"
       └─ Vuelve a perfil

┌─────────────────────────────────────────────────────────────────┐
│                    ✅ USERNAME ACTUALIZADO                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Flujo de Búsqueda de Username

```
┌─────────────────────────────────────────────────────────────────┐
│                    BÚSQUEDA DE USUARIOS                          │
└─────────────────────────────────────────────────────────────────┘

1. Usuario navega a búsqueda
   │
   ├─> Ruta: /social/buscar-usuario
   │
   └─> Componente: UsernameSearch
       └─ ✅ Campo de búsqueda mostrado

2. Usuario escribe en búsqueda
   │
   ├─> Escribe: "@juan"
   │
   ├─> Sistema espera 300ms (debounce)
   │
   └─> Sistema busca en base de datos
       ├─ Función: searchByUsername("juan", 10)
       │
       ├─> Busca en tabla usuarios:
       │   ├─ SELECT * FROM usuarios
       │   ├─ WHERE username ILIKE '%juan%'
       │   ├─ AND username IS NOT NULL
       │   ├─ LIMIT 10
       │   └─ Resultados: 3 usuarios
       │
       └─> Busca en tabla locales:
           ├─ SELECT * FROM locales
           ├─ WHERE username ILIKE '%juan%'
           ├─ AND username IS NOT NULL
           ├─ AND perfil_visible = true
           ├─ LIMIT 10
           └─ Resultados: 2 locales

3. Sistema muestra resultados
   │
   ├─> Sección "Usuarios" (3 resultados)
   │   ├─ Juan Pérez (@juan_perez)
   │   ├─ Juan García (@juan_garcia)
   │   └─ Juana López (@juana_lopez)
   │
   └─> Sección "Locales" (2 resultados)
       ├─ Bar Juan (@bar_juan) ✓
       └─ Restaurante Juan (@restaurante_juan) ✓

4. Usuario selecciona resultado
   │
   ├─> Opción A: Selecciona usuario
   │   ├─ Click en "Juan Pérez"
   │   └─ Navega a: /perfil/usuario?id=[user_id]
   │
   └─> Opción B: Selecciona local
       ├─ Click en "Bar Juan"
       └─ Navega a: /detalle/local?id=[local_id]

┌─────────────────────────────────────────────────────────────────┐
│                    ✅ PERFIL MOSTRADO                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📧 Flujo de Email con Token

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENVÍO DE EMAIL CON TOKEN                      │
└─────────────────────────────────────────────────────────────────┘

1. Sistema genera token
   │
   ├─> Token: Math.floor(100000 + Math.random() * 900000)
   │   └─> Resultado: "123456"
   │
   ├─> Expira en: now() + 1 hora
   │   └─> Resultado: "2025-01-24 15:30:00"
   │
   └─> Almacena en base de datos
       ├─ INSERT INTO verification_tokens
       ├─ email: "juan@ejemplo.com"
       ├─ token: "123456"
       ├─ expires_at: "2025-01-24 15:30:00"
       ├─ used: false
       └─ ✅ Token almacenado

2. Sistema prepara email
   │
   ├─> Plantilla HTML con:
   │   ├─ Header con gradiente
   │   ├─ Saludo personalizado
   │   ├─ Token en grande (56px)
   │   ├─ Instrucciones paso a paso
   │   ├─ Nota de seguridad
   │   └─ Footer con links
   │
   └─> Payload para Resend:
       ├─ from: "BarLive <noreply@barliveapp.es>"
       ├─ to: ["juan@ejemplo.com"]
       ├─ subject: "🎉 Verifica tu cuenta de Barlive"
       └─ html: [plantilla completa]

3. Sistema envía email vía Resend
   │
   ├─> POST https://api.resend.com/emails
   │   ├─ Headers:
   │   │   ├─ Content-Type: application/json
   │   │   └─ Authorization: Bearer re_xxx...
   │   └─ Body: [payload del email]
   │
   ├─> Resend procesa email
   │   ├─ Verifica API Key ✅
   │   ├─ Verifica dominio ✅
   │   ├─ Verifica registros DNS ✅
   │   └─ Envía email
   │
   └─> Respuesta de Resend
       ├─ Status: 200 OK
       ├─ Body: { "id": "email_xxx" }
       └─ ✅ Email enviado

4. Usuario recibe email
   │
   ├─> Proveedor de email procesa
   │   ├─ Verifica SPF ✅
   │   ├─ Verifica DKIM ✅
   │   ├─ Verifica DMARC ✅
   │   └─ Clasifica como legítimo
   │
   ├─> Email llega a bandeja de entrada
   │   └─ ✅ Email visible
   │
   └─> Usuario abre email
       ├─ Ve token: 123456
       ├─ Lee instrucciones
       └─ Copia token

┌─────────────────────────────────────────────────────────────────┐
│                    ✅ EMAIL RECIBIDO                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Flujo de Validación de Token

```
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDACIÓN DE TOKEN                           │
└─────────────────────────────────────────────────────────────────┘

1. Usuario introduce token en app
   │
   ├─> Campos: [1][2][3][4][5][6]
   │   └─> Token completo: "123456"
   │
   └─> Hace clic en "Verificar cuenta"

2. App llama a Edge Function
   │
   ├─> POST /functions/v1/validate-verification-token
   │   ├─ Body: { email: "juan@ejemplo.com", token: "123456" }
   │   └─> Edge Function procesa
   │
   ├─> Sistema busca token en base de datos
   │   ├─ SELECT * FROM verification_tokens
   │   ├─ WHERE email = 'juan@ejemplo.com'
   │   ├─ AND token = '123456'
   │   └─> Resultado: 1 registro encontrado
   │
   ├─> Sistema valida token
   │   ├─ ✅ Token existe
   │   ├─ ✅ Email coincide
   │   ├─ ✅ No ha expirado (expires_at > now())
   │   ├─ ✅ No ha sido usado (used = false)
   │   └─> Token válido
   │
   └─> Respuesta: { "valid": true }

3. App llama a verificar cuenta
   │
   ├─> POST /functions/v1/verify-account-with-token
   │   ├─ Body: { email: "juan@ejemplo.com", token: "123456" }
   │   └─> Edge Function procesa
   │
   ├─> Sistema actualiza usuario
   │   ├─ UPDATE usuarios
   │   ├─ SET email_verified = true
   │   ├─ WHERE email = 'juan@ejemplo.com'
   │   └─ ✅ Usuario verificado
   │
   ├─> Sistema marca token como usado
   │   ├─ UPDATE verification_tokens
   │   ├─ SET used = true, used_at = now()
   │   ├─ WHERE email = 'juan@ejemplo.com' AND token = '123456'
   │   └─ ✅ Token marcado como usado
   │
   └─> Respuesta: { "success": true }

4. App muestra éxito
   │
   ├─> Alert: "✅ ¡Cuenta verificada!"
   │   └─ Mensaje: "Ahora puedes iniciar sesión"
   │
   └─> Redirige a: /auth/login-v6

┌─────────────────────────────────────────────────────────────────┐
│                    ✅ CUENTA VERIFICADA                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Reenvío de Token

```
┌─────────────────────────────────────────────────────────────────┐
│                    REENVÍO DE TOKEN                              │
└─────────────────────────────────────────────────────────────────┘

1. Usuario no recibió email
   │
   ├─> Hace clic en "Reenviar código"
   │
   └─> Sistema genera nuevo token
       ├─ Token anterior: "123456" (expirado o no recibido)
       ├─> Genera nuevo: "789012"
       ├─> Almacena en verification_tokens
       └─> Envía nuevo email

2. Usuario recibe nuevo email
   │
   ├─> Token nuevo: "789012"
   │
   └─> Introduce en app
       └─> ✅ Verificación exitosa

┌─────────────────────────────────────────────────────────────────┐
│                    ✅ TOKEN REENVIADO                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA COMPLETA                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   APP MÓVIL  │
└──────┬───────┘
       │
       ├─> Registro (/auth/registro-v6)
       │   ├─> Genera username automático
       │   ├─> Crea usuario en Supabase Auth
       │   └─> Redirige a verificación
       │
       ├─> Verificación (/auth/verificar-cuenta-token)
       │   ├─> Muestra instrucciones
       │   ├─> Campos para token
       │   └─> Valida y verifica
       │
       ├─> Login (/auth/login-v6)
       │   ├─> Verifica credenciales
       │   ├─> Detecta email no verificado
       │   └─> Ofrece reenviar token
       │
       ├─> Editar Perfil (/editar/perfil)
       │   ├─> Muestra sugerencias de username
       │   ├─> Valida cambios
       │   └─> Registra en historial
       │
       └─> Búsqueda (/social/buscar-usuario)
           ├─> Busca en tiempo real
           └─> Navega a perfiles

┌──────────────┐
│   SUPABASE   │
└──────┬───────┘
       │
       ├─> Auth
       │   ├─> Usuarios (auth.users)
       │   └─> Sessions
       │
       ├─> Database
       │   ├─> usuarios (perfil público)
       │   ├─> locales (con username si premium)
       │   ├─> verification_tokens (tokens de verificación)
       │   └─> username_history (historial de cambios)
       │
       └─> Edge Functions
           ├─> request-verification-token
           │   ├─ Genera token de 6 dígitos
           │   ├─ Almacena en DB
           │   └─ Envía email vía Resend
           │
           ├─> validate-verification-token
           │   ├─ Verifica token
           │   └─ No marca como usado
           │
           └─> verify-account-with-token
               ├─ Marca email como verificado
               └─ Marca token como usado

┌──────────────┐
│   RESEND API │
└──────┬───────┘
       │
       ├─> Recibe request de Edge Function
       │   ├─ API Key: re_xxx...
       │   ├─ From: noreply@barliveapp.es
       │   ├─ To: usuario@ejemplo.com
       │   └─ HTML: Plantilla con token
       │
       ├─> Verifica dominio
       │   ├─ SPF ✅
       │   ├─ DKIM ✅
       │   └─ DMARC ✅
       │
       └─> Envía email
           └─> ✅ Email entregado

┌──────────────┐
│ PROVEEDOR    │
│ DE EMAIL     │
└──────┬───────┘
       │
       ├─> Recibe email de Resend
       │   ├─ Verifica autenticidad
       │   └─ Clasifica como legítimo
       │
       └─> Entrega a bandeja de entrada
           └─> ✅ Usuario recibe email
```

---

## 📊 Métricas y Monitoreo

### KPIs del Sistema

1. **Tasa de Registro:**
   - Usuarios registrados / día
   - Usuarios verificados / día
   - Tasa de conversión: verificados / registrados

2. **Tasa de Entrega de Emails:**
   - Emails enviados / día
   - Emails entregados / día
   - Emails en spam / día

3. **Tasa de Verificación:**
   - Usuarios que completan verificación
   - Tiempo promedio hasta verificación
   - Tokens expirados / día

4. **Cambios de Username:**
   - Cambios / día
   - Usuarios que cambian > 3 veces
   - Usernames más populares

### Consultas SQL para Métricas

```sql
-- Registros hoy
SELECT COUNT(*) as registros_hoy
FROM usuarios
WHERE DATE(created_at) = CURRENT_DATE;

-- Verificaciones hoy
SELECT COUNT(*) as verificaciones_hoy
FROM usuarios
WHERE DATE(created_at) = CURRENT_DATE
AND email_verified = true;

-- Tokens activos
SELECT COUNT(*) as tokens_activos
FROM verification_tokens
WHERE expires_at > now()
AND used = false;

-- Cambios de username hoy
SELECT COUNT(*) as cambios_hoy
FROM username_history
WHERE DATE(created_at) = CURRENT_DATE;
```

---

## 🎯 Conclusión

### Sistema Completo ✅

- ✅ Registro con username automático
- ✅ Verificación por token de 6 dígitos
- ✅ Login con detección de email no verificado
- ✅ Edición de username con sugerencias
- ✅ Búsqueda de usuarios por username
- ✅ Historial de cambios para moderación
- ✅ Validación de usernames reservados

### Bloqueador Actual ⚠️

- ⚠️ Configuración de Resend API

### Acción Requerida 🚨

**Configurar Resend API siguiendo `CONFIGURACION_URGENTE_RESEND.md`**

**Tiempo:** 30 minutos

**Resultado:** Sistema 100% funcional

---

## 📚 Documentación Relacionada

1. `CONFIGURACION_URGENTE_RESEND.md` - Configuración paso a paso
2. `SOLUCION_EMAILS_TOKEN_VERIFICACION.md` - Diagnóstico y solución
3. `IMPLEMENTACION_MEJORAS_USERNAME.md` - Sistema de usernames completo
4. `RESUMEN_FINAL_MEJORAS_USERNAME_Y_AUTH.md` - Resumen ejecutivo

---

**Estado del Proyecto:** 95% completo

**Bloqueador:** Configuración de Resend (5% restante)

**Próximo paso:** Configurar Resend API

**Tiempo estimado:** 30-60 minutos

**Resultado final:** Sistema de autenticación y usernames completamente funcional y listo para producción
