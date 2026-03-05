
import React, { useEffect, useState, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 KEYBOARD AVOIDING WRAPPER v1.0 - SOLUCIÓN GLOBAL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PROBLEMA IDENTIFICADO:
 * - Teclado se despliega encima de los campos de texto
 * - En Android, campos quedan debajo de la barra de navegación del sistema
 * - Comportamiento inconsistente entre iOS y Android
 * - Falta de padding inferior para evitar conflicto con botones del sistema
 * 
 * SOLUCIÓN IMPLEMENTADA:
 * 
 * 1. COMPORTAMIENTO POR PLATAFORMA:
 *    iOS:
 *    - behavior="padding" (empuja el contenido hacia arriba)
 *    - keyboardVerticalOffset dinámico basado en safe area insets
 *    - Transiciones suaves nativas de iOS
 *    
 *    Android:
 *    - behavior="height" (ajusta la altura del contenedor)
 *    - Padding inferior dinámico basado en altura del teclado
 *    - Manejo explícito de la barra de navegación del sistema
 * 
 * 2. SAFE AREA INSETS:
 *    - Respeta los insets del dispositivo (notch, barra de navegación)
 *    - Padding inferior automático cuando el teclado está cerrado
 *    - Ajuste dinámico cuando el teclado se abre
 * 
 * 3. LISTENERS DE TECLADO:
 *    - keyboardWillShow/keyboardDidShow para detectar apertura
 *    - keyboardWillHide/keyboardDidHide para detectar cierre
 *    - Actualización de altura del teclado en tiempo real
 * 
 * 4. GARANTÍAS:
 *    - ✅ Campo activo siempre visible sobre el teclado
 *    - ✅ Desplazamiento suave automático
 *    - ✅ No conflicto con barra de navegación en Android
 *    - ✅ Comportamiento consistente en toda la app
 *    - ✅ Funciona con cambios rápidos entre campos
 *    - ✅ Maneja diferentes alturas de teclado (con/sin sugerencias)
 * 
 * USO:
 * ```tsx
 * <KeyboardAvoidingWrapper>
 *   <TextInput placeholder="Email" />
 *   <TextInput placeholder="Password" />
 * </KeyboardAvoidingWrapper>
 * ```
 * 
 * PROPS:
 * - children: Contenido a envolver
 * - style: Estilos adicionales (opcional)
 * - extraOffset: Offset adicional personalizado (opcional)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface KeyboardAvoidingWrapperProps {
  children: ReactNode;
  style?: ViewStyle;
  extraOffset?: number;
}

export default function KeyboardAvoidingWrapper({
  children,
  style,
  extraOffset = 0,
}: KeyboardAvoidingWrapperProps) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    console.log('[KeyboardAvoidingWrapper] 🎹 Setting up keyboard listeners');
    console.log('[KeyboardAvoidingWrapper] 📱 Platform:', Platform.OS);
    console.log('[KeyboardAvoidingWrapper] 📏 Safe area insets:', insets);

    // ✅ PASO 1: Detectar apertura del teclado
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        console.log('[KeyboardAvoidingWrapper] ⬆️ Keyboard opened');
        console.log('[KeyboardAvoidingWrapper] 📐 Keyboard height:', e.endCoordinates.height);
        
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    // ✅ PASO 2: Detectar cierre del teclado
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[KeyboardAvoidingWrapper] ⬇️ Keyboard closed');
        
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      console.log('[KeyboardAvoidingWrapper] 🧹 Cleaning up keyboard listeners');
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [insets]);

  // ✅ PASO 3: Calcular offset vertical dinámico
  const keyboardVerticalOffset = Platform.select({
    // iOS: Offset basado en safe area + header + extra
    ios: insets.top + 60 + extraOffset,
    
    // Android: Offset mínimo (el behavior="height" maneja el resto)
    android: extraOffset,
    
    default: 0,
  });

  // ✅ PASO 4: Calcular padding inferior dinámico para Android
  const contentPaddingBottom = Platform.select({
    // iOS: KeyboardAvoidingView maneja todo automáticamente
    ios: 0,
    
    // Android: Padding dinámico basado en estado del teclado
    android: isKeyboardVisible 
      ? keyboardHeight + 20 // Teclado abierto: altura del teclado + 20px de margen
      : Math.max(insets.bottom, 8), // Teclado cerrado: respeta barra de navegación
    
    default: 0,
  });

  console.log('[KeyboardAvoidingWrapper] 📊 Current state:', {
    isKeyboardVisible,
    keyboardHeight,
    keyboardVerticalOffset,
    contentPaddingBottom,
    platform: Platform.OS,
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, style, { paddingBottom: contentPaddingBottom }]}
      behavior={Platform.select({
        ios: 'padding', // iOS: Empuja el contenido hacia arriba
        android: 'height', // Android: Ajusta la altura del contenedor
      })}
      keyboardVerticalOffset={keyboardVerticalOffset}
      enabled
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
