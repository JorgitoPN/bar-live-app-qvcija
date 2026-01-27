
# ⚡ QUICK REFERENCE v66.0

## 🎯 CAMBIOS CRÍTICOS EN 30 SEGUNDOS

### iOS:
- ✅ App inicia en Explorar (no menú de modales)
- ✅ Sin cambios visuales

### Android:
- ✅ Textos 45% más pequeños
- ✅ Iconos 40% más pequeños
- ✅ Cajas de búsqueda 60% más compactas
- ✅ Tarjetas de locales con imagen 45% más pequeña
- ✅ Menú inferior con cobertura del 65%

---

## 📐 FÓRMULAS RÁPIDAS

### Para Textos:
```typescript
fontSize: Platform.OS === 'ios' ? X : X * 0.55
```

### Para Iconos:
```typescript
size={Platform.OS === 'ios' ? Y : Y * 0.60}
```

### Para Padding:
```typescript
padding: Platform.OS === 'ios' ? Z : Math.round(Z * 0.625)
```

---

## 🔍 VERIFICACIÓN RÁPIDA

### iOS (1 minuto):
1. Abre app → ¿Va a Explorar? ✅
2. ¿No hay menú de modales? ✅
3. ¿Todo igual que antes? ✅

### Android (2 minutos):
1. ¿Tarjetas de locales más pequeñas? ✅
2. ¿Caja de búsqueda compacta? ✅
3. ¿Menú inferior al 65%? ✅

---

## 📊 TABLA DE TAMAÑOS

| Elemento | iOS | Android |
|----------|-----|---------|
| Header Title | 32px | 17.6px |
| Body Text | 16px | 8.8px |
| Caption | 14px | 7.7px |
| Badge | 12px | 6.6px |
| Header Icon | 24px | 14.4px |
| Regular Icon | 20px | 12px |
| Card Image | 200px | 110px |
| Search Box | ~50px | ~30px |

---

## 🐛 SOLUCIÓN RÁPIDA DE PROBLEMAS

### iOS muestra menú de modales:
→ Reinicia Expo Go completamente

### Android textos muy grandes:
→ Verifica que uses Platform.OS

### Menú inferior desbordado:
→ Verifica coveragePercent = 0.65

---

## 📁 ARCHIVOS CLAVE

1. `app/index.tsx` - Redirect a explorar
2. `app/_layout.tsx` - Modales condicionales
3. `styles/commonStyles.ts` - Tamaños estandarizados
4. `components/navigation/TabNavigationBar.tsx` - Menú inferior
5. `components/home/TarjetaLocal.tsx` - Tarjetas de locales

---

## ✅ CHECKLIST MÍNIMO

- [ ] iOS: App inicia en Explorar
- [ ] iOS: Sin menú de modales
- [ ] Android: Tarjetas más pequeñas
- [ ] Android: Búsqueda compacta
- [ ] Android: Menú al 65%

---

**Versión**: v66.0  
**Uso**: Referencia Rápida  
**Tiempo de lectura**: 30 segundos
