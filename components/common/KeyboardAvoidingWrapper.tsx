
import React, { useState, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  Keyboard,
  ScrollView,
  TextInput,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
  style?: object;
  extraOffset?: number;
  scrollViewRef?: React.RefObject<ScrollView>;
  contentContainerStyle?: object;
  scrollEnabled?: boolean;
}

const KeyboardAvoidingWrapper: React.FC<KeyboardAvoidingWrapperProps> = ({
  children,
  style,
  extraOffset = 0,
  scrollViewRef,
  contentContainerStyle,
  scrollEnabled = true,
}) => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const internalScrollViewRef = useRef<ScrollView>(null);
  const activeInputRef = useRef<TextInput | null>(null);
  const currentScrollViewRef = scrollViewRef || internalScrollViewRef;

  useEffect(() => {
    const keyboardShowEvent = Platform.select({
      ios: 'keyboardWillShow',
      android: 'keyboardDidShow',
      default: 'keyboardDidShow',
    });
    const keyboardHideEvent = Platform.select({
      ios: 'keyboardWillHide',
      android: 'keyboardDidHide',
      default: 'keyboardDidHide',
    });

    const keyboardDidShowListener = Keyboard.addListener(
      keyboardShowEvent,
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);

        // Auto-scroll to active input
        if (activeInputRef.current && currentScrollViewRef.current) {
          activeInputRef.current.measureLayout(
            currentScrollViewRef.current.getInnerViewNode(),
            (x, y, width, height) => {
              const inputBottom = y + height;
              const keyboardTop = e.endCoordinates.screenY;

              // If input is covered by keyboard
              if (inputBottom > keyboardTop) {
                const scrollAmount = inputBottom - keyboardTop + 10;
                currentScrollViewRef.current?.scrollTo({ y: scrollAmount, animated: true });
              }
            },
            () => { /* Failed to measure layout */ }
          );
        }
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      keyboardHideEvent,
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [headerHeight, extraOffset]);

  // Handlers to track the currently focused TextInput
  const handleFocus = (event: any) => {
    activeInputRef.current = event.target;
  };

  const handleBlur = () => {
    activeInputRef.current = null;
  };

  // Recursively clone children to inject onFocus and onBlur props into TextInputs
  const renderChildrenWithFocusHandlers = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        // If the child has children, process them recursively
        if (child.props.children) {
          return React.cloneElement(child, {
            children: renderChildrenWithFocusHandlers(child.props.children),
          });
        }
        // If it's a TextInput, inject onFocus and onBlur
        if (child.type === TextInput || (child.type as any).displayName === 'TextInput') {
          return React.cloneElement(child, {
            onFocus: (e: any) => {
              handleFocus(e);
              child.props.onFocus && child.props.onFocus(e);
            },
            onBlur: (e: any) => {
              handleBlur();
              child.props.onBlur && child.props.onBlur(e);
            },
          });
        }
      }
      return child;
    });
  };

  // ✅ FIXED v10.0: iOS keyboard offset - NO EXTRA SPACE
  // The input should sit DIRECTLY on top of the keyboard with NO gap
  // Setting offset to 0 ensures the input is flush with the keyboard
  const iosKeyboardOffset = Platform.OS === 'ios' 
    ? 0 + extraOffset  // Zero offset = input sits directly on keyboard (no gap)
    : extraOffset;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={iosKeyboardOffset}
      style={[styles.container, style]}
    >
      <ScrollView
        ref={currentScrollViewRef}
        contentContainerStyle={[
          contentContainerStyle,
          Platform.OS === 'android' && {
            paddingBottom: isKeyboardVisible ? keyboardHeight + 20 : Math.max(insets.bottom, 8),
          },
          // For iOS, we don't add extra paddingBottom when keyboard is visible
          // because the KeyboardAvoidingView with padding behavior handles it
          Platform.OS === 'ios' && {
            paddingBottom: isKeyboardVisible ? 0 : Math.max(insets.bottom, 8),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
      >
        {renderChildrenWithFocusHandlers(children)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default KeyboardAvoidingWrapper;
