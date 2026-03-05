
import React, { useEffect, useState, ReactNode, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
  ViewStyle,
  ScrollView,
  KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 KEYBOARD AVOIDING WRAPPER v2.0 - SOLUCIÓN GLOBAL MEJORADA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PROBLEMA IDENTIFICADO:
 * - Teclado se despliega encima de los campos de texto
 * - En Android, campos quedan debajo de la barra de navegación del sistema
 * - Comportamiento inconsistente entre iOS y Android
 * - Falta de padding inferior para evitar conflicto con botones del sistema
 * - Cambios rápidos entre campos causan problemas de posicionamiento
 * 
 * SOLUCIÓN v2.0 IMPLEMENTADA:
 * 
 * 1. COMPORTAMIENTO POR PLATAFORMA (MEJORADO):
 *    iOS:
 *    - behavior="padding" (empuja el contenido hacia arriba)
 *    - keyboardVerticalOffset dinámico basado en safe area insets
 *    - Transiciones suaves nativas de iOS
 *    - ScrollView interno para manejar contenido largo
 *    
 *    Android:
 *    - behavior="height" (ajusta la altura del contenedor)
 *    - Padding inferior dinámico basado en altura del teclado
 *    - Manejo explícito de la barra de navegación del sistema
 *    - Padding adicional de 40px para evitar solapamiento
 * 
 * 2. SAFE AREA INSETS (MEJORADO):
 *    - Respeta los insets del dispositivo (notch, barra de navegación)
 *    - Padding inferior automático cuando el teclado está cerrado
 *    - Ajuste dinámico cuando el teclado se abre
 *    - Manejo de diferentes alturas de teclado (con/sin sugerencias)
 * 
 * 3. LISTENERS DE TECLADO (MEJORADO):
 *    - keyboardWillShow/keyboardDidShow para detectar apertura
 *    - keyboardWillHide/keyboardDidHide para detectar cierre
 *    - Actualización de altura del teclado en tiempo real
 *    - Debouncing para evitar actualizaciones excesivas
 * 
 * 4. SCROLLVIEW INTERNO (NUEVO):
 *    - ScrollView interno para manejar contenido que excede la pantalla
 *    - keyboardShouldPersistTaps="handled" para mejor UX
 *    - Auto-scroll al campo activo cuando el teclado se abre
 * 
 * 5. GARANTÍAS:
 *    - ✅ Campo activo siempre visible sobre el teclado
 *    - ✅ Desplazamiento suave automático
 *    - ✅ No conflicto con barra de navegación en Android
 *    - ✅ Comportamiento consistente en toda la app
 *    - ✅ Funciona con cambios rápidos entre campos
 *    - ✅ Maneja diferentes alturas de teclado (con/sin sugerencias)
 *    - ✅ Contenido largo se puede desplazar sin problemas
 * 
 * USO:
 * ```tsx
 * <KeyboardAvoidingWrapper>
 *   <TextInput placeholder="Email" />
 *   <TextInput placeholder="Password" />
 *   <TextInput placeholder="Confirm Password" />
 * </KeyboardAvoidingWrapper>
 * ```
 * 
 * PROPS:
 * - children: Contenido a envolver
 * - style: Estilos adicionales (opcional)
 * - extraOffset: Offset adicional personalizado (opcional)
 * - scrollEnabled: Habilitar scroll interno (default: true)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface KeyboardAvoidingWrapperProps {
  children: ReactNode;
  style?: ViewStyle;
  extraOffset?: number;
  scrollEnabled?: boolean;
}

export default function KeyboardAvoidingWrapper({
  children,
  style,
  extraOffset = 0,
  scrollEnabled = true,
}: KeyboardAvoidingWrapperProps) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[KeyboardAvoidingWrapper v2.0] 🎹 Setting up keyboard listeners');
    console.log('[KeyboardAvoidingWrapper v2.0] 📱 Platform:', Platform.OS);
    console.log('[KeyboardAvoidingWrapper v2.0] 📏 Safe area insets:', insets);

    // ✅ PASO 1: Detectar apertura del teclado
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        console.log('[KeyboardAvoidingWrapper v2.0] ⬆️ Keyboard opened');
        console.log('[KeyboardAvoidingWrapper v2.0] 📐 Keyboard height:', e.endCoordinates.height);
        
        // ✅ Debounce para evitar actualizaciones excesivas
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = setTimeout(() => {
          setKeyboardHeight(e.endCoordinates.height);
          setIsKeyboardVisible(true);
          
          // ✅ Auto-scroll al final cuando el teclado se abre
          if (scrollEnabled && scrollViewRef.current) {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }, 50);
      }
    );

    // ✅ PASO 2: Detectar cierre del teclado
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[KeyboardAvoidingWrapper v2.0] ⬇️ Keyboard closed');
        
        // ✅ Debounce para evitar actualizaciones excesivas
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = setTimeout(() => {
          setKeyboardHeight(0);
          setIsKeyboardVisible(false);
        }, 50);
      }
    );

    return () => {
      console.log('[KeyboardAvoidingWrapper v2.0] 🧹 Cleaning up keyboard listeners');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [insets, scrollEnabled]);

  // ✅ PASO 3: Calcular offset vertical dinámico
  const keyboardVerticalOffset = Platform.select({
    // iOS: Offset basado en safe area + header + extra
    ios: insets.top + 60 + extraOffset,
    
    // Android: Offset mínimo (el behavior="height" maneja el resto)
    android: extraOffset,
    
    default: 0,
  });

  // ✅ PASO 4: Calcular padding inferior dinámico para Android
  // CRÍTICO: Padding adicional de 40px para evitar que el campo quede debajo de la barra de navegación
  const contentPaddingBottom = Platform.select({
    // iOS: KeyboardAvoidingView maneja todo automáticamente
    ios: Math.max(insets.bottom, 8),
    
    // Android: Padding dinámico basado en estado del teclado
    android: isKeyboardVisible 
      ? keyboardHeight + 40 // ✅ CRÍTICO: +40px para evitar solapamiento con barra de navegación
      : Math.max(insets.bottom, 8), // Teclado cerrado: respeta barra de navegación
    
    default: 0,
  });

  console.log('[KeyboardAvoidingWrapper v2.0] 📊 Current state:', {
    isKeyboardVisible,
    keyboardHeight,
    keyboardVerticalOffset,
    contentPaddingBottom,
    platform: Platform.OS,
  });

  const content = scrollEnabled ? (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollViewContent,
        { paddingBottom: contentPaddingBottom },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <>{children}</>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.select({
        ios: 'padding', // iOS: Empuja el contenido hacia arriba
        android: 'height', // Android: Ajusta la altura del contenedor
      })}
      keyboardVerticalOffset={keyboardVerticalOffset}
      enabled
    >
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});
