
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { Filtros } from '@/types';
import { useFilters } from '@/contexts/FilterContext';

interface FiltrosAvanzadosSheetProps {
  visible: boolean;
  onClose: () => void;
  filtros?: Filtros;
  onAplicarFiltros?: (filtros: Filtros) => void;
}

const COMUNIDADES_PROVINCIAS: Record<string, string[]> = {
  'Todas las Comunidades': [],
  'Andalucía': ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'],
  'Aragón': ['Huesca', 'Teruel', 'Zaragoza'],
  'Asturias': ['Asturias'],
  'Baleares': ['Islas Baleares'],
  'Canarias': ['Las Palmas', 'Santa Cruz de Tenerife'],
  'Cantabria': ['Cantabria'],
  'Castilla y León': ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
  'Castilla-La Mancha': ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
  'Cataluña': ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
  'Comunidad de Madrid': ['Madrid'],
  'Comunidad Valenciana': ['Alicante', 'Castellón', 'Valencia'],
  'Extremadura': ['Badajoz', 'Cáceres'],
  'Galicia': ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'],
  'La Rioja': ['La Rioja'],
  'Navarra': ['Navarra'],
  'País Vasco': ['Álava', 'Guipúzcoa', 'Vizcaya'],
  'Región de Murcia': ['Murcia'],
  'Ceuta': ['Ceuta'],
  'Melilla': ['Melilla'],
};

// ✅ ICON MAPPING for dynamic filter options
const TIPO_ICONS: Record<string, string> = {
  'cafe': '☕',
  'restaurante': '🍽️',
  'bar': '🍷',
  'pub': '🍺',
  'cocteleria': '🍸',
  'discoteca': '🎵',
  'sala_conciertos': '🎵',
  'lounge': '🛋️',
  'terraza': '☀️',
  'rooftop': '🏢',
};

const SERVICIO_ICONS: Record<string, string> = {
  'terraza': '☀️',
  'wifi': '📶',
  'parking': '🅿️',
  'accesible': '♿',
  'musica_vivo': '🎸',
  'deportes_tv': '📺',
  'reservas': '📅',
  'delivery': '🚚',
  'comida_para_llevar': '🥡',
  'servicio_mesa': '🍽️',
  'bar': '🍷',
  'cerveza': '🍺',
  'vino': '🍷',
  'cocteles': '🍸',
  'cafe': '☕',
  'desayuno': '🥐',
  'almuerzo': '🍴',
  'cena': '🌙',
  'brunch': '🥞',
  'postres': '🍰',
  'vegetariano': '🥗',
  'vegano': '🌱',
  'sin_gluten': '🌾',
  'efectivo': '💵',
  'tarjeta_credito': '💳',
  'tarjeta_debito': '💳',
  'pago_movil': '📱',
  'bizum': '📲',
};

const AMBIENTE_ICONS: Record<string, string> = {
  'tranquilo': '🌙',
  'animado': '🎉',
  'romantico': '💕',
  'familiar': '👨‍👩‍👧‍👦',
  'juvenil': '🎮',
  'elegante': '🎩',
  'informal': '👕',
  'acogedor': '🏠',
  'moderno': '✨',
  'de_moda': '⭐',
  'tematico': '🎭',
};

const CLIENTELA_ICONS: Record<string, string> = {
  'grupos': '👥',
  'turistas': '🧳',
  'familias': '👨‍👩‍👧‍👦',
  'ninos_bienvenidos': '👶',
  'estudiantes': '🎓',
  'lgtbi_friendly': '🏳️‍🌈',
  'parejas': '💑',
  'locales': '🏠',
};

/**
 * ✅ ADVANCED FILTERS SHEET v5.0 - ULTRA-OPTIMIZED WITH DYNAMIC OPTIONS
 * 
 * Features:
 * - ✅ TEMPORARY LOCAL STATE: Prevents UI blocking during selection
 * - ✅ SYNCHRONIZED with FilterContext: Updates global state only on "Apply"
 * - ✅ OPTIMIZED SELECTORS: Memoized filtered lists to prevent re-renders
 * - ✅ NO UI BLOCKING: Smooth interaction even with many options
 * - ✅ DYNAMIC OPTIONS: Only shows filter options with actual results
 * - ✅ AUTO-CLEANUP: Removes options when no locals match
 * - ✅ PERFORMANCE: Uses useCallback for all handlers to prevent re-renders
 */

export default function FiltrosAvanzadosSheet({
  visible,
  onClose,
  filtros: propFiltros,
  onAplicarFiltros: propOnAplicarFiltros,
}: FiltrosAvanzadosSheetProps) {
  const { 
    filtros: contextFiltros, 
    aplicarFiltros: contextAplicarFiltros, 
    limpiarFiltros: contextLimpiarFiltros,
    dynamicOptions,
    refreshDynamicOptions,
    isLoadingOptions,
  } = useFilters();
  
  // Use context filters if no prop filters provided
  const initialFiltros = propFiltros || contextFiltros;
  
  // ✅ TEMPORARY LOCAL STATE: Only updated on "Apply"
  const [filtrosTemp, setFiltrosTemp] = useState<Filtros>(initialFiltros);
  const [showComunidadModal, setShowComunidadModal] = useState(false);
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);
  const [searchComunidad, setSearchComunidad] = useState('');
  const [searchProvincia, setSearchProvincia] = useState('');

  // Reset temp filters when modal opens
  useEffect(() => {
    if (visible) {
      console.log('[FiltrosAvanzados] 🔄 Modal opened, resetting temp filters');
      setFiltrosTemp(initialFiltros);
      
      // Refresh dynamic options when opening
      refreshDynamicOptions();
    }
  }, [visible, initialFiltros, refreshDynamicOptions]);

  // ✅ OPTIMIZED: Memoized toggle function to prevent re-renders
  const toggleArrayItem = useCallback((array: string[] | undefined, item: string): string[] => {
    const arr = array || [];
    if (arr.includes(item)) {
      return arr.filter((i) => i !== item);
    }
    return [...arr, item];
  }, []);

  // ✅ OPTIMIZED: Memoized handlers to prevent re-renders
  const handleTipoToggle = useCallback((tipoId: string) => {
    console.log('[FiltrosAvanzados] 🏪 Toggling tipo:', tipoId);
    setFiltrosTemp(prev => ({
      ...prev,
      tipo: tipoId === 'todos' ? undefined : toggleArrayItem(prev.tipo, tipoId),
    }));
  }, [toggleArrayItem]);

  const handleServicioToggle = useCallback((servicioId: string) => {
    console.log('[FiltrosAvanzados] ✅ Toggling servicio:', servicioId);
    setFiltrosTemp(prev => ({
      ...prev,
      servicios: toggleArrayItem(prev.servicios, servicioId),
    }));
  }, [toggleArrayItem]);

  const handleAmbienteToggle = useCallback((ambienteId: string) => {
    console.log('[FiltrosAvanzados] ✨ Toggling ambiente:', ambienteId);
    setFiltrosTemp(prev => ({
      ...prev,
      ambiente: ambienteId === 'cualquiera' ? undefined : toggleArrayItem(prev.ambiente, ambienteId),
    }));
  }, [toggleArrayItem]);

  const handleClientelaToggle = useCallback((clientelaId: string) => {
    console.log('[FiltrosAvanzados] 👥 Toggling clientela:', clientelaId);
    setFiltrosTemp(prev => ({
      ...prev,
      clientela: clientelaId === 'cualquiera' ? undefined : toggleArrayItem(prev.clientela, clientelaId),
    }));
  }, [toggleArrayItem]);

  const handleAplicar = useCallback(() => {
    console.log('[FiltrosAvanzados] ✅ ========================================');
    console.log('[FiltrosAvanzados] ✅ APPLYING FILTERS:', filtrosTemp);
    console.log('[FiltrosAvanzados] ✅ ========================================');
    
    // ✅ SYNCHRONIZED: Apply to context (global state)
    contextAplicarFiltros(filtrosTemp);
    
    // Also call prop callback if provided (for backward compatibility)
    if (propOnAplicarFiltros) {
      propOnAplicarFiltros(filtrosTemp);
    }
    
    onClose();
  }, [filtrosTemp, contextAplicarFiltros, propOnAplicarFiltros, onClose]);

  const handleLimpiar = useCallback(() => {
    console.log('[FiltrosAvanzados] 🧹 Clearing all filters');
    const emptyFiltros = {};
    setFiltrosTemp(emptyFiltros);
    contextLimpiarFiltros();
  }, [contextLimpiarFiltros]);

  const handleComunidadSelect = useCallback((selectedComunidad: string) => {
    console.log('[FiltrosAvanzados] 📍 Community selected:', selectedComunidad);
    
    setFiltrosTemp(prev => {
      const newFiltros = {
        ...prev,
        comunidad: selectedComunidad === 'Todas las Comunidades' ? undefined : selectedComunidad,
      };
      
      // Reset province if it doesn't belong to the selected community
      if (selectedComunidad !== 'Todas las Comunidades') {
        const availableProvincias = COMUNIDADES_PROVINCIAS[selectedComunidad] || [];
        if (prev.provincia && !availableProvincias.includes(prev.provincia)) {
          newFiltros.provincia = undefined;
          console.log('[FiltrosAvanzados] ⚠️ Province reset because it does not belong to selected community');
        }
      } else {
        newFiltros.provincia = undefined;
      }
      
      return newFiltros;
    });
    
    setShowComunidadModal(false);
    setSearchComunidad('');
  }, []);

  const handleProvinciaSelect = useCallback((provincia: string) => {
    console.log('[FiltrosAvanzados] 📍 Province selected:', provincia);
    setFiltrosTemp(prev => ({
      ...prev,
      provincia: prev.provincia === provincia ? undefined : provincia,
    }));
    setShowProvinciaModal(false);
    setSearchProvincia('');
  }, []);

  const handleDistanciaChange = useCallback((text: string) => {
    setFiltrosTemp(prev => ({
      ...prev,
      distancia: text ? parseFloat(text) : undefined,
    }));
  }, []);

  // ✅ OPTIMIZED: Memoized filtered communities to prevent re-renders
  const filteredComunidades = useMemo(() => {
    // ✅ DYNAMIC: Only show communities that have active locals
    const availableComunidades = ['Todas las Comunidades', ...dynamicOptions.comunidades];
    
    return availableComunidades.filter(c =>
      c.toLowerCase().includes(searchComunidad.toLowerCase())
    );
  }, [searchComunidad, dynamicOptions.comunidades]);

  // ✅ OPTIMIZED: Memoized available provinces to prevent re-renders
  const availableProvincias = useMemo(() => {
    if (!filtrosTemp.comunidad || filtrosTemp.comunidad === 'Todas las Comunidades') {
      // ✅ DYNAMIC: Show all provinces that have active locals
      return dynamicOptions.provincias;
    }
    
    // Show provinces for selected community
    return COMUNIDADES_PROVINCIAS[filtrosTemp.comunidad] || [];
  }, [filtrosTemp.comunidad, dynamicOptions.provincias]);
    
  // ✅ OPTIMIZED: Memoized filtered provinces to prevent re-renders
  const filteredProvincias = useMemo(() => {
    return availableProvincias.filter(p =>
      p.toLowerCase().includes(searchProvincia.toLowerCase())
    );
  }, [availableProvincias, searchProvincia]);

  // ✅ DYNAMIC: Build tipo options from actual data
  const tiposLocales = useMemo(() => {
    const tipos = [
      { id: 'todos', label: 'Todos', icon: '🏪' },
    ];
    
    dynamicOptions.tipos.forEach(tipo => {
      const icon = TIPO_ICONS[tipo.toLowerCase()] || '📍';
      tipos.push({
        id: tipo,
        label: tipo.charAt(0).toUpperCase() + tipo.slice(1),
        icon,
      });
    });
    
    return tipos;
  }, [dynamicOptions.tipos]);

  // ✅ DYNAMIC: Build servicio options from actual data
  const serviciosDisponibles = useMemo(() => {
    return dynamicOptions.servicios.map(servicio => {
      const icon = SERVICIO_ICONS[servicio.toLowerCase()] || '✅';
      return {
        id: servicio,
        label: servicio.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        icon,
      };
    });
  }, [dynamicOptions.servicios]);

  // ✅ DYNAMIC: Build ambiente options from actual data
  const ambientesDisponibles = useMemo(() => {
    const ambientes = [
      { id: 'cualquiera', label: 'Cualquiera', icon: '✨' },
    ];
    
    dynamicOptions.ambientes.forEach(ambiente => {
      const icon = AMBIENTE_ICONS[ambiente.toLowerCase()] || '🌟';
      ambientes.push({
        id: ambiente,
        label: ambiente.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        icon,
      });
    });
    
    return ambientes;
  }, [dynamicOptions.ambientes]);

  // ✅ DYNAMIC: Build clientela options from actual data
  const clientelaDisponible = useMemo(() => {
    const clientela = [
      { id: 'cualquiera', label: 'Cualquiera', icon: '✨' },
    ];
    
    dynamicOptions.clientela.forEach(tipo => {
      const icon = CLIENTELA_ICONS[tipo.toLowerCase()] || '👤';
      clientela.push({
        id: tipo,
        label: tipo.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        icon,
      });
    });
    
    return clientela;
  }, [dynamicOptions.clientela]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <Pressable 
          style={{ flex: 1 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheet}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={22} color={colors.headerText} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Filtros Avanzados</Text>
              <TouchableOpacity onPress={handleLimpiar} style={styles.clearButton}>
                <Text style={styles.limpiarText}>Limpiar</Text>
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {isLoadingOptions && (
                <View style={styles.loadingBanner}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingBannerText}>Cargando opciones disponibles...</Text>
                </View>
              )}

              <View style={styles.compactSection}>
                <View style={styles.sectionHeader}>
                  <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Ubicación</Text>
                </View>
                
                <View style={styles.twoColumnGrid}>
                  <TouchableOpacity
                    style={styles.compactSelectButton}
                    onPress={() => setShowComunidadModal(true)}
                  >
                    <Text style={styles.selectLabel}>Comunidad</Text>
                    <Text style={styles.selectValue} numberOfLines={1}>
                      {filtrosTemp.comunidad || 'Todas'}
                    </Text>
                    <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.compactSelectButton,
                      (!filtrosTemp.comunidad || filtrosTemp.comunidad === 'Todas las Comunidades') && styles.compactSelectButtonDisabled
                    ]}
                    onPress={() => {
                      if (filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades') {
                        setShowProvinciaModal(true);
                      }
                    }}
                    disabled={!filtrosTemp.comunidad || filtrosTemp.comunidad === 'Todas las Comunidades'}
                  >
                    <Text style={styles.selectLabel}>Provincia</Text>
                    <Text style={styles.selectValue} numberOfLines={1}>
                      {filtrosTemp.provincia || (filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades' ? 'Todas' : 'Selecciona comunidad')}
                    </Text>
                    <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.distanceRow}>
                  <IconSymbol ios_icon_name="location.circle" android_material_icon_name="my_location" size={18} color={colors.primary} />
                  <Text style={styles.distanceLabel}>Radio de búsqueda</Text>
                  <TextInput
                    style={styles.distanceInput}
                    placeholder="km"
                    keyboardType="numeric"
                    value={filtrosTemp.distancia?.toString() || ''}
                    onChangeText={handleDistanciaChange}
                  />
                </View>
              </View>

              {tiposLocales.length > 1 && (
                <View style={styles.compactSection}>
                  <View style={styles.sectionHeader}>
                    <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Tipo de Local</Text>
                    {tiposLocales.length > 1 && (
                      <Text style={styles.sectionCount}>({tiposLocales.length - 1} disponibles)</Text>
                    )}
                  </View>
                  <View style={styles.compactChipContainer}>
                    {tiposLocales.map((tipo) => {
                      const isSelected = tipo.id === 'todos' 
                        ? !filtrosTemp.tipo || filtrosTemp.tipo.length === 0
                        : filtrosTemp.tipo?.includes(tipo.id);
                      
                      return (
                        <TouchableOpacity
                          key={tipo.id}
                          style={[
                            styles.compactChip,
                            isSelected && styles.compactChipActive,
                          ]}
                          onPress={() => handleTipoToggle(tipo.id)}
                        >
                          <Text style={styles.chipIcon}>{tipo.icon}</Text>
                          <Text
                            style={[
                              styles.compactChipText,
                              isSelected && styles.compactChipTextActive,
                            ]}
                          >
                            {tipo.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {serviciosDisponibles.length > 0 && (
                <View style={styles.compactSection}>
                  <View style={styles.sectionHeader}>
                    <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Servicios</Text>
                    <Text style={styles.sectionCount}>({serviciosDisponibles.length} disponibles)</Text>
                  </View>
                  <View style={styles.compactChipContainer}>
                    {serviciosDisponibles.map((servicio) => {
                      const isSelected = filtrosTemp.servicios?.includes(servicio.id);
                      
                      return (
                        <TouchableOpacity
                          key={servicio.id}
                          style={[
                            styles.compactChip,
                            isSelected && styles.compactChipActive,
                          ]}
                          onPress={() => handleServicioToggle(servicio.id)}
                        >
                          <Text style={styles.chipIcon}>{servicio.icon}</Text>
                          <Text
                            style={[
                              styles.compactChipText,
                              isSelected && styles.compactChipTextActive,
                            ]}
                          >
                            {servicio.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {ambientesDisponibles.length > 1 && (
                <View style={styles.compactSection}>
                  <View style={styles.sectionHeader}>
                    <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Ambiente</Text>
                    {ambientesDisponibles.length > 1 && (
                      <Text style={styles.sectionCount}>({ambientesDisponibles.length - 1} disponibles)</Text>
                    )}
                  </View>
                  <View style={styles.compactChipContainer}>
                    {ambientesDisponibles.map((ambiente) => {
                      const isSelected = ambiente.id === 'cualquiera'
                        ? !filtrosTemp.ambiente || filtrosTemp.ambiente.length === 0
                        : filtrosTemp.ambiente?.includes(ambiente.id);
                      
                      return (
                        <TouchableOpacity
                          key={ambiente.id}
                          style={[
                            styles.compactChip,
                            isSelected && styles.compactChipActive,
                          ]}
                          onPress={() => handleAmbienteToggle(ambiente.id)}
                        >
                          <Text style={styles.chipIcon}>{ambiente.icon}</Text>
                          <Text
                            style={[
                              styles.compactChipText,
                              isSelected && styles.compactChipTextActive,
                            ]}
                          >
                            {ambiente.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {clientelaDisponible.length > 1 && (
                <View style={styles.compactSection}>
                  <View style={styles.sectionHeader}>
                    <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="groups" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Clientela Típica</Text>
                    {clientelaDisponible.length > 1 && (
                      <Text style={styles.sectionCount}>({clientelaDisponible.length - 1} disponibles)</Text>
                    )}
                  </View>
                  <View style={styles.compactChipContainer}>
                    {clientelaDisponible.map((clientela) => {
                      const isSelected = clientela.id === 'cualquiera'
                        ? !filtrosTemp.clientela || filtrosTemp.clientela.length === 0
                        : filtrosTemp.clientela?.includes(clientela.id);
                      
                      return (
                        <TouchableOpacity
                          key={clientela.id}
                          style={[
                            styles.compactChip,
                            isSelected && styles.compactChipActive,
                          ]}
                          onPress={() => handleClientelaToggle(clientela.id)}
                        >
                          <Text style={styles.chipIcon}>{clientela.icon}</Text>
                          <Text
                            style={[
                              styles.compactChipText,
                              isSelected && styles.compactChipTextActive,
                            ]}
                          >
                            {clientela.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {(tiposLocales.length === 1 && serviciosDisponibles.length === 0 && ambientesDisponibles.length === 1 && clientelaDisponible.length === 1) && !isLoadingOptions && (
                <View style={styles.emptyState}>
                  <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="warning" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyStateText}>
                    No hay opciones de filtro disponibles en este momento.
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Los filtros se generan automáticamente basados en los locales activos.
                  </Text>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={refreshDynamicOptions}
                    activeOpacity={0.7}
                  >
                    <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={18} color={colors.white} />
                    <Text style={styles.refreshButtonText}>Recargar opciones</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.aplicarButton} onPress={handleAplicar}>
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.aplicarGradient}
                >
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={22} color={colors.headerText} />
                  <Text style={styles.aplicarText}>Aplicar filtros</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>

      <Modal
        visible={showComunidadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComunidadModal(false)}
      >
        <Pressable
          style={styles.selectorModalOverlay}
          onPress={() => setShowComunidadModal(false)}
        >
          <Pressable style={styles.selectorModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>Comunidad Autónoma</Text>
              <TouchableOpacity onPress={() => setShowComunidadModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar comunidad..."
                placeholderTextColor={colors.textSecondary}
                value={searchComunidad}
                onChangeText={setSearchComunidad}
              />
              {searchComunidad.length > 0 && (
                <TouchableOpacity onPress={() => setSearchComunidad('')}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.selectorModalBody}>
              {filteredComunidades.map((comunidad) => (
                <TouchableOpacity
                  key={comunidad}
                  style={[
                    styles.selectorModalOption,
                    filtrosTemp.comunidad === comunidad && styles.selectorModalOptionActive,
                  ]}
                  onPress={() => handleComunidadSelect(comunidad)}
                >
                  <Text
                    style={[
                      styles.selectorModalOptionText,
                      filtrosTemp.comunidad === comunidad && styles.selectorModalOptionTextActive,
                    ]}
                  >
                    {comunidad}
                  </Text>
                  {filtrosTemp.comunidad === comunidad && (
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showProvinciaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProvinciaModal(false)}
      >
        <Pressable
          style={styles.selectorModalOverlay}
          onPress={() => setShowProvinciaModal(false)}
        >
          <Pressable style={styles.selectorModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>
                Provincia {filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades' ? `de ${filtrosTemp.comunidad}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowProvinciaModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar provincia..."
                placeholderTextColor={colors.textSecondary}
                value={searchProvincia}
                onChangeText={setSearchProvincia}
              />
              {searchProvincia.length > 0 && (
                <TouchableOpacity onPress={() => setSearchProvincia('')}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.selectorModalBody}>
              {filteredProvincias.length > 0 ? (
                filteredProvincias.map((provincia) => (
                  <TouchableOpacity
                    key={provincia}
                    style={[
                      styles.selectorModalOption,
                      filtrosTemp.provincia === provincia && styles.selectorModalOptionActive,
                    ]}
                    onPress={() => handleProvinciaSelect(provincia)}
                  >
                    <Text
                      style={[
                        styles.selectorModalOptionText,
                        filtrosTemp.provincia === provincia && styles.selectorModalOptionTextActive,
                      ]}
                    >
                      {provincia}
                    </Text>
                    {filtrosTemp.provincia === provincia && (
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {filtrosTemp.comunidad ? 'No hay provincias disponibles' : 'Selecciona primero una comunidad'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.headerText,
  },
  limpiarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  loadingBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  compactSection: {
    marginTop: 16,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  compactSelectButton: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  compactSelectButtonDisabled: {
    opacity: 0.5,
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  selectValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  distanceLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  distanceInput: {
    width: 60,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  compactChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  compactChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    fontSize: 16,
  },
  compactChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  compactChipTextActive: {
    color: colors.headerText,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  aplicarButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  aplicarGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aplicarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.headerText,
  },
  selectorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  selectorModalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 9999,
  },
  selectorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  selectorModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  selectorModalBody: {
    maxHeight: 400,
  },
  selectorModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  selectorModalOptionActive: {
    backgroundColor: `${colors.primary}15`,
  },
  selectorModalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  selectorModalOptionTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
