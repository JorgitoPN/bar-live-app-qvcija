
# 🗄️ Guía de Migración SQL - Sala Virtual

## 📋 Resumen

Esta migración crea la tabla `sala_virtual_interacciones` necesaria para el funcionamiento de las salas virtuales en la aplicación.

## 🚀 Cómo Aplicar la Migración

### Opción 1: Dashboard de Supabase (Recomendado)

1. **Accede a tu Dashboard de Supabase**
   - Ve a [https://app.supabase.com](https://app.supabase.com)
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en **SQL Editor**
   - Haz clic en **New query**

3. **Copia y Pega el SQL**
   - Abre el archivo `supabase/migrations/20240115_create_sala_virtual_interacciones.sql`
   - Copia todo el contenido
   - Pégalo en el editor SQL

4. **Ejecuta la Migración**
   - Haz clic en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
   - Verifica que aparezca el mensaje de éxito

### Opción 2: CLI de Supabase

```bash
# Si tienes Supabase CLI instalado
supabase db push

# O ejecuta el archivo directamente
psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f supabase/migrations/20240115_create_sala_virtual_interacciones.sql
```

## ✅ Verificar que la Migración Funcionó

### 1. Verificar que la Tabla Existe

```sql
-- Ejecuta esto en el SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'sala_virtual_interacciones';
```

**Resultado esperado:** Debe devolver una fila con `sala_virtual_interacciones`

### 2. Verificar la Estructura de la Tabla

```sql
-- Ver columnas de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sala_virtual_interacciones'
ORDER BY ordinal_position;
```

**Resultado esperado:**
```
column_name     | data_type                   | is_nullable
----------------|----------------------------|-------------
id              | uuid                       | NO
usuario_id      | uuid                       | NO
local_id        | uuid                       | NO
tipo            | text                       | NO
contenido       | text                       | NO
created_at      | timestamp with time zone   | NO
```

### 3. Verificar Índices

```sql
-- Ver índices de la tabla
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'sala_virtual_interacciones';
```

**Resultado esperado:** Debe mostrar 4 índices:
- `idx_sala_virtual_interacciones_local_id`
- `idx_sala_virtual_interacciones_usuario_id`
- `idx_sala_virtual_interacciones_created_at`
- `idx_sala_virtual_interacciones_tipo`

### 4. Verificar Políticas RLS

```sql
-- Ver políticas de seguridad
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'sala_virtual_interacciones';
```

**Resultado esperado:** Debe mostrar 3 políticas:
- `Anyone can view sala virtual interactions` (SELECT)
- `Authenticated users can insert sala virtual interactions` (INSERT)
- `Users can delete their own sala virtual interactions` (DELETE)

## 🧪 Probar la Tabla

### Insertar un Mensaje de Prueba

```sql
-- Reemplaza los UUIDs con IDs reales de tu base de datos
INSERT INTO sala_virtual_interacciones (usuario_id, local_id, tipo, contenido)
VALUES (
  'tu-usuario-id-aqui',
  'tu-local-id-aqui',
  'chat',
  'Mensaje de prueba'
);
```

### Ver Mensajes

```sql
-- Ver todos los mensajes
SELECT 
  i.*,
  u.nombre as usuario_nombre,
  l.nombre as local_nombre
FROM sala_virtual_interacciones i
LEFT JOIN usuarios u ON i.usuario_id = u.id
LEFT JOIN locales l ON i.local_id = l.id
ORDER BY i.created_at DESC
LIMIT 10;
```

### Eliminar Mensaje de Prueba

```sql
-- Eliminar el mensaje de prueba
DELETE FROM sala_virtual_interacciones
WHERE contenido = 'Mensaje de prueba';
```

## 🔧 Solución de Problemas

### Error: "relation already exists"

Si ves este error, significa que la tabla ya existe. Puedes:

1. **Verificar si la tabla existe:**
   ```sql
   SELECT * FROM sala_virtual_interacciones LIMIT 1;
   ```

2. **Si necesitas recrearla:**
   ```sql
   -- ⚠️ CUIDADO: Esto eliminará todos los datos
   DROP TABLE IF EXISTS sala_virtual_interacciones CASCADE;
   
   -- Luego ejecuta la migración completa de nuevo
   ```

### Error: "permission denied"

Si ves este error, verifica que:
1. Estás conectado como usuario `postgres` o con permisos de administrador
2. Tu proyecto de Supabase está activo y accesible

### Error: "foreign key constraint"

Si ves este error al insertar datos:
1. Verifica que el `usuario_id` existe en la tabla `usuarios`
2. Verifica que el `local_id` existe en la tabla `locales`

```sql
-- Verificar usuario
SELECT id, nombre FROM usuarios WHERE id = 'tu-usuario-id';

-- Verificar local
SELECT id, nombre FROM locales WHERE id = 'tu-local-id';
```

## 📊 Estructura de la Tabla

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (generado automáticamente) |
| `usuario_id` | UUID | ID del usuario que envió la interacción |
| `local_id` | UUID | ID del local donde se envió la interacción |
| `tipo` | TEXT | Tipo de interacción: 'mensaje', 'emoticon', 'chat' |
| `contenido` | TEXT | Contenido de la interacción |
| `created_at` | TIMESTAMP | Fecha y hora de creación (UTC) |

### Restricciones

- `usuario_id` debe existir en la tabla `usuarios`
- `local_id` debe existir en la tabla `locales`
- `tipo` debe ser uno de: 'mensaje', 'emoticon', 'chat'

### Índices

- **local_id**: Para consultas rápidas por local
- **usuario_id**: Para consultas rápidas por usuario
- **created_at**: Para ordenar por fecha (DESC)
- **tipo**: Para filtrar por tipo de interacción

### Políticas de Seguridad (RLS)

1. **SELECT**: Cualquiera puede ver las interacciones (chat público)
2. **INSERT**: Solo usuarios autenticados pueden insertar
3. **DELETE**: Solo el autor puede eliminar sus propias interacciones

## 🎯 Uso en la Aplicación

Una vez aplicada la migración, la aplicación podrá:

1. **Enviar mensajes rápidos** en la sala virtual
2. **Enviar emoticones** que flotan en la pantalla
3. **Chatear en tiempo real** con otros usuarios en el local
4. **Ver actividad reciente** de otros usuarios
5. **Eliminar mensajes propios** del chat

## 📝 Notas Importantes

- Los mensajes se eliminan automáticamente después de 30 minutos (implementado en la aplicación)
- Los check-ins se eliminan automáticamente después de 6 horas
- Las interacciones se sincronizan en tiempo real usando Supabase Realtime
- Los mensajes eliminados se propagan automáticamente a todos los clientes conectados

## 🔄 Rollback (Deshacer la Migración)

Si necesitas deshacer la migración:

```sql
-- ⚠️ CUIDADO: Esto eliminará todos los datos de la tabla
DROP TABLE IF EXISTS sala_virtual_interacciones CASCADE;
```

## 📞 Soporte

Si tienes problemas con la migración:
1. Verifica que tu proyecto de Supabase esté activo
2. Revisa los logs de error en el SQL Editor
3. Consulta la documentación de Supabase: https://supabase.com/docs
4. Revisa el archivo `docs/ENRICHMENT_FIXES_2024.md` para más detalles
