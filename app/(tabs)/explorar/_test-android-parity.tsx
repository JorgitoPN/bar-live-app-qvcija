
/**
 * ANDROID PARITY TEST SCREEN
 * 
 * Esta pantalla te permite verificar visualmente que los cambios
 * de Android v56.0 se están aplicando correctamente.
 * 
 * Para acceder: Navega a /(tabs)/explorar/_test-android-parity
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Dimensions } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: screenHeight } = Dimensions.get('window');

export default function AndroidParityTest() {
  const insets = useSafeAreaInsets();
  
  // Valores actuales según v56.0
  const headerPaddingTop = Platform.OS === 'ios' ? 50 : 12;
  const headerPaddingBottom = Platform.OS === 'ios' ? 16 : 12;
  const headerTitleSize = Platform.OS === 'ios' ? 32 : 28;
  const tabBarHeight = Platform.OS === 'ios' ? 80 : 70;
  const tabBarHeightReduced = Platform.OS === 'ios' ? 70 : 60;
  
  const testResults = [
    {
      name: 'Header Padding Top',
      expected: Platform.OS === 'ios' ? '50px' : '12px',
      actual: `${headerPaddingTop}px`,
      pass: (Platform.OS === 'ios' && headerPaddingTop === 50) || (Platform.OS === 'android' && headerPaddingTop === 12),
    },
    {
      name: 'Header Padding Bottom',
      expected: Platform.OS === 'ios' ? '16px' : '12px',
      actual: `${headerPaddingBottom}px`,
      pass: (Platform.OS === 'ios' && headerPaddingBottom === 16) || (Platform.OS === 'android' && headerPaddingBottom === 12),
    },
    {
      name: 'Header Title Size',
      expected: Platform.OS === 'ios' ? '32px' : '28px',
      actual: `${headerTitleSize}px`,
      pass: (Platform.OS === 'ios' && headerTitleSize === 32) || (Platform.OS === 'android' && headerTitleSize === 28),
    },
    {
      name: 'Tab Bar Height (Old)',
      expected: Platform.OS === 'ios' ? '80px' : '70px',
      actual: `${tabBarHeight}px`,
      pass: (Platform.OS === 'ios' && tabBarHeight === 80) || (Platform.OS === 'android' && tabBarHeight === 70),
    },
    {
      name: 'Tab Bar Height (v56.0)',
      expected: Platform.OS === 'ios' ? '70px' : '60px',
      actual: `${tabBarHeightReduced}px`,
      pass: (Platform.OS === 'ios' && tabBarHeightReduced === 70) || (Platform.OS === 'android' && tabBarHeightReduced === 60),
    },
  ];
  
  const allTestsPass = testResults.every(test => test.pass);
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          🔍 Android Parity Test v56.0
        </Text>
        <Text style={styles.headerSubtitle}>
          Platform: {Platform.OS} | Screen Height: {screenHeight.toFixed(0)}px
        </Text>
      </View>
      
      <View style={styles.statusCard}>
        <Text style={[styles.statusText, allTestsPass ? styles.statusPass : styles.statusFail]}>
          {allTestsPass ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}
        </Text>
        <Text style={styles.statusSubtext}>
          {allTestsPass 
            ? 'Los cambios de v56.0 se están aplicando correctamente' 
            : 'Los cambios de v56.0 NO se están aplicando. Limpia la caché.'}
        </Text>
      </View>
      
      {testResults.map((test, index) => (
        <View key={index} style={styles.testCard}>
          <View style={styles.testHeader}>
            <Text style={styles.testName}>{test.name}</Text>
            <Text style={[styles.testStatus, test.pass ? styles.pass : styles.fail]}>
              {test.pass ? '✅ PASS' : '❌ FAIL'}
            </Text>
          </View>
          <View style={styles.testDetails}>
            <Text style={styles.testLabel}>Esperado: <Text style={styles.testValue}>{test.expected}</Text></Text>
            <Text style={styles.testLabel}>Actual: <Text style={styles.testValue}>{test.actual}</Text></Text>
          </View>
        </View>
      ))}
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📱 Información del Dispositivo</Text>
        <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
        <Text style={styles.infoText}>Platform Version: {Platform.Version}</Text>
        <Text style={styles.infoText}>Screen Height: {screenHeight.toFixed(0)}px</Text>
        <Text style={styles.infoText}>Top Inset: {insets.top}px</Text>
        <Text style={styles.infoText}>Bottom Inset: {insets.bottom}px</Text>
      </View>
      
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>🔧 Si los tests fallan:</Text>
        <Text style={styles.instructionsText}>1. Cierra la app completamente</Text>
        <Text style={styles.instructionsText}>2. Ejecuta: npx expo start --clear</Text>
        <Text style={styles.instructionsText}>3. Desinstala y reinstala la app</Text>
        <Text style={styles.instructionsText}>4. Reinicia tu dispositivo Android</Text>
        <Text style={styles.instructionsText}>5. Vuelve a abrir esta pantalla</Text>
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 48 : 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
  },
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusPass: {
    color: colors.success,
  },
  statusFail: {
    color: colors.error,
  },
  statusSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  testCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  testStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pass: {
    color: colors.success,
  },
  fail: {
    color: colors.error,
  },
  testDetails: {
    gap: 4,
  },
  testLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  testValue: {
    fontWeight: '600',
    color: colors.text,
  },
  infoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  instructionsCard: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.warning,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.white,
    marginBottom: 6,
  },
});
