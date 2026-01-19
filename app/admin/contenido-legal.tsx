
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';

export default function ContenidoLegalScreen() {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contenido, setContenido] = useState({
    terminos: '',
    privacidad: '',
    cookies: '',
    acerca: '',
  });

  useEffect(() => {
    cargarContenidoLegal();
  }, []);

  const cargarContenidoLegal = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contenido_legal')
        .select('*')
        .order('tipo');

      if (error) {
        console.error('Error loading legal content:', error);
        // Use default content if table doesn't exist
        setContenido({
          terminos: 'Términos y Condiciones de uso de BarLive\n\nÚltima actualización: ' + new Date().toLocaleDateString(),
          privacidad: 'Política de Privacidad de BarLive\n\nÚltima actualización: ' + new Date().toLocaleDateString(),
          cookies: 'Política de Cookies de BarLive\n\nÚltima actualización: ' + new Date().toLocaleDateString(),
          acerca: 'Acerca de BarLive\n\nBarLive es la plataforma líder para descubrir y conectar con locales de ocio nocturno.',
        });
      } else if (data) {
        const contentMap: any = {};
        data.forEach((item: any) => {
          contentMap[item.tipo] = item.contenido;
        });
        setContenido({
          terminos: contentMap.terminos || '',
          privacidad: contentMap.privacidad || '',
          cookies: contentMap.cookies || '',
          acerca: contentMap.acerca || '',
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const documentos = [
    {
      id: 'terminos',
      titulo: 'Términos y Condiciones',
      descripcion: 'Condiciones de uso de la plataforma',
      icon: 'doc.text',
      androidIcon: 'description',
    },
    {
      id: 'privacidad',
      titulo: 'Política de Privacidad',
      descripcion: 'Tratamiento de datos personales',
      icon: 'lock.shield',
      androidIcon: 'privacy_tip',
    },
    {
      id: 'cookies',
      titulo: 'Política de Cookies',
      descripcion: 'Uso de cookies y tecnologías similares',
      icon: 'info.circle',
      androidIcon: 'info',
    },
    {
      id: 'acerca',
      titulo: 'Acerca de BarLive',
      descripcion: 'Información sobre la plataforma',
      icon: 'info.circle.fill',
      androidIcon: 'info',
    },
  ];

  const guardarDocumento = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contenido_legal')
        .upsert({
          tipo: id,
          contenido: contenido[id as keyof typeof contenido],
          actualizado_en: new Date().toISOString(),
        }, {
          onConflict: 'tipo'
        });

      if (error) {
        console.error('Error saving document:', error);
        Alert.alert('Error', 'No se pudo guardar el documento');
        return;
      }

      Alert.alert('Éxito', 'Documento guardado correctamente');
      setEditando(null);
      cargarContenidoLegal();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contenido Legal</Text>
        <Text style={styles.headerSubtitle}>
          Gestionar términos, privacidad y políticas
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando contenido legal...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {documentos.map(doc => (
            <View key={doc.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol 
                  ios_icon_name={doc.icon as any} 
                  android_material_icon_name={doc.androidIcon} 
                  size={24} 
                  color={colors.primary} 
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{doc.titulo}</Text>
                  <Text style={styles.cardDescription}>{doc.descripcion}</Text>
                </View>
              </View>

              {editando === doc.id ? (
                <>
                  <TextInput
                    style={styles.textArea}
                    value={contenido[doc.id as keyof typeof contenido]}
                    onChangeText={text =>
                      setContenido(prev => ({ ...prev, [doc.id]: text }))
                    }
                    multiline
                    numberOfLines={10}
                    placeholder="Escribe el contenido aquí..."
                    placeholderTextColor={colors.textSecondary}
                  />
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={() => {
                        setEditando(null);
                        cargarContenidoLegal();
                      }}
                    >
                      <Text style={styles.buttonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonPrimary]}
                      onPress={() => guardarDocumento(doc.id)}
                    >
                      <Text style={styles.buttonText}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {contenido[doc.id as keyof typeof contenido] && (
                    <View style={styles.previewContainer}>
                      <Text style={styles.previewLabel}>Vista Previa:</Text>
                      <Text style={styles.previewText} numberOfLines={5}>
                        {contenido[doc.id as keyof typeof contenido]}
                      </Text>
                    </View>
                  )}
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.viewButton]}
                      onPress={() => {
                        Alert.alert(
                          doc.titulo,
                          contenido[doc.id as keyof typeof contenido] || 'Sin contenido',
                          [{ text: 'Cerrar' }]
                        );
                      }}
                    >
                      <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={16} color={colors.primary} />
                      <Text style={[styles.buttonText, { color: colors.primary }]}>Ver Completo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.editButton]}
                      onPress={() => setEditando(doc.id)}
                    >
                      <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={16} color="white" />
                      <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}

          <View style={styles.infoCard}>
            <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Información</Text>
              <Text style={styles.infoText}>
                Los documentos legales se muestran en las páginas correspondientes de la app.
                Asegúrate de mantenerlos actualizados según la legislación vigente.
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    ...commonStyles.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.textSecondary,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  previewContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  viewButton: {
    backgroundColor: colors.primary + '20',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginTop: 20,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
});
