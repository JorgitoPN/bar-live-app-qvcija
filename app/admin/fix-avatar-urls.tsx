
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function FixAvatarUrlsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const fixAvatarUrls = async () => {
    if (!user || user.rol_app !== 'admin') {
      Alert.alert('Error', 'Solo los administradores pueden ejecutar esta acción');
      return;
    }

    Alert.alert(
      'Confirmar Acción',
      'Esta acción buscará y corregirá todos los avatares con URLs locales (file://). ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            try {
              setLoading(true);
              setResults([]);
              
              console.log('[FixAvatars] 🔍 Buscando avatares inválidos...');
              
              // Get all users with avatars
              const { data: users, error } = await supabase
                .from('usuarios')
                .select('id, nombre, username, avatar')
                .not('avatar', 'is', null);
              
              if (error) {
                console.error('[FixAvatars] Error:', error);
                Alert.alert('Error', 'No se pudieron cargar los usuarios');
                return;
              }
              
              const invalidUsers = users?.filter(u => 
                u.avatar && u.avatar.startsWith('file://')
              ) || [];
              
              console.log('[FixAvatars] 📊 Encontrados', invalidUsers.length, 'usuarios con avatares inválidos');
              
              if (invalidUsers.length === 0) {
                Alert.alert('✅ Completado', 'No se encontraron avatares inválidos');
                return;
              }
              
              const resultMessages: string[] = [];
              let fixedCount = 0;
              
              for (const user of invalidUsers) {
                console.log('[FixAvatars] 🔧 Corrigiendo avatar para:', user.nombre);
                
                const { error: updateError } = await supabase
                  .from('usuarios')
                  .update({ avatar: null })
                  .eq('id', user.id);
                
                if (updateError) {
                  console.error('[FixAvatars] Error actualizando usuario:', updateError);
                  resultMessages.push(`❌ ${user.nombre} (@${user.username || 'sin username'}): Error`);
                } else {
                  console.log('[FixAvatars] ✅ Avatar corregido para:', user.nombre);
                  resultMessages.push(`✅ ${user.nombre} (@${user.username || 'sin username'}): Corregido`);
                  fixedCount++;
                }
              }
              
              setResults(resultMessages);
              
              Alert.alert(
                '✅ Completado',
                `Se corrigieron ${fixedCount} de ${invalidUsers.length} avatares inválidos.\n\nLos usuarios afectados ahora verán un avatar generado automáticamente con su inicial.`
              );
              
            } catch (error) {
              console.error('[FixAvatars] Error:', error);
              Alert.alert('Error', 'Ocurrió un error al corregir los avatares');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Corregir Avatares</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={32}
              color={colors.primary}
            />
          </View>
          <Text style={styles.infoTitle}>¿Qué hace esta herramienta?</Text>
          <Text style={styles.infoText}>
            Esta herramienta busca y corrige avatares de usuarios que tienen URLs locales (file://) en lugar de URLs públicas.
          </Text>
          <Text style={styles.infoText}>
            Los avatares locales solo existen en el dispositivo del usuario y no son visibles para otros usuarios.
          </Text>
          <Text style={styles.infoText}>
            Al corregirlos, los usuarios afectados verán un avatar generado automáticamente con su inicial hasta que suban una nueva foto.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={fixAvatarUrls}
          disabled={loading}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.actionButtonGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <React.Fragment>
                <IconSymbol
                  ios_icon_name="wrench.and.screwdriver.fill"
                  android_material_icon_name="build"
                  size={24}
                  color={colors.white}
                />
                <Text style={styles.actionButtonText}>Buscar y Corregir Avatares</Text>
              </React.Fragment>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {results.length > 0 && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Resultados:</Text>
            {results.map((result, index) => (
              <Text key={index} style={styles.resultText}>{result}</Text>
            ))}
          </View>
        )}

        <View style={styles.warningCard}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={24}
            color={colors.warning}
          />
          <Text style={styles.warningText}>
            Esta acción es segura y reversible. Los usuarios pueden volver a subir sus fotos de perfil en cualquier momento.
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoIconContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  resultsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.warning}15`,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
