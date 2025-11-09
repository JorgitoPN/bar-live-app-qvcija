
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';

export default function ContenidoLegalScreen() {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [contenido, setContenido] = useState({
    terminos: 'Términos y Condiciones de uso de BarLive...',
    privacidad: 'Política de Privacidad de BarLive...',
    cookies: 'Política de Cookies de BarLive...',
  });

  const documentos = [
    {
      id: 'terminos',
      titulo: 'Términos y Condiciones',
      descripcion: 'Condiciones de uso de la plataforma',
      icon: 'doc.text',
    },
    {
      id: 'privacidad',
      titulo: 'Política de Privacidad',
      descripcion: 'Tratamiento de datos personales',
      icon: 'lock.shield',
    },
    {
      id: 'cookies',
      titulo: 'Política de Cookies',
      descripcion: 'Uso de cookies y tecnologías similares',
      icon: 'info.circle',
    },
  ];

  const guardarDocumento = (id: string) => {
    Alert.alert('Éxito', 'Documento guardado correctamente');
    setEditando(null);
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {documentos.map(doc => (
          <View key={doc.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol name={doc.icon as any} size={24} color={colors.primary} />
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
                />
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={() => setEditando(null)}
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
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditando(doc.id)}
              >
                <IconSymbol name="pencil" size={16} color="white" />
                <Text style={styles.editButtonText}>Editar Documento</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <View style={{ height: 40 }} />
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
});
