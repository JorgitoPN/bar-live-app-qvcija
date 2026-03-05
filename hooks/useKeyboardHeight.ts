
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
 * Universal keyboard height hook for React Native
 * 
 * This hook accurately detects keyboard height on both iOS and Android,
 * including the Android predictive text bar (Gboard, etc.) which is often
 * missed by the standard KeyboardEvent.endCoordinates.height.
 * 
 * HOW IT WORKS:
 * - On iOS: Uses keyboardWillShow/keyboardWillHide events with endCoordinates.height
 * - On Android: Calculates the REAL keyboard height by comparing:
 *   1. Dimensions.get('screen').height (full physical screen height)
 *   2. Dimensions.get('window').height (visible window height when keyboard is open)
 *   The difference gives us the TRUE keyboard height including predictive bar
 * 
 * USAGE IN CHAT SCREENS:
 * ```tsx
 * const { keyboardHeight, keyboardVisible } = useKeyboardHeight();
 * 
 * // Position input container above keyboard
 * <View style={[styles.inputContainer, { bottom: keyboardHeight }]}>
 *   <TextInput placeholder="Type a message..." />
 * </View>
 * 
 * // Adjust FlatList padding to show last message
 * <FlatList
 *   contentContainerStyle={{ paddingBottom: keyboardHeight + 20 }}
 * />
 * ```
 * 
 * @returns {KeyboardState} Object with keyboardHeight (number) and keyboardVisible (boolean)
 */
export function useKeyboardHeight(): KeyboardState {
  // Current keyboard height in pixels (0 when hidden)
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  
  // Whether keyboard is currently visible
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  
  // Store the full screen height to calculate Android keyboard height
  // This is the physical screen height that doesn't change
  const [screenHeight] = useState<number>(Dimensions.get('screen').height);
  
  // Store the last known window height before keyboard appeared
  // This helps us calculate the difference when keyboard shows
  const [lastWindowHeight, setLastWindowHeight] = useState<number>(
    Dimensions.get('window').height
  );

  /**
   * Handle keyboard show event
   * 
   * iOS: Uses the reported endCoordinates.height directly (accurate)
   * Android: Compares screen height vs window height to get TRUE height
   *          including the predictive text bar that endCoordinates often misses
   */
  const handleKeyboardShow = useCallback((event: KeyboardEvent) => {
    console.log('🎹 Keyboard showing...');
    
    // Height reported by the keyboard event
    const reportedHeight = event.endCoordinates.height;
    
    // Current visible window height (reduced when keyboard is open)
    const currentWindowHeight = Dimensions.get('window').height;
    
    // Calculate the ACTUAL keyboard height
    let actualHeight: number;
    
    if (Platform.OS === 'android') {
      // On Android, calculate the difference between screen and window
      // This captures the FULL keyboard including predictive bar
      const calculatedHeight = screenHeight - currentWindowHeight;
      
      // Use the LARGER of the two values to ensure we capture everything
      // Sometimes endCoordinates.height is accurate, sometimes it's not
      actualHeight = Math.max(reportedHeight, calculatedHeight);
      
      console.log('📱 Android keyboard detection:', {
        reportedHeight,
        calculatedHeight,
        actualHeight,
        screenHeight,
        currentWindowHeight,
      });
    } else {
      // On iOS, the reported height is accurate
      actualHeight = reportedHeight;
      
      console.log('🍎 iOS keyboard detection:', {
        reportedHeight,
        actualHeight,
      });
    }
    
    setKeyboardHeight(actualHeight);
    setKeyboardVisible(true);
  }, [screenHeight]);

  /**
   * Handle keyboard hide event
   * 
   * Resets keyboard height to 0 and updates the last known window height
   * for the next keyboard show calculation
   */
  const handleKeyboardHide = useCallback(() => {
    console.log('🎹 Keyboard hiding...');
    
    setKeyboardHeight(0);
    setKeyboardVisible(false);
    
    // Update last window height to current full height
    // This ensures accurate calculation next time keyboard shows
    setLastWindowHeight(Dimensions.get('window').height);
  }, []);

  /**
   * Handle window dimension changes
   * 
   * This is crucial for Android to detect when the keyboard appears/disappears
   * by monitoring changes in the visible window height
   */
  const handleDimensionsChange = useCallback(({ window }: { window: { height: number } }) => {
    console.log('📐 Window dimensions changed:', {
      newHeight: window.height,
      lastHeight: lastWindowHeight,
    });
    
    setLastWindowHeight(window.height);
  }, [lastWindowHeight]);

  useEffect(() => {
    console.log('🎹 useKeyboardHeight: Setting up keyboard listeners');
    
    // Subscribe to dimension changes (important for Android)
    const dimensionsSubscription = Dimensions.addEventListener(
      'change',
      handleDimensionsChange
    );

    // Subscribe to keyboard show events
    // Use keyboardWillShow on iOS for smoother animations
    // Use keyboardDidShow on Android (keyboardWillShow doesn't exist)
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardShowListener = Keyboard.addListener(
      keyboardShowEvent,
      handleKeyboardShow
    );

    // Subscribe to keyboard hide events
    // Use keyboardWillHide on iOS for smoother animations
    // Use keyboardDidHide on Android (keyboardWillHide doesn't exist)
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const keyboardHideListener = Keyboard.addListener(
      keyboardHideEvent,
      handleKeyboardHide
    );

    // Cleanup function to remove all listeners
    return () => {
      console.log('🎹 useKeyboardHeight: Cleaning up keyboard listeners');
      
      dimensionsSubscription.remove();
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [handleKeyboardShow, handleKeyboardHide, handleDimensionsChange]);

  // Memoize the return value to prevent unnecessary re-renders
  // Only re-create the object when keyboardHeight or keyboardVisible actually change
  return useMemo(
    () => ({
      keyboardHeight,
      keyboardVisible,
    }),
    [keyboardHeight, keyboardVisible]
  );
}
