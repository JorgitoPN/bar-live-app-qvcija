
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Keyboard, Dimensions, Platform, KeyboardEvent } from 'react-native';

/**
 * Interface for the keyboard state returned by the hook
 */
interface KeyboardState {
  keyboardHeight: number;
  keyboardVisible: boolean;
}

/**
 * ✅ HOOK UNIVERSAL DE TECLADO v2.0 - DETECCIÓN PRECISA INCLUYENDO BARRA PREDICTIVA
 * 
 * Este hook detecta con precisión la altura del teclado en iOS y Android,
 * incluyendo la barra de palabras predictivas de Android (Gboard, etc.) que
 * a menudo no se incluye en KeyboardEvent.endCoordinates.height.
 * 
 * CÓMO FUNCIONA:
 * - iOS: Usa keyboardWillShow/keyboardWillHide con endCoordinates.height (preciso)
 * - Android: Calcula la altura REAL del teclado comparando:
 *   1. Dimensions.get('screen').height (altura física completa de la pantalla)
 *   2. Dimensions.get('window').height (altura visible cuando el teclado está abierto)
 *   La diferencia nos da la altura VERDADERA incluyendo la barra predictiva
 * 
 * USO EN PANTALLAS DE CHAT:
 * ```tsx
 * const { keyboardHeight, keyboardVisible } = useKeyboardHeight();
 * 
 * // Posicionar contenedor de input encima del teclado
 * <View style={[styles.inputContainer, { bottom: keyboardHeight }]}>
 *   <TextInput placeholder="Escribe un mensaje..." />
 * </View>
 * 
 * // Ajustar padding de FlatList para mostrar último mensaje
 * <FlatList
 *   contentContainerStyle={{ 
 *     paddingBottom: keyboardVisible ? keyboardHeight : inputContainerHeight + insets.bottom 
 *   }}
 * />
 * ```
 * 
 * ESTRUCTURA DE LAYOUT CORRECTA:
 * 1. Contenedor principal: flex: 1
 * 2. FlatList/ScrollView: paddingBottom dinámico
 * 3. Input container: position: 'absolute', bottom: keyboardHeight
 * 
 * @returns {KeyboardState} Objeto con keyboardHeight (number) y keyboardVisible (boolean)
 */
export function useKeyboardHeight(): KeyboardState {
  // Altura actual del teclado en píxeles (0 cuando está oculto)
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  
  // Si el teclado está actualmente visible
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  
  // Almacenar la altura completa de la pantalla para calcular la altura del teclado en Android
  // Esta es la altura física de la pantalla que no cambia
  const [screenHeight] = useState<number>(Dimensions.get('screen').height);

  /**
   * Manejar evento de mostrar teclado
   * 
   * iOS: Usa el endCoordinates.height reportado directamente (preciso)
   * Android: Compara altura de pantalla vs altura de ventana para obtener la altura VERDADERA
   *          incluyendo la barra de texto predictivo que endCoordinates a menudo omite
   */
  const handleKeyboardShow = useCallback((event: KeyboardEvent) => {
    console.log('[useKeyboardHeight v2.0] 🎹 Teclado mostrándose...');
    
    // Altura reportada por el evento del teclado
    const reportedHeight = event.endCoordinates.height;
    
    // Altura actual de la ventana visible (reducida cuando el teclado está abierto)
    const currentWindowHeight = Dimensions.get('window').height;
    
    // Calcular la altura REAL del teclado
    let actualHeight: number;
    
    if (Platform.OS === 'android') {
      // En Android, calcular la diferencia entre pantalla y ventana
      // Esto captura el teclado COMPLETO incluyendo la barra predictiva
      const calculatedHeight = screenHeight - currentWindowHeight;
      
      // Usar el MAYOR de los dos valores para asegurar que capturamos todo
      // A veces endCoordinates.height es preciso, a veces no
      actualHeight = Math.max(reportedHeight, calculatedHeight);
      
      console.log('[useKeyboardHeight v2.0] 📱 Detección de teclado Android:', {
        reportedHeight,
        calculatedHeight,
        actualHeight,
        screenHeight,
        currentWindowHeight,
        difference: screenHeight - currentWindowHeight,
      });
    } else {
      // En iOS, la altura reportada es precisa
      actualHeight = reportedHeight;
      
      console.log('[useKeyboardHeight v2.0] 🍎 Detección de teclado iOS:', {
        reportedHeight,
        actualHeight,
      });
    }
    
    console.log('[useKeyboardHeight v2.0] ✅ Altura final del teclado (incluye barra predictiva):', actualHeight);
    
    setKeyboardHeight(actualHeight);
    setKeyboardVisible(true);
  }, [screenHeight]);

  /**
   * Manejar evento de ocultar teclado
   * 
   * Resetea la altura del teclado a 0
   */
  const handleKeyboardHide = useCallback(() => {
    console.log('[useKeyboardHeight v2.0] 🎹 Teclado ocultándose...');
    
    setKeyboardHeight(0);
    setKeyboardVisible(false);
  }, []);

  useEffect(() => {
    console.log('[useKeyboardHeight v2.0] 🎹 Configurando listeners del teclado');
    console.log('[useKeyboardHeight v2.0] 📱 Plataforma:', Platform.OS);
    console.log('[useKeyboardHeight v2.0] 📏 Altura de pantalla física:', screenHeight);
    
    // Suscribirse a eventos de mostrar teclado
    // Usar keyboardWillShow en iOS para animaciones más suaves
    // Usar keyboardDidShow en Android (keyboardWillShow no existe)
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardShowListener = Keyboard.addListener(
      keyboardShowEvent,
      handleKeyboardShow
    );

    // Suscribirse a eventos de ocultar teclado
    // Usar keyboardWillHide en iOS para animaciones más suaves
    // Usar keyboardDidHide en Android (keyboardWillHide no existe)
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const keyboardHideListener = Keyboard.addListener(
      keyboardHideEvent,
      handleKeyboardHide
    );

    // Función de limpieza para remover todos los listeners
    return () => {
      console.log('[useKeyboardHeight v2.0] 🧹 Limpiando listeners del teclado');
      
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [handleKeyboardShow, handleKeyboardHide, screenHeight]);

  // Memoizar el valor de retorno para prevenir re-renders innecesarios
  // Solo re-crear el objeto cuando keyboardHeight o keyboardVisible realmente cambien
  return useMemo(
    () => ({
      keyboardHeight,
      keyboardVisible,
    }),
    [keyboardHeight, keyboardVisible]
  );
}
