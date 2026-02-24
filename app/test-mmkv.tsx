
/**
 * MMKV Test Screen
 * 
 * Esta pantalla permite probar y verificar que MMKV está funcionando correctamente.
 * Úsala para debugging y para ver las mejoras de rendimiento en acción.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { runAllMMKVTests, testMMKVPerformance, testSupabaseSessionStorage } from '@/utils/testMMKV';
import { inspectSupabaseStorage, clearSupabaseStorage } from '@/src/lib/supabaseStorage';
import { supabase } from '@/utils/supabase';

export default function TestMMKVScreen() {
  const [testResults, setTestResults] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runTest = async (testName: string, testFn: () => void) => {
    setLoading(true);
    setTestResults(`Ejecutando ${testName}...\n`);

    // Capturar console.log
    const originalLog = console.log;
    let logs = '';
    console.log = (...args) => {
      logs += args.join(' ') + '\n';
      originalLog(...args);
    };

    try {
      testFn();
      setTestResults(logs);
    } catch (error) {
      setTestResults(`Error: ${error}\n\n${logs}`);
    } finally {
      console.log = originalLog;
      setLoading(false);
    }
  };

  const checkCurrentSession = async () => {
    setLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setTestResults(`Error al obtener sesión: ${error.message}`);
      } else if (session) {
        setTestResults(
          `✓ Sesión activa encontrada:\n\n` +
          `Usuario: ${session.user.email}\n` +
          `ID: ${session.user.id}\n` +
          `Expira: ${new Date(session.expires_at! * 1000).toLocaleString()}\n\n` +
          `Token de acceso: ${session.access_token.substring(0, 20)}...\n` +
          `Token de refresco: ${session.refresh_token?.substring(0, 20)}...`
        );
      } else {
        setTestResults('No hay sesión activa');
      }
    } catch (error) {
      setTestResults(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const inspectStorage = () => {
    setLoading(true);
    try {
      const data = inspectSupabaseStorage();
      const keys = Object.keys(data);
      
      if (keys.length === 0) {
        setTestResults('No hay datos de Supabase en el almacenamiento');
      } else {
        let result = `Encontradas ${keys.length} claves de Supabase:\n\n`;
        keys.forEach(key => {
          const value = data[key];
          result += `${key}:\n${value.substring(0, 100)}...\n\n`;
        });
        setTestResults(result);
      }
    } catch (error) {
      setTestResults(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearStorage = () => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de que quieres limpiar todos los datos de sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => {
            try {
              clearSupabaseStorage();
              setTestResults('✓ Almacenamiento limpiado correctamente');
            } catch (error) {
              setTestResults(`Error: ${error}`);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Test MMKV Storage',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tests de Rendimiento</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => runTest('Todos los tests', runAllMMKVTests)}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Ejecutando...' : 'Ejecutar Todos los Tests'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => runTest('Test de rendimiento', testMMKVPerformance)}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test de Rendimiento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => runTest('Test de sesión', testSupabaseSessionStorage)}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test de Sesión Supabase</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debugging</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={checkCurrentSession}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Ver Sesión Actual</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={inspectStorage}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Inspeccionar Almacenamiento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={clearStorage}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Limpiar Almacenamiento</Text>
          </TouchableOpacity>
        </View>

        {testResults ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Resultados:</Text>
            <ScrollView style={styles.resultsScroll}>
              <Text style={styles.resultsText}>{testResults}</Text>
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>ℹ️ Información</Text>
          <Text style={styles.infoText}>
            MMKV es 10-30x más rápido que AsyncStorage.{'\n\n'}
            Esto significa que la sesión de usuario se carga instantáneamente,
            como en Instagram o WhatsApp.{'\n\n'}
            Los tests de rendimiento comparan 1000 operaciones de lectura/escritura.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  resultsScroll: {
    maxHeight: 300,
  },
  resultsText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
});
