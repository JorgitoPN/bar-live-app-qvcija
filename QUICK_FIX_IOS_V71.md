
# ⚡ Quick Fix iOS - v71.0

## 🎯 Problema
App muestra "Building the app..." en iOS en lugar de la app real.

## ✅ Solución (Ya Aplicada)
Eliminados 6 archivos de demo que sobrescribían las pantallas en iOS.

## 🚀 Cómo Probar

```bash
# 1. Limpiar caché
npx expo start -c

# 2. En iOS: Cerrar Expo Go completamente
# 3. Escanear QR nuevamente
```

## ✅ Resultado Esperado
- Pantalla "BarLive" con lista de locales
- 5 tabs: Eventos, Favoritos, Explorar, Social, Perfil
- Filtros: Todos, Bares, Restaurantes, etc.

## ❌ Si Persiste

```bash
# Limpiar todo
rm -rf .expo
rm -rf node_modules/.cache
npx expo start -c

# Verificar archivos iOS
find . -name "*.ios.tsx" -not -path "./node_modules/*"
# Resultado esperado: (vacío)
```

## 📋 Archivos Eliminados
1. `app/(tabs)/(home)/index.ios.tsx`
2. `app/(tabs)/profile.ios.tsx`
3. `app/(tabs)/_layout.ios.tsx`
4. `components/DemoCard.tsx`
5. `components/HeaderButtons.tsx`
6. `components/homeData.ts`

## 🔍 Causa Raíz
Los archivos `.ios.tsx` tienen prioridad sobre `.tsx` en iOS.
Los archivos de demo estaban sobrescribiendo las pantallas reales.

---

**v71.0** | ✅ Implementado | 📱 Solo iOS
