
# 📦 Instrucciones para Desplegar en Render

## 🎯 Objetivo

Desplegar la versión web de tu app React Native + Expo en Render.

**Tiempo estimado:** 10 minutos

---

## 📋 Paso a Paso

### 1. Preparar el Repositorio

Tu repositorio ya está listo. Solo asegúrate de que:

- ✅ El código está en GitHub: `JorgitoPN/bar-live-app-qvcija`
- ✅ La rama principal es `main`
- ✅ El archivo `package.json` existe en la raíz

### 2. Crear el Static Site en Render

1. Ve a: https://dashboard.render.com/
2. Haz clic en **New +** (botón azul arriba a la derecha)
3. Selecciona **Static Site**

### 3. Conectar el Repositorio

1. Si es la primera vez, haz clic en **Connect GitHub**
2. Autoriza a Render para acceder a tu cuenta de GitHub
3. Busca y selecciona: `JorgitoPN/bar-live-app-qvcija`
4. Haz clic en **Connect**

### 4. Configurar el Static Site

Completa el formulario con estos valores exactos:

#### Información Básica

**Name:**
```
bar-live-app-qvcija
```
(Puedes usar el nombre que quieras, pero este es el que sugeriste)

**Branch:**
```
main
```

**Root Directory:**
```
(dejar vacío)
```

#### Build Settings

**Build Command:**
```
npx expo export -p web
```

**Publish Directory:**
```
dist
```

#### Variables de Entorno

Haz clic en **Add Environment Variable** y agrega estas dos variables:

**Variable 1:**
- Name: `EXPO_PUBLIC_SUPABASE_URL`
- Value: `https://embntaqwlwmgazvrglaf.supabase.co`

**Variable 2:**
- Name: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Value: (tu anon key - la encuentras en Supabase Dashboard → Settings → API)

Para obtener tu anon key:
1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/api
2. Copia el valor de **anon public**
3. Pégalo en Render

### 5. Configuración Avanzada (Opcional)

Haz clic en **Advanced** y configura:

**Auto-Deploy:**
- ✅ **Yes** (para que se despliegue automáticamente cuando hagas push a GitHub)

**Pull Request Previews:**
- ❌ **No** (a menos que quieras previews de PRs)

### 6. Crear el Static Site

1. Revisa que todo esté correcto
2. Haz clic en **Create Static Site** (botón azul abajo)
3. Espera a que termine el deploy (5-10 minutos)

### 7. Verificar el Deploy

1. Una vez que termine, verás un mensaje: **Live** con un ícono verde
2. Haz clic en la URL que te da Render (algo como `https://bar-live-app-qvcija.onrender.com`)
3. Verifica que tu app carga correctamente

---

## 🔗 Configurar Dominio Personalizado

### Paso 1: Agregar Custom Domain en Render

1. En tu Static Site, ve a **Settings** (menú lateral izquierdo)
2. Scroll hasta **Custom Domain**
3. Haz clic en **Add Custom Domain**
4. Ingresa: `barliveapp.es`
5. Haz clic en **Save**
6. Repite para agregar: `www.barliveapp.es`

### Paso 2: Obtener la IP de Render

Render te mostrará algo como:

```
Add the following DNS records to your domain provider:

Type: A
Name: @
Value: 216.24.57.1

Type: CNAME
Name: www
Value: bar-live-app-qvcija.onrender.com
```

**Anota estos valores** porque los necesitarás para configurar IONOS.

### Paso 3: Configurar DNS en IONOS

Ve a IONOS y agrega estos registros DNS:

**Record 1: Dominio principal**
- Type: `A`
- Host: `@` (o dejar vacío)
- Points to: `216.24.57.1` (la IP que te dio Render)
- TTL: `3600`

**Record 2: Subdominio www**
- Type: `CNAME`
- Host: `www`
- Points to: `bar-live-app-qvcija.onrender.com` (sin https://)
- TTL: `3600`

### Paso 4: Esperar Verificación

1. Vuelve a Render
2. En **Custom Domain**, verás el estado de tus dominios
3. Espera a que cambien a **Verified** (puede tardar hasta 24 horas)
4. Una vez verificados, Render generará automáticamente certificados SSL

---

## 🔄 Actualizar la App

Cada vez que hagas cambios en tu código:

1. Haz commit y push a GitHub:
   ```bash
   git add .
   git commit -m "Descripción de los cambios"
   git push origin main
   ```

2. Render detectará el cambio automáticamente
3. Iniciará un nuevo deploy
4. En 5-10 minutos, los cambios estarán en producción

---

## 📊 Monitorear el Deploy

### Ver Logs

1. Ve a tu Static Site en Render
2. Haz clic en **Logs** (menú lateral izquierdo)
3. Verás los logs en tiempo real

### Ver Métricas

1. Ve a tu Static Site en Render
2. Haz clic en **Metrics** (menú lateral izquierdo)
3. Verás:
   - Requests por minuto
   - Bandwidth usado
   - Tiempo de respuesta

---

## 🐛 Solución de Problemas

### Error: "Build failed"

**Causa:** Problema en el build command

**Solución:**
1. Ve a **Settings** → **Build & Deploy**
2. Verifica que el Build Command sea: `npx expo export -p web`
3. Verifica que el Publish Directory sea: `dist`
4. Haz clic en **Save Changes**
5. Haz clic en **Manual Deploy** → **Deploy latest commit**

### Error: "Environment variables not found"

**Causa:** Faltan las variables de entorno

**Solución:**
1. Ve a **Environment** (menú lateral izquierdo)
2. Verifica que existan:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Si faltan, agrégalas
4. Haz clic en **Save Changes**
5. Haz clic en **Manual Deploy** → **Deploy latest commit**

### Error: "Domain not verified"

**Causa:** Los registros DNS no están configurados correctamente

**Solución:**
1. Ve a IONOS y verifica los registros DNS
2. Asegúrate de que:
   - El registro A apunta a la IP correcta
   - El registro CNAME apunta al dominio correcto de Render
3. Espera hasta 24 horas para que se propaguen los cambios
4. Usa https://dnschecker.org/ para verificar la propagación

### Error: "SSL certificate not issued"

**Causa:** El dominio no está verificado

**Solución:**
1. Espera a que el dominio se verifique (hasta 24 horas)
2. Una vez verificado, Render generará el certificado automáticamente
3. Si después de 24 horas no se genera, contacta a Render Support

---

## 📝 Notas Importantes

1. **Plan Free de Render:**
   - ✅ Gratis para Static Sites
   - ✅ SSL automático
   - ✅ CDN global
   - ✅ Auto-deploy desde GitHub
   - ⚠️ Se suspende después de 15 minutos de inactividad (pero se reactiva automáticamente)

2. **Límites del Plan Free:**
   - 100 GB de bandwidth por mes
   - 400 horas de build por mes
   - Suficiente para la mayoría de apps

3. **Upgrade a Plan Paid (Opcional):**
   - Si necesitas más recursos, puedes upgradear a $7/mes
   - Incluye:
     - Sin suspensión por inactividad
     - Más bandwidth
     - Soporte prioritario

---

## ✅ Checklist Final

- [ ] Static Site creado en Render
- [ ] Build Command configurado: `npx expo export -p web`
- [ ] Publish Directory configurado: `dist`
- [ ] Variables de entorno agregadas
- [ ] Deploy completado exitosamente
- [ ] App accesible en la URL de Render
- [ ] Custom domain agregado
- [ ] DNS configurado en IONOS
- [ ] Dominio verificado en Render
- [ ] SSL certificate generado
- [ ] App accesible en `https://barliveapp.es`

---

## 🎉 ¡Listo!

Tu app está desplegada en Render y accesible desde tu dominio personalizado.

**URL de producción:** https://barliveapp.es

---

## 📞 Soporte

Si tienes problemas:

1. **Render Docs:** https://render.com/docs/static-sites
2. **Render Support:** https://render.com/support
3. **Render Community:** https://community.render.com/

---

**¡Éxito con tu deploy! 🚀**
