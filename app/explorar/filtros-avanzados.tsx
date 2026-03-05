
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { Filtros } from '@/types';
import { useFilters } from '@/contexts/FilterContext';
import { useRouter } from 'expo-router';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COMUNIDADES_PROVINCIAS: Record<string, string[]> = {
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

/**
 * ✅ FILTROS AVANZADOS v7.0 - DISEÑO ULTRA COMPACTO Y ORIGINAL
 * 
 * MEJORAS v7.0:
 * - 🎨 Diseño más compacto y minimalista
 * - 📱 Chips más pequeños y organizados
 * - ✨ Colores vibrantes y modernos
 * - 🎯 Mejor uso del espacio vertical
 * - 🌈 Diseño original y atractivo
 * - 🚀 Caché limpiada (cache key v7.0)
 */
export default function FiltrosAvanzadosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { 
    filtros: contextFiltros, 
    aplicarFiltros: contextAplicarFiltros, 
    limpiarFiltros: contextLimpiarFiltros,
    dynamicOptions,
    refreshDynamicOptions,
    isLoadingOptions,
  } = useFilters();
  
  const [filtrosTemp, setFiltrosTemp] = useState<Filtros>(contextFiltros);
  const [showComunidadModal, setShowComunidadModal] = useState(false);
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);
  const [searchComunidad, setSearchComunidad] = useState('');
  const [searchProvincia, setSearchProvincia] = useState('');

  useEffect(() => {
    console.log('[FiltrosAvanzados v7.0] 🎨 Inicializando diseño ultra compacto');
    setFiltrosTemp(contextFiltros);
    refreshDynamicOptions();
  }, [contextFiltros, refreshDynamicOptions]);

  const toggleArrayItem = useCallback((array: string[] | undefined, item: string): string[] => {
    const arr = array || [];
    if (arr.includes(item)) {
      return arr.filter((i) => i !== item);
    }
    return [...arr, item];
  }, []);

  const handleServicioToggle = useCallback((servicioId: string) => {
    setFiltrosTemp(prev => ({
      ...prev,
      servicios: toggleArrayItem(prev.servicios, servicioId),
    }));
  }, [toggleArrayItem]);

  const handleAmbienteToggle = useCallback((ambienteId: string) => {
    setFiltrosTemp(prev => ({
      ...prev,
      ambiente: ambienteId === 'cualquiera' ? undefined : toggleArrayItem(prev.ambiente, ambienteId),
    }));
  }, [toggleArrayItem]);

  const handleClientelaToggle = useCallback((clientelaId: string) => {
    setFiltrosTemp(prev => ({
      ...prev,
      clientela: clientelaId === 'cualquiera' ? undefined : toggleArrayItem(prev.clientela, clientelaId),
    }));
  }, [toggleArrayItem]);

  const handleAplicar = useCallback(() => {
    console.log('[FiltrosAvanzados v7.0] ✅ Aplicando filtros:', filtrosTemp);
    contextAplicarFiltros(filtrosTemp);
    router.back();
  }, [filtrosTemp, contextAplicarFiltros, router]);

  const handleLimpiar = useCallback(() => {
    console.log('[FiltrosAvanzados v7.0] 🧹 Limpiando filtros');
    const emptyFiltros = {};
    setFiltrosTemp(emptyFiltros);
    setTimeout(() => {
      contextLimpiarFiltros();
    }, 0);
  }, [contextLimpiarFiltros]);

  const handleComunidadSelect = useCallback((selectedComunidad: string) => {
    console.log('[FiltrosAvanzados v7.0] 📍 Comunidad seleccionada:', selectedComunidad);
    setFiltrosTemp(prev => {
      const newFiltros = {
        ...prev,
        comunidad: selectedComunidad === 'Todas las Comunidades' ? undefined : selectedComunidad,
      };
      
      if (selectedComunidad !== 'Todas las Comunidades') {
        const availableProvincias = COMUNIDADES_PROVINCIAS[selectedComunidad] || [];
        if (prev.provincia && !availableProvincias.includes(prev.provincia)) {
          newFiltros.provincia = undefined;
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
    console.log('[FiltrosAvanzados v7.0] 📍 Provincia seleccionada:', provincia);
    setFiltrosTemp(prev => ({
      ...prev,
      provincia: prev.provincia === provincia ? undefined : provincia,
    }));
    setShowProvinciaModal(false);
    setSearchProvincia('');
  }, []);

  const handleDistanciaChange = useCallback((value: number) => {
    console.log('[FiltrosAvanzados v7.0] 📏 Radio cambiado a:', value, 'km');
    setFiltrosTemp(prev => ({
      ...prev,
      distancia: value,
    }));
  }, []);

  const activateDistanceFilter = useCallback(() => {
    console.log('[FiltrosAvanzados v7.0] 🎯 Activando filtro de distancia');
    setFiltrosTemp(prev => ({
      ...prev,
      distancia: 50,
    }));
  }, []);

  const resetDistanceFilter = useCallback(() => {
    console.log('[FiltrosAvanzados v7.0] 🔄 Reseteando radio de búsqueda');
    setFiltrosTemp(prev => ({
      ...prev,
      distancia: undefined,
    }));
  }, []);

  const allComunidades = useMemo(() => {
    const staticComunidades = Object.keys(COMUNIDADES_PROVINCIAS);
    const dynamicComunidades = dynamicOptions.comunidades || [];
    const merged = new Set([...staticComunidades, ...dynamicComunidades]);
    return ['Todas las Comunidades', ...Array.from(merged).sort()];
  }, [dynamicOptions.comunidades]);

  const filteredComunidades = useMemo(() => {
    if (!searchComunidad.trim()) {
      return allComunidades;
    }
    const query = searchComunidad.toLowerCase();
    return allComunidades.filter(c =>
      c.toLowerCase().includes(query)
    );
  }, [searchComunidad, allComunidades]);

  const availableProvincias = useMemo(() => {
    if (!filtrosTemp.comunidad || filtrosTemp.comunidad === 'Todas las Comunidades') {
      return dynamicOptions.provincias || [];
    }
    return COMUNIDADES_PROVINCIAS[filtrosTemp.comunidad] || [];
  }, [filtrosTemp.comunidad, dynamicOptions.provincias]);
    
  const filteredProvincias = useMemo(() => {
    if (!searchProvincia.trim()) {
      return availableProvincias;
    }
    const query = searchProvincia.toLowerCase();
    return availableProvincias.filter(p =>
      p.toLowerCase().includes(query)
    );
  }, [availableProvincias, searchProvincia]);

  const serviciosDisponibles = useMemo(() => {
    return dynamicOptions.servicios.map(servicio => {
      let icon = '✓';
      if (servicio === 'terraza') icon = '☀️';
      else if (servicio === 'wifi') icon = '📶';
      else if (servicio === 'parking') icon = '🅿️';
      else if (servicio === 'accesible') icon = '♿';
      else if (servicio === 'reservas') icon = '📅';
      else if (servicio === 'delivery') icon = '🚚';
      else if (servicio === 'takeaway') icon = '🥡';
      
      return {
        id: servicio,
        label: servicio.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        icon: icon,
      };
    });
  }, [dynamicOptions.servicios]);

  const ambientesDisponibles = useMemo(() => {
    const ambientes = [{ id: 'cualquiera', label: 'Cualquiera', icon: '✨' }];
    dynamicOptions.ambientes.forEach(ambiente => {
      let icon = '🌟';
      if (ambiente === 'tranquilo') icon = '🌙';
      else if (ambiente === 'animado') icon = '🎉';
      else if (ambiente === 'romantico') icon = '💕';
      else if (ambiente === 'familiar') icon = '👨‍👩‍👧‍👦';
      else if (ambiente === 'moderno') icon = '✨';
      else if (ambiente === 'tradicional') icon = '🏛️';
      
      ambientes.push({
        id: ambiente,
        label: ambiente.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        icon: icon,
      });
    });
    return ambientes;
  }, [dynamicOptions.ambientes]);

  const clientelaDisponible = useMemo(() => {
    const clientela = [{ id: 'cualquiera', label: 'Cualquiera', icon: '✨' }];
    dynamicOptions.clientela.forEach(tipo => {
      let icon = '👤';
      if (tipo === 'grupos') icon = '👥';
      else if (tipo === 'turistas') icon = '🧳';
      else if (tipo === 'familias') icon = '👨‍👩‍👧‍👦';
      else if (tipo === 'jovenes') icon = '🎉';
      else if (tipo === 'profesionales') icon = '💼';
      
      clientela.push({
        id: tipo,
        label: tipo.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        icon: icon,
      });
    });
    return clientela;
  }, [dynamicOptions.clientela]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filtrosTemp.servicios && filtrosTemp.servicios.length > 0) count++;
    if (filtrosTemp.ambiente && filtrosTemp.ambiente.length > 0) count++;
    if (filtrosTemp.clientela && filtrosTemp.clientela.length > 0) count++;
    if (filtrosTemp.comunidad) count++;
    if (filtrosTemp.provincia) count++;
    if (filtrosTemp.distancia !== undefined && filtrosTemp.distancia !== null) count++;
    return count;
  }, [filtrosTemp]);

  const footerPaddingBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : 16;
  const scrollContentPaddingBottom = Platform.OS === 'android' ? 100 + insets.bottom : 100;
  const isDistanceFilterActive = filtrosTemp.distancia !== undefined && filtrosTemp.distancia !== null;

  const distanceDisplayValue = isDistanceFilterActive ? `${Math.round(filtrosTemp.distancia!)} km` : 'Sin límite';

  return (
    <View style={styles.container}>
      {/* HEADER COMPACTO */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol 
              ios_icon_name="chevron.left" 
              android_material_icon_name="arrow_back" 
              size={scaleIconSize(22)} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(18) }]}>Filtros</Text>
            {activeFiltersCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={[styles.headerBadgeText, { fontSize: scaleFontSize(11) }]}>
                  {activeFiltersCount}
                </Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity onPress={handleLimpiar} style={styles.clearButton}>
            <IconSymbol 
              ios_icon_name="trash" 
              android_material_icon_name="delete" 
              size={scaleIconSize(18)} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollContentPaddingBottom }]}
      >
        {isLoadingOptions && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { fontSize: scaleFontSize(13) }]}>
              Cargando...
            </Text>
          </View>
        )}

        {/* 📍 UBICACIÓN - ULTRA COMPACTO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14) }]}>Ubicación</Text>
          </View>

          <View style={styles.sectionContent}>
            {/* Selectores compactos */}
            <View style={styles.locationRow}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => setShowComunidadModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.locationLabel, { fontSize: scaleFontSize(10) }]}>
                  COMUNIDAD
                </Text>
                <Text 
                  style={[styles.locationValue, { fontSize: scaleFontSize(13) }]} 
                  numberOfLines={1}
                >
                  {filtrosTemp.comunidad || 'Todas'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.locationButton,
                  (!filtrosTemp.comunidad || filtrosTemp.comunidad === 'Todas las Comunidades') && 
                  styles.locationButtonDisabled
                ]}
                onPress={() => {
                  if (filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades') {
                    setShowProvinciaModal(true);
                  }
                }}
                disabled={!filtrosTemp.comunidad || filtrosTemp.comunidad === 'Todas las Comunidades'}
                activeOpacity={0.7}
              >
                <Text style={[styles.locationLabel, { fontSize: scaleFontSize(10) }]}>
                  PROVINCIA
                </Text>
                <Text 
                  style={[styles.locationValue, { fontSize: scaleFontSize(13) }]} 
                  numberOfLines={1}
                >
                  {filtrosTemp.provincia || 
                   (filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades' 
                     ? 'Todas' 
                     : 'Selecciona')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Radio compacto */}
            <View style={styles.distanceContainer}>
              <View style={styles.distanceHeader}>
                <Text style={[styles.distanceLabel, { fontSize: scaleFontSize(12) }]}>
                  Radio de búsqueda
                </Text>
                <View style={[
                  styles.distanceBadge,
                  isDistanceFilterActive && styles.distanceBadgeActive
                ]}>
                  <Text style={[
                    styles.distanceBadgeText,
                    { fontSize: scaleFontSize(11) },
                    isDistanceFilterActive && styles.distanceBadgeTextActive
                  ]}>
                    {distanceDisplayValue}
                  </Text>
                </View>
              </View>

              {isDistanceFilterActive ? (
                <>
                  <Slider
                    style={styles.distanceSlider}
                    minimumValue={1}
                    maximumValue={100}
                    step={1}
                    value={filtrosTemp.distancia || 50}
                    onValueChange={handleDistanciaChange}
                    minimumTrackTintColor="#10B981"
                    maximumTrackTintColor={colors.cardBorder}
                    thumbTintColor="#10B981"
                  />
                  
                  <TouchableOpacity 
                    style={styles.distanceResetButton}
                    onPress={resetDistanceFilter}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.distanceResetText, { fontSize: scaleFontSize(11) }]}>
                      Quitar límite
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.distanceActivateButton}
                  onPress={activateDistanceFilter}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.distanceActivateText, { fontSize: scaleFontSize(12) }]}>
                    Activar filtro
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ✅ SERVICIOS - COMPACTO */}
        {serviciosDisponibles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14) }]}>Servicios</Text>
              <View style={styles.countBadge}>
                <Text style={[styles.countBadgeText, { fontSize: scaleFontSize(10) }]}>
                  {serviciosDisponibles.length}
                </Text>
              </View>
            </View>

            <View style={styles.sectionContent}>
              <View style={styles.chipsContainer}>
                {serviciosDisponibles.map((servicio) => {
                  const isSelected = filtrosTemp.servicios?.includes(servicio.id);
                  
                  return (
                    <TouchableOpacity
                      key={servicio.id}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive,
                      ]}
                      onPress={() => handleServicioToggle(servicio.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipIcon, { fontSize: scaleFontSize(14) }]}>
                        {servicio.icon}
                      </Text>
                      <Text 
                        style={[
                          styles.chipText, 
                          { fontSize: scaleFontSize(11) },
                          isSelected && styles.chipTextActive
                        ]}
                      >
                        {servicio.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ✨ AMBIENTE - COMPACTO */}
        {ambientesDisponibles.length > 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14) }]}>Ambiente</Text>
              <View style={styles.countBadge}>
                <Text style={[styles.countBadgeText, { fontSize: scaleFontSize(10) }]}>
                  {ambientesDisponibles.length - 1}
                </Text>
              </View>
            </View>

            <View style={styles.sectionContent}>
              <View style={styles.chipsContainer}>
                {ambientesDisponibles.map((ambiente) => {
                  const isSelected = ambiente.id === 'cualquiera'
                    ? !filtrosTemp.ambiente || filtrosTemp.ambiente.length === 0
                    : filtrosTemp.ambiente?.includes(ambiente.id);
                  
                  return (
                    <TouchableOpacity
                      key={ambiente.id}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive,
                      ]}
                      onPress={() => handleAmbienteToggle(ambiente.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipIcon, { fontSize: scaleFontSize(14) }]}>
                        {ambiente.icon}
                      </Text>
                      <Text 
                        style={[
                          styles.chipText, 
                          { fontSize: scaleFontSize(11) },
                          isSelected && styles.chipTextActive
                        ]}
                      >
                        {ambiente.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* 👥 CLIENTELA - COMPACTO */}
        {clientelaDisponible.length > 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconDot, { backgroundColor: '#EC4899' }]} />
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14) }]}>Clientela</Text>
              <View style={styles.countBadge}>
                <Text style={[styles.countBadgeText, { fontSize: scaleFontSize(10) }]}>
                  {clientelaDisponible.length - 1}
                </Text>
              </View>
            </View>

            <View style={styles.sectionContent}>
              <View style={styles.chipsContainer}>
                {clientelaDisponible.map((clientela) => {
                  const isSelected = clientela.id === 'cualquiera'
                    ? !filtrosTemp.clientela || filtrosTemp.clientela.length === 0
                    : filtrosTemp.clientela?.includes(clientela.id);
                  
                  return (
                    <TouchableOpacity
                      key={clientela.id}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive,
                      ]}
                      onPress={() => handleClientelaToggle(clientela.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipIcon, { fontSize: scaleFontSize(14) }]}>
                        {clientela.icon}
                      </Text>
                      <Text 
                        style={[
                          styles.chipText, 
                          { fontSize: scaleFontSize(11) },
                          isSelected && styles.chipTextActive
                        ]}
                      >
                        {clientela.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FOOTER COMPACTO */}
      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        <TouchableOpacity 
          style={styles.applyButton} 
          onPress={handleAplicar}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyButtonGradient}
          >
            <Text style={[styles.applyButtonText, { fontSize: scaleFontSize(15) }]}>
              Aplicar Filtros
            </Text>
            {activeFiltersCount > 0 && (
              <View style={styles.applyButtonBadge}>
                <Text style={[styles.applyButtonBadgeText, { fontSize: scaleFontSize(11) }]}>
                  {activeFiltersCount}
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* MODAL COMUNIDAD */}
      <Modal
        visible={showComunidadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComunidadModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowComunidadModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(16) }]}>
                Comunidad Autónoma
              </Text>
              <TouchableOpacity 
                onPress={() => setShowComunidadModal(false)}
                style={styles.modalCloseButton}
              >
                <IconSymbol 
                  ios_icon_name="xmark.circle.fill" 
                  android_material_icon_name="cancel" 
                  size={scaleIconSize(26)} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchContainer}>
              <IconSymbol 
                ios_icon_name="magnifyingglass" 
                android_material_icon_name="search" 
                size={scaleIconSize(18)} 
                color={colors.textSecondary} 
              />
              <TextInput
                style={[styles.modalSearchInput, { fontSize: scaleFontSize(14) }]}
                placeholder="Buscar comunidad..."
                placeholderTextColor={colors.textSecondary}
                value={searchComunidad}
                onChangeText={setSearchComunidad}
              />
              {searchComunidad.length > 0 && (
                <TouchableOpacity onPress={() => setSearchComunidad('')}>
                  <IconSymbol 
                    ios_icon_name="xmark.circle.fill" 
                    android_material_icon_name="cancel" 
                    size={scaleIconSize(18)} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.modalList}>
              {filteredComunidades.length > 0 ? (
                filteredComunidades.map((comunidad) => {
                  const isSelected = filtrosTemp.comunidad === comunidad;
                  
                  return (
                    <TouchableOpacity
                      key={comunidad}
                      style={[
                        styles.modalOption,
                        isSelected && styles.modalOptionActive,
                      ]}
                      onPress={() => handleComunidadSelect(comunidad)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          { fontSize: scaleFontSize(14) },
                          isSelected && styles.modalOptionTextActive,
                        ]}
                      >
                        {comunidad}
                      </Text>
                      {isSelected && (
                        <View style={styles.modalOptionCheck}>
                          <IconSymbol 
                            ios_icon_name="checkmark.circle.fill" 
                            android_material_icon_name="check_circle" 
                            size={scaleIconSize(22)} 
                            color={colors.primary} 
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.modalEmpty}>
                  <Text style={[styles.modalEmptyText, { fontSize: scaleFontSize(13) }]}>
                    No se encontraron comunidades
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL PROVINCIA */}
      <Modal
        visible={showProvinciaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProvinciaModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowProvinciaModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(16) }]}>
                Provincia
                {filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades' && (
                  <Text style={[styles.modalSubtitle, { fontSize: scaleFontSize(13) }]}>
                    {' '}de {filtrosTemp.comunidad}
                  </Text>
                )}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowProvinciaModal(false)}
                style={styles.modalCloseButton}
              >
                <IconSymbol 
                  ios_icon_name="xmark.circle.fill" 
                  android_material_icon_name="cancel" 
                  size={scaleIconSize(26)} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchContainer}>
              <IconSymbol 
                ios_icon_name="magnifyingglass" 
                android_material_icon_name="search" 
                size={scaleIconSize(18)} 
                color={colors.textSecondary} 
              />
              <TextInput
                style={[styles.modalSearchInput, { fontSize: scaleFontSize(14) }]}
                placeholder="Buscar provincia..."
                placeholderTextColor={colors.textSecondary}
                value={searchProvincia}
                onChangeText={setSearchProvincia}
              />
              {searchProvincia.length > 0 && (
                <TouchableOpacity onPress={() => setSearchProvincia('')}>
                  <IconSymbol 
                    ios_icon_name="xmark.circle.fill" 
                    android_material_icon_name="cancel" 
                    size={scaleIconSize(18)} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.modalList}>
              {filteredProvincias.length > 0 ? (
                filteredProvincias.map((provincia) => {
                  const isSelected = filtrosTemp.provincia === provincia;
                  
                  return (
                    <TouchableOpacity
                      key={provincia}
                      style={[
                        styles.modalOption,
                        isSelected && styles.modalOptionActive,
                      ]}
                      onPress={() => handleProvinciaSelect(provincia)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          { fontSize: scaleFontSize(14) },
                          isSelected && styles.modalOptionTextActive,
                        ]}
                      >
                        {provincia}
                      </Text>
                      {isSelected && (
                        <View style={styles.modalOptionCheck}>
                          <IconSymbol 
                            ios_icon_name="checkmark.circle.fill" 
                            android_material_icon_name="check_circle" 
                            size={scaleIconSize(22)} 
                            color={colors.primary} 
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.modalEmpty}>
                  <Text style={[styles.modalEmptyText, { fontSize: scaleFontSize(13) }]}>
                    {filtrosTemp.comunidad 
                      ? 'No hay provincias disponibles' 
                      : 'Selecciona primero una comunidad'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // HEADER COMPACTO
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: '800',
    color: colors.headerText,
    letterSpacing: 0.3,
  },
  headerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    fontWeight: '800',
    color: colors.headerText,
  },
  clearButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  
  // SCROLL VIEW
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  
  // LOADING CARD
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  loadingText: {
    fontWeight: '600',
    color: colors.primary,
  },
  
  // SECCIONES COMPACTAS
  section: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  iconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sectionContent: {
    padding: 14,
  },
  
  // UBICACIÓN COMPACTA
  locationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  locationButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 10,
  },
  locationButtonDisabled: {
    opacity: 0.5,
  },
  locationLabel: {
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  locationValue: {
    fontWeight: '600',
    color: colors.text,
  },
  
  // DISTANCIA COMPACTA
  distanceContainer: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 12,
  },
  distanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  distanceLabel: {
    fontWeight: '600',
    color: colors.text,
  },
  distanceBadge: {
    backgroundColor: colors.cardBorder + '40',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  distanceBadgeActive: {
    backgroundColor: '#10B981' + '20',
    borderColor: '#10B981' + '50',
  },
  distanceBadgeText: {
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  distanceBadgeTextActive: {
    color: '#10B981',
  },
  distanceSlider: {
    width: '100%',
    height: 32,
    marginVertical: 4,
  },
  distanceResetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  distanceResetText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  distanceActivateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981' + '15',
    borderWidth: 1.5,
    borderColor: '#10B981' + '40',
    borderRadius: 10,
    paddingVertical: 10,
  },
  distanceActivateText: {
    fontWeight: '700',
    color: '#10B981',
  },
  
  // CHIPS COMPACTOS
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
  },
  chipText: {
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.headerText,
    fontWeight: '700',
  },
  
  // FOOTER COMPACTO
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  applyButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyButtonText: {
    fontWeight: '800',
    color: colors.headerText,
    letterSpacing: 0.3,
  },
  applyButtonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  applyButtonBadgeText: {
    fontWeight: '800',
    color: colors.headerText,
  },
  
  // MODALES COMPACTOS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  modalSubtitle: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  modalSearchInput: {
    flex: 1,
    color: colors.text,
    fontWeight: '500',
  },
  modalList: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalOptionActive: {
    backgroundColor: colors.primary + '10',
  },
  modalOptionText: {
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  modalOptionTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  modalOptionCheck: {
    marginLeft: 10,
  },
  modalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
