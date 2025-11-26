
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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';

interface Categoria {
  id: string;
  nombre: string;
  emoji: string;
  activo: boolean;
  orden: number;
}

export default function DatosMaestrosScreen() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  // FIXED: Removed "Terraza", "Lounge", and "Rooftop" categories
  const [categorias, setCategorias] = useState<Categoria[]>([
    { id: '1', nombre: 'Bar', emoji: '🍺', activo: true, orden: 1 },
    { id: '2', nombre: 'Pub', emoji: '🍻', activo: true, orden: 2 },
    { id: '3', nombre: 'Discoteca', emoji: '💃', activo: true, orden: 3 },
    { id: '4', nombre: 'Café', emoji: '☕', activo: true, orden: 4 },
    { id: '5', nombre: 'Restaurante', emoji: '🍽️', activo: true, orden: 5 },
    { id: '6', nombre: 'Coctelería', emoji: '🍸', activo: true, orden: 6 },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({ nombre: '', emoji: '' });

  const handleGuardar = () => {
    if (!formData.nombre || !formData.emoji) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    if (editando) {
      // Editar categoría existente
      setCategorias(prev =>
        prev.map(cat =>
          cat.id === editando.id
            ? { ...cat, nombre: formData.nombre, emoji: formData.emoji }
            : cat
        )
      );
      Alert.alert('Éxito', 'Categoría actualizada correctamente');
    } else {
      // Crear nueva categoría
      const nuevaCategoria: Categoria = {
        id: Date.now().toString(),
        nombre: formData.nombre,
        emoji: formData.emoji,
        activo: true,
        orden: categorias.length + 1,
      };
      setCategorias(prev => [...prev, nuevaCategoria]);
      Alert.alert('Éxito', 'Categoría creada correctamente');
    }

    setModalVisible(false);
    setEditando(null);
    setFormData({ nombre: '', emoji: '' });
  };

  const handleEditar = (categoria: Categoria) => {
    setEditando(categoria);
    setFormData({ nombre: categoria.nombre, emoji: categoria.emoji });
    setModalVisible(true);
  };

  const handleEliminar = (id: string) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro de eliminar esta categoría?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setCategorias(prev => prev.filter(cat => cat.id !== id));
            Alert.alert('Éxito', 'Categoría eliminada correctamente');
          },
        },
      ]
    );
  };

  const toggleActivo = (id: string) => {
    setCategorias(prev =>
      prev.map(cat =>
        cat.id === id ? { ...cat, activo: !cat.activo } : cat
      )
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="chevron_left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Datos Maestros</Text>
        <Text style={styles.headerSubtitle}>
          Configurar categorías, provincias y tipos de locales
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorías de Locales</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setEditando(null);
                setFormData({ nombre: '', emoji: '' });
                setModalVisible(true);
              }}
            >
              <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {categorias.map(categoria => (
            <View key={categoria.id} style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.emoji}>{categoria.emoji}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{categoria.nombre}</Text>
                  <Text style={styles.cardSubtitle}>Orden: {categoria.orden}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[
                      styles.statusBadge,
                      { backgroundColor: categoria.activo ? '#10B981' : '#EF4444' },
                    ]}
                    onPress={() => toggleActivo(categoria.id)}
                  >
                    <Text style={styles.statusText}>
                      {categoria.activo ? 'Activo' : 'Inactivo'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleEditar(categoria)}
                  >
                    <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleEliminar(categoria.id)}
                  >
                    <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Información</Text>
            <Text style={styles.infoText}>
              Las categorías definen los tipos de locales disponibles en BarLive.
              Puedes activar/desactivar categorías sin eliminarlas.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal para crear/editar categoría */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editando ? 'Editar Categoría' : 'Nueva Categoría'}
            </Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={formData.nombre}
              onChangeText={text => setFormData(prev => ({ ...prev, nombre: text }))}
              placeholder="Ej: Bar"
            />

            <Text style={styles.label}>Emoji</Text>
            <TextInput
              style={styles.input}
              value={formData.emoji}
              onChangeText={text => setFormData(prev => ({ ...prev, emoji: text }))}
              placeholder="Ej: 🍺"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setModalVisible(false);
                  setEditando(null);
                  setFormData({ nombre: '', emoji: '' });
                }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleGuardar}
              >
                <Text style={styles.buttonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    ...commonStyles.shadow,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginRight: 15,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 15,
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
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.textSecondary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
