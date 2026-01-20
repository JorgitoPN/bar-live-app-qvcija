
# Guía de Inicio Rápido - BarLive

## Problema: La app tarda mucho en iniciar

Si la aplicación tarda mucho en iniciar o no muestra el código QR en Natively, sigue estos pasos:

### Solución 1: Usar Túnel (Recomendado para Natively)

```bash
npm run tunnel
```

Esto iniciará la app con un túnel ngrok que funciona mejor en entornos como Natively.

### Solución 2: Conexión Local

```bash
npm run dev
```

Luego escanea el código QR con Expo Go.

### Solución 3: Conexión Manual

Si el QR no aparece, puedes conectarte manualmente:

1. Abre Expo Go en tu dispositivo
2. Toca "Enter URL manually"
3. Ingresa la URL que aparece en la terminal (ejemplo: exp://192.168.1.100:8081)

### Verificar que todo funciona

La aplicación ahora muestra una pantalla de carga mejorada mientras se inicializa:
- Logo animado de BarLive
- Indicador de progreso
- Mensajes informativos

### Tiempos de carga esperados

- Primera carga: 3-5 segundos
- Cargas subsecuentes: 1-2 segundos

### Solución de problemas

Si la app sigue sin cargar:

1. **Verifica tu conexión a internet**
2. **Reinicia el servidor de desarrollo**: Ctrl+C y luego `npm run dev`
3. **Limpia la caché**: `npm run dev -- --clear`
4. **Verifica que Expo Go esté actualizado** en tu dispositivo

### Comandos útiles

```bash
# Iniciar con túnel (mejor para Natively)
npm run tunnel

# Iniciar normal
npm run dev

# Limpiar caché e iniciar
npm run dev -- --clear

# Ver en Android
npm run android

# Ver en iOS
npm run ios

# Ver en web
npm run web
```

## Mejoras implementadas

1. ✅ Pantalla de carga optimizada con animaciones suaves
2. ✅ Mejor manejo de la inicialización de la app
3. ✅ Mensajes informativos durante la carga
4. ✅ Soporte para túnel ngrok (mejor para Natively)
5. ✅ Tiempos de carga reducidos

## Notas importantes

- La primera vez que abres la app puede tardar un poco más mientras descarga los assets
- Las cargas subsecuentes serán mucho más rápidas
- Si usas Natively, el modo túnel (`npm run tunnel`) es el más confiable
