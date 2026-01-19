
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { GlassView } from 'expo-glass-effect';
import { useTheme } from '@react-navigation/native';
import { scaleFontSize } from '@/utils/androidScaling';

export default function Modal() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Standard Modal</Text>
      <Text style={[styles.text, { color: theme.colors.text }]}>This is a modal presentation.</Text>

      <Pressable onPress={() => router.back()}>
        <GlassView style={styles.button} glassEffectStyle="clear">
          <Text style={[styles.buttonText, { color: theme.colors.primary }]}>Close Modal</Text>
        </GlassView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: scaleFontSize(24),
    fontWeight: 'bold',
    marginBottom: 16,
  },
  text: {
    fontSize: scaleFontSize(16),
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
});
