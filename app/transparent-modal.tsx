
import { StyleSheet, Text, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { GlassView } from 'expo-glass-effect';
import { useTheme } from '@react-navigation/native';

const scaleFontSize = (size: number) => Platform.OS === 'android' ? size * 0.8 : size;

export default function TransparentModal() {
  const theme = useTheme();

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <Pressable onPress={(e) => e.stopPropagation()}>
        <GlassView style={styles.modal} glassEffectStyle="regular">
          <Text style={[styles.title, { color: theme.colors.text }]}>Transparent Modal</Text>
          <Text style={[styles.text, { color: theme.colors.text }]}>Tap outside to dismiss</Text>
        </GlassView>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    minWidth: 200,
  },
  title: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    marginBottom: 12,
  },
  text: {
    fontSize: scaleFontSize(16),
    textAlign: 'center',
  },
});
