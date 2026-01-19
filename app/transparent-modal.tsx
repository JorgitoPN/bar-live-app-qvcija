
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { GlassView } from 'expo-glass-effect';
import { useTheme } from '@react-navigation/native';
import { scaleFontSize } from '@/utils/androidScaling';

export default function TransparentModal() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />
      
      <View style={styles.modalContent}>
        <GlassView 
          style={[
            styles.glassCard,
            Platform.OS !== 'ios' && { 
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' 
            }
          ]} 
          glassEffectStyle="regular"
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>Transparent Modal</Text>
          <Text style={[styles.text, { color: theme.colors.text }]}>
            This modal has a transparent background that doesn&apos;t obscure the content behind it.
          </Text>

          <Pressable onPress={() => router.back()}>
            <GlassView style={styles.button} glassEffectStyle="clear">
              <Text style={[styles.buttonText, { color: theme.colors.primary }]}>Close Modal</Text>
            </GlassView>
          </Pressable>
        </GlassView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
  },
  glassCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  text: {
    fontSize: scaleFontSize(16),
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: scaleFontSize(22),
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
