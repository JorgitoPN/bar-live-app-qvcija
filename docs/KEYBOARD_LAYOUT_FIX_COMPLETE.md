
# ✅ SISTEMA DE LAYOUT DEL TECLADO - ARREGLADO COMPLETAMENTE

## 🎯 Objetivo Conseguido

El sistema de layout del teclado ahora funciona **exactamente como WhatsApp o Telegram**:

- ✅ El campo de texto **siempre** queda exactamente encima del teclado
- ✅ **Nunca** queda oculto
- ✅ Funciona con la **barra predictiva de Android** (Gboard)
- ✅ Funciona en **Android e iOS**

---

## 🔧 Problema Identificado y Solucionado

### ❌ Problema Anterior

1. **Hook existente pero mal usado**: El hook `useKeyboardHeight` existía pero las pantallas no lo usaban correctamente
2. **Cálculo incorrecto en Android**: No se detectaba la altura completa del teclado incluyendo la barra predictiva
3. **Layout incorrecto**: El input container no estaba posicionado correctamente con `position: 'absolute'`
4. **Padding dinámico faltante**: El FlatList no ajustaba su padding correctamente

### ✅ Solución Implementada

#### 1. **Hook `useKeyboardHeight` Mejorado** (`hooks/useKeyboardHeight.ts`)

**Cambios clave:**
```typescript
// ✅ ANDROID: Calcula la altura REAL del teclado
const calculatedHeight = screenHeight - currentWindowHeight;
const actualHeight = Math.max(reportedHeight, calculatedHeight);

// ✅ Esto incluye:
// - Teclado base
// - Barra de palabras predictivas (Gboard)
// - Barra de emojis
// - Extensiones del teclado
```

**Cómo funciona:**
- **iOS**: Usa `endCoordinates.height` directamente (es preciso)
- **Android**: Compara `Dimensions.get('screen').height` vs `Dimensions.get('window').height`
  - La diferencia = altura REAL del teclado (incluye barra predictiva)

#### 2. **Estructura de Layout Correcta**

```tsx
// ✅ ESTRUCTURA CORRECTA PARA PANTALLAS DE CHAT/COMENTARIOS

const { keyboardHeight, keyboardVisible } = useKeyboardHeight();
const insets = useSafeAreaInsets();

return (
  <View style={{ flex: 1 }}>  {/* ✅ Contenedor principal con flex: 1 */}
    
    {/* ✅ Lista de mensajes con padding dinámico */}
    <FlatList
      data={messages}
      contentContainerStyle={{
        paddingBottom: keyboardVisible
          ? keyboardHeight  // Cuando teclado abierto: espacio para el teclado
          : inputContainerHeight + insets.bottom  // Cuando cerrado: espacio para input + safe area
      }}
    />

    {/* ✅ Input container con posición absoluta */}
    <View
      style={[
        styles.inputContainer,
        {
          bottom: keyboardHeight,  // ✅ Se mueve con el teclado
          paddingBottom: keyboardVisible ? 0 : insets.bottom  // ✅ Safe area solo cuando cerrado
        }
      ]}
      onLayout={(e) => setInputContainerHeight(e.nativeEvent.layout.height)}
    >
      <TextInput
        placeholder="Escribe un mensaje..."
        blurOnSubmit={false}  // ✅ Teclado permanece abierto al enviar
      />
      <TouchableOpacity onPress={handleSend}>
        <Text>Enviar</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  inputContainer: {
    position: 'absolute',  // ✅ CRÍTICO: Posición absoluta
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    // bottom: keyboardHeight (dinámico en el componente)
    // paddingBottom: insets.bottom (dinámico en el componente)
  },
});
```

---

## 📱 Configuración de Android

### AndroidManifest.xml

```xml
<activity
  android:name=".MainActivity"
  android:windowSoftInputMode="adjustResize"  <!-- ✅ CRÍTICO -->
  ...
>
```

**¿Por qué `adjustResize`?**
- Hace que Android redimensione la ventana cuando aparece el teclado
- Permite que `Dimensions.get('window').height` refleje el cambio
- Sin esto, no podemos calcular la altura real del teclado

---

## 🎨 Pantallas Corregidas

Las siguientes pantallas ya están usando el sistema correcto:

1. ✅ `app/detalle/sala-virtual-enhanced.tsx` - Sala virtual con chat
2. ✅ `app/chat/conversacion.tsx` - Chat privado
3. ✅ `app/social/comentar.tsx` - Comentarios (modal)
4. ✅ `app/social/comentarios.tsx` - Comentarios (pantalla completa)

---

## 📋 Checklist para Nuevas Pantallas con Input

Cuando crees una nueva pantalla con campo de texto en la parte inferior:

### 1. Importar el Hook
```typescript
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

### 2. Usar el Hook
```typescript
const { keyboardHeight, keyboardVisible } = useKeyboardHeight();
const insets = useSafeAreaInsets();
const [inputContainerHeight, setInputContainerHeight] = useState(0);
```

### 3. Estructura del Layout
```typescript
// ✅ Contenedor principal
<View style={{ flex: 1 }}>
  
  // ✅ Lista con padding dinámico
  <FlatList
    contentContainerStyle={{
      paddingBottom: keyboardVisible 
        ? keyboardHeight 
        : inputContainerHeight + insets.bottom
    }}
  />

  // ✅ Input container absoluto
  <View
    style={[
      styles.inputContainer,
      {
        bottom: keyboardHeight,
        paddingBottom: keyboardVisible ? 0 : insets.bottom
      }
    ]}
    onLayout={(e) => setInputContainerHeight(e.nativeEvent.layout.height)}
  >
    <TextInput blurOnSubmit={false} />
  </View>
</View>
```

### 4. Estilos
```typescript
const styles = StyleSheet.create({
  inputContainer: {
    position: 'absolute',  // ✅ CRÍTICO
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    // NO poner bottom aquí, se hace dinámicamente
  },
});
```

---

## 🚫 Errores Comunes a Evitar

### ❌ NO HACER:

1. **NO usar KeyboardAvoidingView en Android**
   ```typescript
   // ❌ MAL - Causa problemas en Android
   <KeyboardAvoidingView behavior="padding">
   ```

2. **NO poner el input en el flujo normal del layout**
   ```typescript
   // ❌ MAL - El FlatList empujará el input
   <View style={{ flex: 1 }}>
     <FlatList />
     <View>  {/* ❌ Sin position: 'absolute' */}
       <TextInput />
     </View>
   </View>
   ```

3. **NO usar solo `endCoordinates.height` en Android**
   ```typescript
   // ❌ MAL - No incluye barra predictiva
   const height = event.endCoordinates.height;
   ```

4. **NO olvidar `blurOnSubmit={false}`**
   ```typescript
   // ❌ MAL - El teclado se cierra al enviar
   <TextInput onSubmitEditing={handleSend} />
   
   // ✅ BIEN - El teclado permanece abierto
   <TextInput onSubmitEditing={handleSend} blurOnSubmit={false} />
   ```

---

## 🔍 Debugging

### Logs del Hook

El hook `useKeyboardHeight` incluye logs detallados:

```
[useKeyboardHeight v2.0] 🎹 Configurando listeners del teclado
[useKeyboardHeight v2.0] 📱 Plataforma: android
[useKeyboardHeight v2.0] 📏 Altura de pantalla física: 2400
[useKeyboardHeight v2.0] 🎹 Teclado mostrándose...
[useKeyboardHeight v2.0] 📱 Detección de teclado Android: {
  reportedHeight: 420,
  calculatedHeight: 480,  // ✅ Incluye barra predictiva
  actualHeight: 480,
  screenHeight: 2400,
  currentWindowHeight: 1920
}
[useKeyboardHeight v2.0] ✅ Altura final del teclado (incluye barra predictiva): 480
```

### Verificar Configuración

1. **AndroidManifest.xml**:
   ```bash
   # Buscar adjustResize
   grep -r "windowSoftInputMode" android/
   ```

2. **Hook importado correctamente**:
   ```typescript
   import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
   ```

3. **Position absolute en input container**:
   ```typescript
   inputContainer: {
     position: 'absolute',  // ✅ Debe estar presente
   }
   ```

---

## 📊 Comparación: Antes vs Después

### ❌ Antes (Problema)

```
┌─────────────────────┐
│   Mensajes          │
│                     │
│                     │
├─────────────────────┤
│ [Input]             │  ← Oculto por barra predictiva
├─────────────────────┤
│ Barra Predictiva    │  ← Tapa el input
├─────────────────────┤
│ Teclado             │
└─────────────────────┘
```

### ✅ Después (Solucionado)

```
┌─────────────────────┐
│   Mensajes          │
│                     │
│                     │
│                     │
├─────────────────────┤
│ [Input]             │  ← Siempre visible
├─────────────────────┤
│ Barra Predictiva    │
├─────────────────────┤
│ Teclado             │
└─────────────────────┘
```

---

## 🎉 Resultado Final

El sistema ahora funciona **profesionalmente** como WhatsApp/Telegram:

1. ✅ **Campo de texto siempre visible** - Nunca queda oculto
2. ✅ **Posicionamiento preciso** - Exactamente encima del teclado
3. ✅ **Barra predictiva incluida** - Detecta la altura completa en Android
4. ✅ **Animaciones suaves** - Se mueve con el teclado
5. ✅ **Safe areas respetadas** - Funciona con notch y botones del sistema
6. ✅ **Cross-platform** - Funciona igual en iOS y Android

---

## 📚 Referencias

- Hook: `hooks/useKeyboardHeight.ts`
- Ejemplos de uso:
  - `app/chat/conversacion.tsx`
  - `app/social/comentar.tsx`
  - `app/social/comentarios.tsx`
  - `app/detalle/sala-virtual-enhanced.tsx`

---

**Fecha de implementación**: 2025-01-XX  
**Versión**: 2.0  
**Estado**: ✅ Completado y probado
