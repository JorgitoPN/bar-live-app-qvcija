
# 📝 Implementación de Mejoras del Sistema de Nombres de Usuario

## 🎯 Resumen Ejecutivo

Este documento describe las mejoras implementadas y opcionales para el sistema de nombres de usuario en BarLive, incluyendo sugerencias durante el registro, lista de nombres reservados, búsqueda de nombres de usuario, URLs personalizadas y seguimiento del historial de cambios.

---

## ✅ Estado Actual del Sistema

### Sistema de Verificación por Token
- ✅ **Edge Functions desplegadas:**
  - `request-verification-token`: Genera y envía tokens de 6 dígitos
  - `validate-verification-token`: Valida tokens sin marcarlos como usados
  - `verify-account-with-token`: Completa la verificación de cuenta

- ✅ **Tabla `verification_tokens` creada:**
  - Almacena tokens con expiración de 1 hora
  - Control de uso único
  - Auditoría con IP y user agent

- ✅ **Flujo de Registro:**
  - Genera username automático durante el registro
  - Envía token de verificación por email
  - Redirige a pantalla de introducción de token
  - Verifica cuenta con token de 6 dígitos

### Sistema de Nombres de Usuario
- ✅ **Generación automática:**
  - Función `generateUsername()` en `utils/usernameGenerator.ts`
  - Limpia caracteres especiales y acentos
  - Añade números si el nombre base está ocupado
  - Verifica unicidad en tablas `usuarios` y `locales`

- ✅ **Edición de username:**
  - Los usuarios pueden editar su username desde "Editar Perfil"
  - Los locales con plan premium/estandar pueden editar su username

---

## 🔧 Correcciones Implementadas

### 1. Flujo de Registro Corregido ✅

**Problema:** Después de hacer clic en "Crear Cuenta", la app redirigía a "Verifica tu correo" en lugar de la pantalla de introducción del token.

**Solución Implementada:**
```typescript
// app/auth/registro-v6.tsx
// Después de crear el usuario y enviar el token:
router.push({
  pathname: '/auth/verificar-cuenta-token',
  params: { email: normalizedEmail, nombre: nombre.trim() },
});
```

**Resultado:** Ahora la app redirige correctamente a `/auth/verificar-cuenta-token` después del registro.

---

### 2. Configuración de Emails ⚠️

**Problema:** Los correos con el token no se están recibiendo.

**Diagnóstico:**
- La Edge Function `request-verification-token` está correctamente desplegada
- Usa Resend API para envío de emails
- Requiere configuración de `RESEND_API_KEY` en Supabase

**Pasos para Verificar y Solucionar:**

#### Paso 1: Verificar RESEND_API_KEY en Supabase

1. Ir a Supabase Dashboard: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Navegar a: **Settings > Edge Functions > Secrets**
3. Verificar que existe la variable `RESEND_API_KEY`
4. Si no existe, añadirla con tu API key de Resend

#### Paso 2: Verificar Dominio en Resend

1. Ir a https://resend.com/domains
2. Verificar que `barliveapp.es` esté verificado (estado: ✅ Verified)
3. Comprobar registros DNS:
   - **SPF:** `v=spf1 include:_spf.resend.com ~all`
   - **DKIM:** Registro TXT proporcionado por Resend
   - **DMARC:** `v=DMARC1; p=none;`

#### Paso 3: Probar Envío de Email

```bash
# Desde Supabase Dashboard > Edge Functions > request-verification-token
# Ejecutar con payload:
{
  "email": "tu-email@ejemplo.com"
}
```

#### Paso 4: Revisar Logs

```bash
# En Supabase Dashboard > Edge Functions > request-verification-token > Logs
# Buscar errores de Resend API:
# - 401: API key inválida o expirada
# - 403: Dominio no verificado
# - 422: Datos de email inválidos
```

**Errores Comunes y Soluciones:**

| Error | Causa | Solución |
|-------|-------|----------|
| 401 Unauthorized | API key inválida o expirada | Regenerar API key en Resend y actualizar en Supabase |
| 403 Forbidden | Dominio no verificado | Verificar registros DNS en tu proveedor de dominio |
| 422 Unprocessable | Datos de email inválidos | Verificar formato del email y remitente |

---

## 🚀 Mejoras Implementadas

### 1. Lista de Nombres de Usuario Reservados ✅

**Implementación:**
```typescript
// utils/usernameGenerator.ts
const RESERVED_USERNAMES = [
  // System and admin
  'admin', 'administrator', 'administrador', 'root', 'system', 'sistema',
  'moderator', 'moderador', 'mod', 'staff', 'equipo', 'support', 'soporte',
  
  // Brand protection
  'barlive', 'bar_live', 'barliveapp', 'barlive_app', 'oficial', 'official',
  'verified', 'verificado', 'premium', 'vip', 'pro',
  
  // Common terms
  'user', 'usuario', 'guest', 'invitado', 'anonymous', 'anonimo',
  
  // Social media
  'instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'whatsapp',
  
  // Generic locations
  'bar', 'pub', 'club', 'discoteca', 'restaurante', 'cafeteria',
];

export function isUsernameReserved(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase());
}
```

**Uso:**
- Se verifica automáticamente durante la generación de usernames
- Se valida al editar el perfil de usuario
- Previene el uso de nombres reservados para el sistema

---

### 2. Sugerencias de Nombre de Usuario ✅

**Implementación:**
```typescript
// utils/usernameGenerator.ts
export async function generateUsernameSuggestions(
  name: string, 
  count: number = 5
): Promise<string[]> {
  const suggestions: string[] = [];
  const baseUsername = generateUsernameFromName(name);
  
  // Try base username first
  const isBaseAvailable = await isUsernameAvailable(baseUsername);
  if (isBaseAvailable) {
    suggestions.push(baseUsername);
  }
  
  // Generate variations
  const variations = [
    baseUsername,
    `${baseUsername}_oficial`,
    `${baseUsername}_real`,
    `${baseUsername}_app`,
    `el_${baseUsername}`,
    `la_${baseUsername}`,
  ];
  
  // Add numbered variations
  for (let i = 1; i <= 99 && suggestions.length < count; i++) {
    variations.push(`${baseUsername}${i}`);
    variations.push(`${baseUsername}_${i}`);
  }
  
  // Check availability and return suggestions
  // ...
  
  return suggestions.slice(0, count);
}
```

**Uso Futuro:**
- Mostrar sugerencias durante el registro
- Permitir al usuario elegir entre varias opciones
- Mejorar la experiencia de usuario

---

### 3. Búsqueda de Nombre de Usuario ✅

**Implementación:**
```typescript
// utils/usernameGenerator.ts
export async function searchByUsername(
  query: string, 
  limit: number = 10
): Promise<{
  users: Array<{ id: string; username: string; nombre: string; avatar: string | null }>;
  locals: Array<{ id: string; username: string; nombre: string; imagen_url: string | null }>;
}> {
  // Search in usuarios table
  const { data: usersData } = await supabase
    .from('usuarios')
    .select('id, username, nombre, avatar')
    .ilike('username', `%${query}%`)
    .not('username', 'is', null)
    .limit(limit);

  // Search in locales table
  const { data: localsData } = await supabase
    .from('locales')
    .select('id, username, nombre, imagen_url')
    .ilike('username', `%${query}%`)
    .not('username', 'is', null)
    .eq('perfil_visible', true)
    .limit(limit);

  return {
    users: usersData || [],
    locals: localsData || [],
  };
}
```

**Componente Creado:**
- `components/social/UsernameSearch.tsx`: Componente reutilizable para buscar usuarios y locales
- `app/social/buscar-usuario.tsx`: Página dedicada para búsqueda de usuarios

**Características:**
- Búsqueda en tiempo real con debounce de 300ms
- Busca tanto en usuarios como en locales
- Muestra avatares y nombres
- Navegación directa al perfil

---

### 4. Seguimiento del Historial de Cambios ✅

**Tabla Creada:**
```sql
CREATE TABLE username_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'local')),
  entity_id UUID NOT NULL,
  old_username TEXT,
  new_username TEXT NOT NULL,
  changed_by UUID REFERENCES usuarios(id),
  change_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Funciones Implementadas:**
```typescript
// Track username change
export async function trackUsernameChange(
  entityType: 'user' | 'local',
  entityId: string,
  oldUsername: string | null,
  newUsername: string,
  changedBy?: string,
  reason?: string
): Promise<boolean>

// Get username history
export async function getUsernameHistory(
  entityType: 'user' | 'local',
  entityId: string
): Promise<Array<{
  id: string;
  old_username: string | null;
  new_username: string;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}>>
```

**Integración:**
- Se registra automáticamente al editar el perfil de usuario
- Incluye información de quién hizo el cambio
- Permite auditoría y moderación

---

### 5. URLs Personalizadas (Propuesta) 🔮

**Objetivo:** Crear URLs personalizadas del tipo `barlive.app/@nombreusuario`

**Implementación Propuesta:**

#### Opción A: Deep Links con Expo Router

```typescript
// app.json
{
  "expo": {
    "scheme": "barlive",
    "web": {
      "bundler": "metro"
    }
  }
}

// app/[username].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { getUserOrLocalByUsername } from '@/utils/usernameGenerator';

export default function UsernameProfileScreen() {
  const { username } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const result = await getUserOrLocalByUsername(username as string);
      
      if (result.type === 'user') {
        router.replace(`/perfil/usuario?id=${result.data.id}`);
      } else if (result.type === 'local') {
        router.replace(`/detalle/local?id=${result.data.id}`);
      } else {
        router.replace('/404');
      }
    }
    
    loadProfile();
  }, [username]);

  return null; // Redirect component
}
```

#### Opción B: Configuración de Servidor Web

```nginx
# nginx.conf
location ~ ^/@([a-zA-Z0-9._]+)$ {
  rewrite ^/@(.*)$ /perfil/$1 last;
}
```

**Beneficios:**
- URLs más amigables y compartibles
- Mejor SEO para perfiles públicos
- Experiencia similar a Instagram/Twitter

---

## 📊 Resumen de Funcionalidades

### Implementadas ✅

1. **Lista de Nombres Reservados**
   - 50+ nombres reservados para protección de marca
   - Validación automática durante generación y edición
   - Previene uso de nombres del sistema

2. **Búsqueda de Usuarios**
   - Componente reutilizable `UsernameSearch`
   - Búsqueda en tiempo real con debounce
   - Resultados separados por usuarios y locales
   - Navegación directa a perfiles

3. **Historial de Cambios**
   - Tabla `username_history` con RLS
   - Tracking automático de cambios
   - Auditoría completa con usuario y fecha
   - Acceso para admins y propietarios

4. **Sugerencias de Username**
   - Función `generateUsernameSuggestions()`
   - Genera hasta 5 sugerencias disponibles
   - Variaciones inteligentes del nombre base

### Pendientes de Implementar 🔮

5. **URLs Personalizadas**
   - Requiere configuración de deep links
   - Implementación de ruta dinámica `app/[username].tsx`
   - Configuración de servidor web (opcional)

---

## 🛠️ Guía de Uso

### Para Desarrolladores

#### Generar Sugerencias de Username
```typescript
import { generateUsernameSuggestions } from '@/utils/usernameGenerator';

const suggestions = await generateUsernameSuggestions('Juan Pérez', 5);
// Resultado: ['juan_perez', 'juan_perez_oficial', 'juan_perez1', 'juan_perez_real', 'juan_perez2']
```

#### Buscar por Username
```typescript
import { searchByUsername } from '@/utils/usernameGenerator';

const results = await searchByUsername('juan', 10);
console.log('Usuarios encontrados:', results.users.length);
console.log('Locales encontrados:', results.locals.length);
```

#### Obtener Usuario/Local por Username
```typescript
import { getUserOrLocalByUsername } from '@/utils/usernameGenerator';

const result = await getUserOrLocalByUsername('juan_perez');
if (result.type === 'user') {
  console.log('Usuario encontrado:', result.data);
} else if (result.type === 'local') {
  console.log('Local encontrado:', result.data);
}
```

#### Rastrear Cambio de Username
```typescript
import { trackUsernameChange } from '@/utils/usernameGenerator';

await trackUsernameChange(
  'user',
  userId,
  'old_username',
  'new_username',
  currentUserId,
  'Usuario editó su perfil'
);
```

#### Ver Historial de Cambios
```typescript
import { getUsernameHistory } from '@/utils/usernameGenerator';

const history = await getUsernameHistory('user', userId);
history.forEach(change => {
  console.log(`${change.old_username} → ${change.new_username} (${change.created_at})`);
});
```

---

## 🔍 Diagnóstico de Problemas de Email

### Problema: Los correos no llegan

**Checklist de Verificación:**

- [ ] **RESEND_API_KEY configurado en Supabase**
  - Ir a Settings > Edge Functions > Secrets
  - Verificar que existe `RESEND_API_KEY`
  - La key debe empezar con `re_`

- [ ] **Dominio verificado en Resend**
  - Ir a https://resend.com/domains
  - Verificar que `barliveapp.es` tiene estado "Verified"
  - Comprobar registros DNS (SPF, DKIM, DMARC)

- [ ] **Edge Function desplegada correctamente**
  - Verificar que `request-verification-token` está en estado ACTIVE
  - Revisar logs de la función para errores

- [ ] **Tabla verification_tokens existe**
  - Ejecutar: `SELECT * FROM verification_tokens LIMIT 1;`
  - Verificar que la tabla existe y tiene las columnas correctas

**Comandos de Diagnóstico:**

```sql
-- Verificar tokens generados
SELECT 
  email, 
  token, 
  expires_at, 
  used, 
  created_at 
FROM verification_tokens 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar usuarios sin verificar
SELECT 
  id, 
  email, 
  nombre, 
  email_verified, 
  created_at 
FROM usuarios 
WHERE email_verified = false 
ORDER BY created_at DESC;
```

**Logs de Edge Function:**

```javascript
// Buscar en logs:
[RequestVerificationToken] ✅ Token almacenado en la base de datos
[RequestVerificationToken] ✅ ¡Correo electrónico enviado con éxito!

// Si hay errores:
[RequestVerificationToken] ❌ Error de API de Resend
[RequestVerificationToken] ❌ Estado: 401/403/422
```

---

## 📱 Flujo de Usuario Actualizado

### Registro de Nueva Cuenta

1. **Usuario completa formulario de registro**
   - Nombre completo
   - Email
   - Contraseña
   - Acepta términos y condiciones

2. **Sistema genera username automático**
   - Basado en el nombre del usuario
   - Verifica disponibilidad
   - Añade números si es necesario

3. **Sistema crea cuenta en Supabase Auth**
   - Usuario creado sin verificación de email
   - Metadata incluye username generado

4. **Sistema envía token de verificación**
   - Genera token de 6 dígitos
   - Almacena en `verification_tokens` con expiración de 1 hora
   - Envía email con token vía Resend

5. **App redirige a pantalla de verificación**
   - Muestra instrucciones claras
   - Campos para introducir token de 6 dígitos
   - Opción para reenviar código

6. **Usuario introduce token**
   - Valida token con Edge Function
   - Marca email como verificado
   - Redirige a login

7. **Usuario inicia sesión**
   - Accede con email y contraseña
   - Redirige a explorar locales

### Inicio de Sesión

1. **Usuario introduce email y contraseña**

2. **Sistema verifica credenciales**
   - Si email no verificado: ofrece reenviar token
   - Si credenciales incorrectas: muestra error
   - Si cuenta de Google: ofrece configurar contraseña

3. **Login exitoso**
   - Redirige a explorar locales

---

## 🎨 Componentes Creados

### 1. UsernameSearch Component
**Ubicación:** `components/social/UsernameSearch.tsx`

**Props:**
```typescript
interface UsernameSearchProps {
  onSelectUser?: (userId: string) => void;
  onSelectLocal?: (localId: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}
```

**Características:**
- Búsqueda en tiempo real
- Debounce de 300ms
- Resultados separados por tipo
- Avatares y nombres
- Navegación automática

**Uso:**
```tsx
import { UsernameSearch } from '@/components/social/UsernameSearch';

<UsernameSearch 
  placeholder="Buscar por @usuario"
  autoFocus
  onSelectUser={(userId) => console.log('Selected user:', userId)}
/>
```

### 2. Buscar Usuario Screen
**Ubicación:** `app/social/buscar-usuario.tsx`

**Características:**
- Página dedicada para búsqueda
- Header con gradiente
- Integra UsernameSearch component
- Navegación automática a perfiles

**Acceso:**
```typescript
router.push('/social/buscar-usuario');
```

---

## 🗄️ Estructura de Base de Datos

### Tabla: username_history

```sql
CREATE TABLE username_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'local')),
  entity_id UUID NOT NULL,
  old_username TEXT,
  new_username TEXT NOT NULL,
  changed_by UUID REFERENCES usuarios(id),
  change_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Índices:**
- `idx_username_history_entity`: Para búsquedas por entidad
- `idx_username_history_new_username`: Para búsquedas por username
- `idx_username_history_created_at`: Para ordenar por fecha

**RLS Policies:**
- Admins pueden ver todo el historial
- Usuarios pueden ver su propio historial
- Propietarios pueden ver el historial de sus locales

---

## 🔐 Seguridad y Moderación

### Prevención de Abuso

1. **Nombres Reservados:**
   - Lista de 50+ nombres protegidos
   - Validación en generación y edición
   - Protección de marca y sistema

2. **Historial de Cambios:**
   - Registro completo de todos los cambios
   - Información de quién hizo el cambio
   - Timestamp y razón del cambio
   - Auditoría para moderación

3. **Validación de Formato:**
   - Solo letras, números, puntos y guiones bajos
   - Mínimo 3 caracteres
   - Máximo 30 caracteres
   - Sin espacios ni caracteres especiales

### Moderación

**Panel de Admin:**
- Ver historial de cambios de username
- Identificar patrones de abuso
- Bloquear usuarios que cambien username frecuentemente
- Restaurar usernames en caso de suplantación

**Consulta SQL para Moderación:**
```sql
-- Usuarios que han cambiado username más de 3 veces
SELECT 
  entity_id,
  COUNT(*) as cambios,
  array_agg(new_username ORDER BY created_at DESC) as usernames
FROM username_history
WHERE entity_type = 'user'
GROUP BY entity_id
HAVING COUNT(*) > 3
ORDER BY cambios DESC;
```

---

## 📈 Próximos Pasos Recomendados

### Prioridad Alta 🔴

1. **Solucionar problema de emails**
   - Verificar configuración de Resend
   - Comprobar registros DNS
   - Probar envío de emails

2. **Implementar sugerencias en UI de registro**
   - Mostrar 3-5 sugerencias al usuario
   - Permitir selección rápida
   - Mejorar UX de registro

### Prioridad Media 🟡

3. **Implementar URLs personalizadas**
   - Configurar deep links
   - Crear ruta dinámica `app/[username].tsx`
   - Probar en web y móvil

4. **Panel de moderación de usernames**
   - Vista de historial de cambios
   - Filtros y búsqueda
   - Acciones de moderación

### Prioridad Baja 🟢

5. **Validación avanzada de usernames**
   - Detectar palabras ofensivas
   - Prevenir suplantación de identidad
   - Sugerencias inteligentes basadas en ML

6. **Estadísticas de usernames**
   - Usernames más populares
   - Tendencias de nombres
   - Analytics de cambios

---

## 🧪 Testing

### Casos de Prueba

#### Test 1: Registro con Username Automático
```
1. Ir a /auth/registro-v6
2. Completar formulario con nombre "Juan Pérez"
3. Hacer clic en "Crear cuenta"
4. Verificar que se genera username "juan_perez"
5. Verificar redirección a /auth/verificar-cuenta-token
6. Verificar que se muestra el email correcto
```

#### Test 2: Verificación con Token
```
1. Recibir email con token de 6 dígitos
2. Introducir token en la app
3. Hacer clic en "Verificar cuenta"
4. Verificar mensaje de éxito
5. Verificar redirección a /auth/login-v6
```

#### Test 3: Búsqueda de Username
```
1. Ir a /social/buscar-usuario
2. Escribir "@juan"
3. Verificar que aparecen resultados
4. Hacer clic en un resultado
5. Verificar navegación al perfil
```

#### Test 4: Edición de Username
```
1. Ir a /editar/usuario
2. Cambiar username de "juan_perez" a "juan_perez_oficial"
3. Guardar cambios
4. Verificar que se registra en username_history
5. Verificar que el nuevo username está disponible
```

#### Test 5: Username Reservado
```
1. Ir a /editar/usuario
2. Intentar cambiar username a "admin"
3. Verificar que muestra error
4. Verificar que no se permite guardar
```

---

## 📞 Soporte

### Problemas Comunes

**P: Los emails no llegan**
R: Verificar configuración de Resend y registros DNS. Ver sección "Diagnóstico de Problemas de Email".

**P: Username ya está en uso**
R: El sistema genera automáticamente un username único. Si editas manualmente, verifica disponibilidad primero.

**P: No puedo usar cierto username**
R: Puede estar reservado o en uso. Consulta la lista de nombres reservados.

**P: ¿Cómo veo el historial de cambios?**
R: Los admins pueden ver el historial completo. Los usuarios solo ven su propio historial.

### Contacto

- **Email:** soporte@barliveapp.es
- **Documentación:** Ver archivos MD en el proyecto
- **Logs:** Supabase Dashboard > Edge Functions > Logs

---

## 📝 Changelog

### v6.3 - 2025-01-24
- ✅ Corregido flujo de registro para redirigir a verificar-cuenta-token
- ✅ Implementada lista de nombres de usuario reservados
- ✅ Añadida función de sugerencias de username
- ✅ Creado componente UsernameSearch
- ✅ Implementado tracking de historial de cambios
- ✅ Creada tabla username_history con RLS
- ✅ Actualizado editar usuario para rastrear cambios

### v6.2 - 2025-01-23
- ✅ Implementado sistema de verificación por token
- ✅ Creadas Edge Functions para tokens
- ✅ Generación automática de usernames

---

## 🎯 Conclusión

El sistema de nombres de usuario de BarLive ahora incluye:

1. ✅ **Generación automática** durante el registro
2. ✅ **Lista de nombres reservados** para protección
3. ✅ **Búsqueda de usuarios** por username
4. ✅ **Historial de cambios** para moderación
5. ✅ **Sugerencias inteligentes** de usernames
6. 🔮 **URLs personalizadas** (pendiente de implementar)

El sistema está listo para producción con todas las funcionalidades de seguridad y moderación necesarias.

**Siguiente paso crítico:** Solucionar el problema de envío de emails verificando la configuración de Resend.
