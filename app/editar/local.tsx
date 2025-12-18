
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import LocalEditForm from '@/components/local/LocalEditForm';

export default function EditarLocalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const localId = params.id as string;
  
  // Check if user is admin
  const isAdmin = user?.rol_app === 'admin';

  const [loading, setLoading] = useState(true);
  const [localData, setLocalData] = useState<any>(null);

  const loadLocalData = useCallback(async () => {
    if (!localId) {
      Alert.alert('Error', 'ID de local no válido');
      router.back();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('id', localId)
        .single();

      if (error) {
        console.error('Error loading local data:', error);
        Alert.alert('Error', 'No se pudo cargar la información del local');
        router.back();
        return;
      }

      setLocalData(data);
    } catch (error) {
      console.error('Error in loadLocalData:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar el local');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [localId, router]);

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  const handleSave = async (updateData: any) => {
    try {
      const { error } = await supabase
        .from('locales')
        .update(updateData)
        .eq('id', localId);

      if (error) {
        console.error('Error updating local:', error);
        Alert.alert('Error', 'No se pudo guardar el local. Por favor, intenta nuevamente.');
        throw error;
      }

      Alert.alert('Éxito', 'Local actualizado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando local...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Local</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <LocalEditForm
          localId={localId}
          initialData={localData}
          onSave={handleSave}
          onCancel={() => router.back()}
          isAdmin={isAdmin}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
});
