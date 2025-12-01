
# 🌐 Plantillas Web para BarLive

Estas son las páginas HTML que necesitas crear para tu dominio.

---

## 📄 1. Landing Page (index.html)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BarLive - Descubre la mejor vida nocturna</title>
    <meta name="description" content="Encuentra los mejores bares y discotecas cerca de ti con BarLive">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            text-align: center;
        }
        .logo {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        h1 {
            font-size: 36px;
            margin-bottom: 20px;
        }
        p {
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 30px;
            color: #cccccc;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        .feature {
            background: rgba(255, 255, 255, 0.05);
            padding: 30px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
        .feature-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }
        .feature h3 {
            font-size: 20px;
            margin-bottom: 10px;
        }
        .feature p {
            font-size: 14px;
            color: #aaaaaa;
        }
        .download-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 40px;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 15px 30px;
            background: #FF6B35;
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 107, 53, 0.3);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
        }
        footer {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: #888888;
            font-size: 14px;
        }
        footer a {
            color: #FF6B35;
            text-decoration: none;
        }
        footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🍺 BarLive</div>
        <h1>Descubre la mejor vida nocturna</h1>
        <p>Encuentra bares, discotecas y eventos cerca de ti. Comparte experiencias y conecta con otros amantes de la noche.</p>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🗺️</div>
                <h3>Explora</h3>
                <p>Descubre locales cerca de ti con nuestro mapa interactivo</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🎉</div>
                <h3>Eventos</h3>
                <p>No te pierdas ningún evento especial o promoción</p>
            </div>
            <div class="feature">
                <div class="feature-icon">⭐</div>
                <h3>Reseñas</h3>
                <p>Lee opiniones reales de otros usuarios</p>
            </div>
            <div class="feature">
                <div class="feature-icon">📸</div>
                <h3>Comparte</h3>
                <p>Sube fotos y comparte tus mejores momentos</p>
            </div>
        </div>

        <div class="download-buttons">
            <a href="https://play.google.com/store/apps/details?id=com.tuempresa.barlive" class="btn">
                <span>📱</span>
                Descargar en Google Play
            </a>
            <a href="https://apps.apple.com/app/barlive/id123456789" class="btn">
                <span>🍎</span>
                Descargar en App Store
            </a>
        </div>

        <footer>
            <p>
                <a href="/legal/privacidad.html">Política de Privacidad</a> | 
                <a href="/legal/terminos.html">Términos de Servicio</a> | 
                <a href="mailto:soporte@barlive.es">Contacto</a>
            </p>
            <p>&copy; 2025 BarLive. Todos los derechos reservados.</p>
        </footer>
    </div>
</body>
</html>
```

---

## ✅ 2. Email Confirmed (email-confirmed.html)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Confirmado - BarLive</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 500px;
            text-align: center;
            background: rgba(255, 255, 255, 0.05);
            padding: 60px 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        .icon {
            font-size: 80px;
            margin-bottom: 30px;
            animation: bounce 1s ease-in-out;
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        h1 {
            font-size: 32px;
            margin-bottom: 20px;
            color: #FF6B35;
        }
        p {
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 30px;
            color: #cccccc;
        }
        .btn {
            display: inline-block;
            padding: 15px 40px;
            background: #FF6B35;
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 107, 53, 0.3);
        }
        .info {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 14px;
            color: #888888;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>¡Email Confirmado!</h1>
        <p>Tu dirección de email ha sido verificada exitosamente. Ya puedes acceder a todas las funciones de BarLive.</p>
        <a href="barlive://auth/callback" class="btn">Abrir BarLive</a>
        <div class="info">
            <p>Si el botón no funciona, abre la app BarLive manualmente desde tu dispositivo.</p>
        </div>
    </div>

    <script>
        // Intentar abrir la app automáticamente
        setTimeout(() => {
            window.location.href = 'barlive://auth/callback';
        }, 1000);
    </script>
</body>
</html>
```

---

## 🔄 3. Auth Callback (auth/callback.html)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirigiendo - BarLive</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 500px;
            text-align: center;
        }
        .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255, 107, 53, 0.2);
            border-top-color: #FF6B35;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 30px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        h1 {
            font-size: 28px;
            margin-bottom: 15px;
        }
        p {
            font-size: 16px;
            color: #cccccc;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>Redirigiendo...</h1>
        <p>Serás redirigido a la app en un momento.</p>
    </div>

    <script>
        // Extraer el token de la URL
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        
        // Construir la URL de deep link con los parámetros
        const deepLink = `barlive://auth/callback${hash}`;
        
        // Redirigir a la app
        setTimeout(() => {
            window.location.href = deepLink;
        }, 500);
    </script>
</body>
</html>
```

---

## 📜 4. Política de Privacidad (legal/privacidad.html)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Política de Privacidad - BarLive</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: #333333;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: white;
            min-height: 100vh;
        }
        h1 {
            font-size: 36px;
            margin-bottom: 10px;
            color: #FF6B35;
        }
        .last-updated {
            color: #888888;
            margin-bottom: 30px;
        }
        h2 {
            font-size: 24px;
            margin-top: 30px;
            margin-bottom: 15px;
            color: #1a1a1a;
        }
        p {
            margin-bottom: 15px;
        }
        ul {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        li {
            margin-bottom: 8px;
        }
        a {
            color: #FF6B35;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #FF6B35;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">← Volver a inicio</a>
        
        <h1>Política de Privacidad</h1>
        <p class="last-updated">Última actualización: 1 de enero de 2025</p>

        <h2>1. Introducción</h2>
        <p>En BarLive, nos tomamos muy en serio la privacidad de nuestros usuarios. Esta Política de Privacidad explica cómo recopilamos, usamos, compartimos y protegemos tu información personal.</p>

        <h2>2. Información que Recopilamos</h2>
        <p>Recopilamos la siguiente información:</p>
        <ul>
            <li><strong>Información de cuenta:</strong> Email, nombre de usuario, contraseña (encriptada)</li>
            <li><strong>Información de perfil:</strong> Foto de perfil, biografía, preferencias</li>
            <li><strong>Contenido generado:</strong> Publicaciones, comentarios, reseñas, fotos</li>
            <li><strong>Información de ubicación:</strong> Ubicación aproximada para mostrar locales cercanos</li>
            <li><strong>Información de uso:</strong> Interacciones con la app, locales visitados, favoritos</li>
        </ul>

        <h2>3. Cómo Usamos tu Información</h2>
        <p>Usamos tu información para:</p>
        <ul>
            <li>Proporcionar y mejorar nuestros servicios</li>
            <li>Personalizar tu experiencia</li>
            <li>Comunicarnos contigo sobre actualizaciones y promociones</li>
            <li>Garantizar la seguridad de la plataforma</li>
            <li>Cumplir con obligaciones legales</li>
        </ul>

        <h2>4. Compartir Información</h2>
        <p>No vendemos tu información personal. Podemos compartir información con:</p>
        <ul>
            <li><strong>Otros usuarios:</strong> Tu perfil público y contenido que publiques</li>
            <li><strong>Proveedores de servicios:</strong> Para hosting, análisis y soporte</li>
            <li><strong>Autoridades legales:</strong> Cuando sea requerido por ley</li>
        </ul>

        <h2>5. Seguridad</h2>
        <p>Implementamos medidas de seguridad técnicas y organizativas para proteger tu información, incluyendo encriptación, autenticación segura y controles de acceso.</p>

        <h2>6. Tus Derechos</h2>
        <p>Tienes derecho a:</p>
        <ul>
            <li>Acceder a tu información personal</li>
            <li>Corregir información inexacta</li>
            <li>Solicitar la eliminación de tu cuenta</li>
            <li>Oponerte al procesamiento de tus datos</li>
            <li>Exportar tus datos</li>
        </ul>

        <h2>7. Cookies y Tecnologías Similares</h2>
        <p>Usamos cookies y tecnologías similares para mejorar tu experiencia, analizar el uso de la app y personalizar contenido.</p>

        <h2>8. Cambios a esta Política</h2>
        <p>Podemos actualizar esta política ocasionalmente. Te notificaremos de cambios significativos a través de la app o por email.</p>

        <h2>9. Contacto</h2>
        <p>Si tienes preguntas sobre esta política, contáctanos en:</p>
        <p>Email: <a href="mailto:privacidad@barlive.es">privacidad@barlive.es</a></p>

        <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeeee; color: #888888;">
            &copy; 2025 BarLive. Todos los derechos reservados.
        </p>
    </div>
</body>
</html>
```

---

## 📋 5. Términos de Servicio (legal/terminos.html)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Términos de Servicio - BarLive</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: #333333;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: white;
            min-height: 100vh;
        }
        h1 {
            font-size: 36px;
            margin-bottom: 10px;
            color: #FF6B35;
        }
        .last-updated {
            color: #888888;
            margin-bottom: 30px;
        }
        h2 {
            font-size: 24px;
            margin-top: 30px;
            margin-bottom: 15px;
            color: #1a1a1a;
        }
        p {
            margin-bottom: 15px;
        }
        ul {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        li {
            margin-bottom: 8px;
        }
        a {
            color: #FF6B35;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #FF6B35;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">← Volver a inicio</a>
        
        <h1>Términos de Servicio</h1>
        <p class="last-updated">Última actualización: 1 de enero de 2025</p>

        <h2>1. Aceptación de los Términos</h2>
        <p>Al acceder y usar BarLive, aceptas estar sujeto a estos Términos de Servicio y a nuestra Política de Privacidad.</p>

        <h2>2. Descripción del Servicio</h2>
        <p>BarLive es una plataforma social que permite a los usuarios descubrir bares, discotecas y eventos, compartir experiencias y conectar con otros usuarios.</p>

        <h2>3. Requisitos de Cuenta</h2>
        <ul>
            <li>Debes tener al menos 18 años para usar BarLive</li>
            <li>Debes proporcionar información precisa y actualizada</li>
            <li>Eres responsable de mantener la seguridad de tu cuenta</li>
            <li>No puedes compartir tu cuenta con otros</li>
        </ul>

        <h2>4. Conducta del Usuario</h2>
        <p>Al usar BarLive, aceptas NO:</p>
        <ul>
            <li>Publicar contenido ilegal, ofensivo o inapropiado</li>
            <li>Acosar, intimidar o amenazar a otros usuarios</li>
            <li>Suplantar la identidad de otra persona</li>
            <li>Usar la plataforma para spam o publicidad no autorizada</li>
            <li>Intentar acceder a cuentas de otros usuarios</li>
            <li>Interferir con el funcionamiento de la plataforma</li>
        </ul>

        <h2>5. Contenido del Usuario</h2>
        <ul>
            <li>Eres responsable del contenido que publicas</li>
            <li>Nos otorgas una licencia para usar, mostrar y distribuir tu contenido</li>
            <li>Nos reservamos el derecho de eliminar contenido que viole estos términos</li>
            <li>Puedes eliminar tu contenido en cualquier momento</li>
        </ul>

        <h2>6. Propiedad Intelectual</h2>
        <p>BarLive y su contenido original son propiedad de BarLive y están protegidos por leyes de propiedad intelectual.</p>

        <h2>7. Limitación de Responsabilidad</h2>
        <p>BarLive se proporciona "tal cual" sin garantías de ningún tipo. No somos responsables de:</p>
        <ul>
            <li>Daños directos o indirectos derivados del uso de la plataforma</li>
            <li>Contenido generado por usuarios</li>
            <li>Interrupciones del servicio</li>
            <li>Pérdida de datos</li>
        </ul>

        <h2>8. Terminación</h2>
        <p>Podemos suspender o terminar tu cuenta si violas estos términos. Puedes eliminar tu cuenta en cualquier momento desde la configuración de la app.</p>

        <h2>9. Modificaciones</h2>
        <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos de cambios significativos.</p>

        <h2>10. Ley Aplicable</h2>
        <p>Estos términos se rigen por las leyes de España. Cualquier disputa se resolverá en los tribunales de [Tu Ciudad].</p>

        <h2>11. Contacto</h2>
        <p>Si tienes preguntas sobre estos términos, contáctanos en:</p>
        <p>Email: <a href="mailto:legal@barlive.es">legal@barlive.es</a></p>

        <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeeee; color: #888888;">
            &copy; 2025 BarLive. Todos los derechos reservados.
        </p>
    </div>
</body>
</html>
```

---

## 🚀 Instrucciones de Deploy

### Para Vercel:

1. Crea una carpeta `public/` en tu proyecto
2. Copia todos estos archivos HTML a la carpeta `public/`
3. Estructura:
```
public/
├── index.html
├── email-confirmed.html
├── auth/
│   └── callback.html
└── legal/
    ├── privacidad.html
    └── terminos.html
```
4. Deploy: `vercel --prod`

### Para Netlify:

1. Crea una carpeta con todos los archivos HTML
2. Arrastra la carpeta a Netlify
3. O usa Netlify CLI: `netlify deploy --prod`

### Para Cloudflare Pages:

1. Sube los archivos a tu repositorio GitHub
2. Conecta el repositorio en Cloudflare Pages
3. Deploy automático

---

## ✅ Checklist

- [ ] Crear carpeta `public/`
- [ ] Copiar `index.html`
- [ ] Copiar `email-confirmed.html`
- [ ] Crear carpeta `auth/` y copiar `callback.html`
- [ ] Crear carpeta `legal/` y copiar `privacidad.html` y `terminos.html`
- [ ] Reemplazar `barlive.es` con tu dominio real
- [ ] Reemplazar `com.tuempresa.barlive` con tu package name
- [ ] Actualizar links de App Store y Google Play
- [ ] Deploy a tu hosting
- [ ] Verificar que todas las páginas funcionan
- [ ] Verificar HTTPS

---

**¡Listo! Tus páginas web están preparadas para producción. 🎉**
