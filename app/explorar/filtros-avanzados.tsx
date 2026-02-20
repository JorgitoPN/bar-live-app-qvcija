
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
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';
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
 * ✅ ANDROID FULL-SCREEN FILTERS PAGE v3.1 - CATEGORY SYNC + DYNAMIC + INSTANT
 * 
 * NEW FEATURES v3.1:
 * - 🔄 CATEGORY SYNC: Filters sync with category selection
 * - ✅ Bidirectional sync: Category ↔ Tipo filter
 * - ✅ Opens with current category pre-selected
 * - ✅ Applying filters updates category in Explorar
 * 
 * Previous features v3.0:
 * - 🎯 DYNAMIC FILTERS: Only show characteristics with active locales
 * - ⚡ INSTANT CLEAR: Synchronous UI update, background fetch
 * - 🎚️ SLIDER: Replaced text input with slider (1-100km range)
 * - ✅ Real-time value display on slider
 * - ✅ Smooth UX with no lag on clear
 * - ✅ Safe area insets for Android system buttons
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
    selectedCategory,
  } = useFilters();
  
  const [filtrosTemp, setFiltrosTemp] = useState<Filtros>(contextFiltros);
  const [showComunidadModal, setShowComunidadModal] = useState(false);
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);
  const [searchComunidad, setSearchComunidad] = useState('');
  const [searchProvincia, setSearchProvincia] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ubicacion: true,
    tipo: false,
    servicios: false,
    ambiente: false,
    clientela: false,
  });

  useEffect(() => {
    console.log('[FiltrosAvanzados Android v3.1] 🔄 Page opened, loading filters');
    console.log('[FiltrosAvanzados Android v3.1] 🏷️ Current category:', selectedCategory);
    
    // ✅ SYNC v3.1: Initialize with current category
    const syncedFiltros = { ...contextFiltros };
    if (selectedCategory && selectedCategory !== 'todas') {
      syncedFiltros.tipo = [selectedCategory];
      console.log('[FiltrosAvanzados Android v3.1] 🔄 Synced tipo filter with category:', selectedCategory);
    }
    
    setFiltrosTemp(syncedFiltros);
    refreshDynamicOptions();
  }, [contextFiltros, refreshDynamicOptions, selectedCategory]);

  const toggleArrayItem = useCallback((array: string[] | undefined, item: string): string[] => {
    const arr = array || [];
    if (arr.includes(item)) {
      return arr.filter((i) => i !== item);
    }
    return [...arr, item];
  }, []);

  const handleTipoToggle = useCallback((tipoId: string) => {
    setFiltrosTemp(prev => ({
      ...prev,
      tipo: tipoId === 'todos' ? undefined : toggleArrayItem(prev.tipo, tipoId),
    }));
  }, [toggleArrayItem]);

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
    console.log('[FiltrosAvanzados Android v2.0] ✅ Applying filters:', filtrosTemp);
    contextAplicarFiltros(filtrosTemp);
    router.back();
  }, [filtrosTemp, contextAplicarFiltros, router]);

  const handleLimpiar = useCallback(() => {
    console.log('[FiltrosAvanzados Android v3.1] 🧹 Clearing all filters - INSTANT UI UPDATE');
    
    // ✅ PASO 1: Actualizar UI INMEDIATAMENTE (síncrono)
    const emptyFiltros = {};
    setFiltrosTemp(emptyFiltros);
    
    // ✅ PASO 2: Actualizar contexto INMEDIATAMENTE (síncrono)
    // This ensures the filters are cleared immediately
    contextLimpiarFiltros();
  }, [contextLimpiarFiltros]);

  const handleComunidadSelect = useCallback((selectedComunidad: string) => {
    console.log('[FiltrosAvanzados Android v2.0] 📍 Selected comunidad:', selectedComunidad);
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
    console.log('[FiltrosAvanzados Android v2.0] 📍 Selected provincia:', provincia);
    setFiltrosTemp(prev => ({
      ...prev,
      provincia: prev.provincia === provincia ? undefined : provincia,
    }));
    setShowProvinciaModal(false);
    setSearchProvincia('');
  }, []);

  const handleDistanciaChange = useCallback((value: number) => {
    console.log('[FiltrosAvanzados Android v3.0] 📏 Radius changed to:', value, 'km');
    setFiltrosTemp(prev => ({
      ...prev,
      distancia: value,
    }));
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
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

  const tiposLocales = useMemo(() => {
    const tipos = [{ id: 'todos', label: 'Todos', icon: '🏪' }];
    
    const filteredTipos = dynamicOptions.tipos.filter(tipo => 
      tipo !== 'lounge' && tipo !== 'sala_conciertos'
    );
    
    filteredTipos.forEach(tipo => {
      let icon = '📍';
      if (tipo === 'cafe') icon = '☕';
      else if (tipo === 'bar') icon = '🍷';
      else if (tipo === 'restaurante') icon = '🍽️';
      else if (tipo === 'pub') icon = '🍺';
      else if (tipo === 'cocteleria') icon = '🍹';
      else if (tipo === 'discoteca') icon = '🎵';
      else if (tipo === 'terraza') icon = '☀️';
      else if (tipo === 'rooftop') icon = '🏢';
      
      tipos.push({
        id: tipo,
        label: tipo.charAt(0).toUpperCase() + tipo.slice(1),
        icon: icon,
      });
    });
    
    return tipos;
  }, [dynamicOptions.tipos]);

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
    if (filtrosTemp.tipo && filtrosTemp.tipo.length > 0) count++;
    if (filtrosTemp.servicios && filtrosTemp.servicios.length > 0) count++;
    if (filtrosTemp.ambiente && filtrosTemp.ambiente.length > 0) count++;
    if (filtrosTemp.clientela && filtrosTemp.clientela.length > 0) count++;
    if (filtrosTemp.comunidad) count++;
    if (filtrosTemp.provincia) count++;
    if (filtrosTemp.distancia) count++;
    return count;
  }, [filtrosTemp]);

  // ✅ CRITICAL FIX v2.0: Calculate proper bottom padding for Android system buttons
  const footerPaddingBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 20) : 20;
  const scrollContentPaddingBottom = Platform.OS === 'android' ? 120 + insets.bottom : 120;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={scaleIconSize(24)} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>Filtros Avanzados</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={[styles.filterCountText, { fontSize: scaleFontSize(11) }]}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleLimpiar} style={styles.clearButton}>
          <Text style={[styles.limpiarText, { fontSize: scaleFontSize(13) }]}>Limpiar</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: scrollContentPaddingBottom }]}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      >
        {isLoadingOptions && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingBannerText, { fontSize: scaleFontSize(13) }]}>Cargando opciones...</Text>
          </View>
        )}

        {/* LOCATION SECTION */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('ubicacion')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconContainer}>
                <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={scaleIconSize(16)} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14) }]}>Ubicación</Text>
            </View>
            <IconSymbol 
              ios_icon_name={expandedSections.ubicacion ? "chevron.up" : "chevron.down"} 
              android_material_icon_name={expandedSections.ubicacion ? "expand_less" : "expand_more"} 
              size={scaleIconSize(18)} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {expandedSections.ubicacion && (
            <View style={styles.sectionContent}>
              <View style={styles.locationGrid}>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => {
                    console.log('[FiltrosAvanzados Android v2.0] 🔍 Opening comunidad modal');
                    setShowComunidadModal(true);
                  }}
                >
                  <Text style={[styles.locationLabel, { fontSize: scaleFontSize(9) }]}>Comunidad</Text>
                  <Text style={[styles.locationValue, { fontSize: scaleFontSize(12) }]} numberOfLines={1}>
                    {filtrosTemp.comunidad || 'Todas'}
                  </Text>
                  <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={scaleIconSize(12)} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    (!filtrosTemp.comunidad || filtrosTemp.comunidad === 'Todas las Comunidades') && styles.locationButtonDisabled
                  ]}
                  onPress={() => {
                    if (filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades') {
                      console.log('[FiltrosAvanzados Android v2.0] 🔍 Opening provincia modal');
                      setShowProvinciaModal(true);
                    }
                  }}
                  disabled={!filtrosTemp.comunidad || filtrosTemp.comunidad === 'Todas las Comunidades'}
                >
                  <Text style={[styles.locationLabel, { fontSize: scaleFontSize(9) }]}>Provincia</Text>
                  <Text style={[styles.locationValue, { fontSize: scaleFontSize(12) }]} numberOfLines={1}>
                    {filtrosTemp.provincia || (filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades' ? 'Todas' : 'Selecciona')}
                  </Text>
                  <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={scaleIconSize(12)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.distanceContainer}>
                <View style={styles.distanceHeader}>
                  <View style={styles.distanceLabelRow}>
                    <IconSymbol ios_icon_name="location.circle" android_material_icon_name="location_on" size={scaleIconSize(14)} color={colors.primary} />
                    <Text style={[styles.distanceLabel, { fontSize: scaleFontSize(12) }]}>Radio de búsqueda</Text>
                  </View>
                  <View style={styles.distanceValueBadge}>
                    <Text style={[styles.distanceValueText, { fontSize: scaleFontSize(14) }]}>
                      {filtrosTemp.distancia ? `${Math.round(filtrosTemp.distancia)} km` : '50 km'}
                    </Text>
                  </View>
                </View>
                
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={100}
                  step={1}
                  value={filtrosTemp.distancia || 50}
                  onValueChange={handleDistanciaChange}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.cardBorder}
                  thumbTintColor={colors.primary}
                />
                
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabelText, { fontSize: scaleFontSize(11) }]}>1 km</Text>
                  <Text style={[styles.sliderLabelText, { fontSize: scaleFontSize(11) }]}>100 km</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* TIPO DE LOCAL SECTION */}
        {tiposLocales.length > 1 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('tipo')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconContainer}>
                  <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={scaleIconSize(16)} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14) }]}>Tipo de Local</Text>
                <Text style={[styles.sectionCount, { fontSize: scaleFontSize(11) }]}>({tiposLocales.length - 1})</Text>
              </View>
              <IconSymbol 
                ios_icon_name={expandedSections.tipo ? "chevron.up" : "chevron.down"} 
                android_material_icon_name={expandedSections.tipo ? "expand_less" : "expand_more"} 
                size={scaleIconSize(18)} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
            
            {expandedSections.tipo && (
              <View style={styles.sectionContent}>
                <View style={styles.chipContainer}>
                  {tiposLocales.map((tipo) => {
                    const isSelected = tipo.id === 'todos' 
                      ? !filtrosTemp.tipo || filtrosTemp.tipo.length === 0
                      : filtrosTemp.tipo?.includes(tipo.id);
                    
                    return (
                      <TouchableOpacity
                        key={tipo.id}
                        style={[
                          styles.chip,
                          isSelected && styles.chipActive,
                        ]}
                        onPress={() => handleTipoToggle(tipo.id)}
                      >
                        <Text style={[styles.chipIcon, { fontSize: scaleFontSize(14) }]}>{tipo.icon}</Text>
                        <Text style={[styles.chipText, { fontSize: scaleFontSize(11) }, isSelected && styles.chipTextActive]}>
                          {tipo.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* SERVICIOS SECTION */}
        {serviciosDisponibles.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('servicios')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconContainer}>
                  <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={scaleIconSize(16)} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14) }]}>Servicios</Text>
                <Text style={[styles.sectionCount, { fontSize: scaleFontSize(11) }]}>({serviciosDisponibles.length})</Text>
              </View>
              <IconSymbol 
                ios_icon_name={expandedSections.servicios ? "chevron.up" : "chevron.down"} 
                android_material_icon_name={expandedSections.servicios ? "expand_less" : "expand_more"} 
                size={scaleIconSize(18)} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
            
            {expandedSections.servicios && (
              <View style={styles.sectionContent}>
                <View style={styles.chipContainer}>
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
                      >
                        <Text style={[styles.chipIcon, { fontSize: scaleFontSize(14) }]}>{servicio.icon}</Text>
                        <Text style={[styles.chipText, { fontSize: scaleFontSize(11) }, isSelected && styles.chipTextActive]}>
                          {servicio.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* AMBIENTE SECTION */}
        {ambientesDisponibles.length > 1 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('ambiente')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconContainer}>
                  <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={scaleIconSize(16)} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14) }]}>Ambiente</Text>
                <Text style={[styles.sectionCount, { fontSize: scaleFontSize(11) }]}>({ambientesDisponibles.length - 1})</Text>
              </View>
              <IconSymbol 
                ios_icon_name={expandedSections.ambiente ? "chevron.up" : "chevron.down"} 
                android_material_icon_name={expandedSections.ambiente ? "expand_less" : "expand_more"} 
                size={scaleIconSize(18)} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
            
            {expandedSections.ambiente && (
              <View style={styles.sectionContent}>
                <View style={styles.chipContainer}>
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
                      >
                        <Text style={[styles.chipIcon, { fontSize: scaleFontSize(14) }]}>{ambiente.icon}</Text>
                        <Text style={[styles.chipText, { fontSize: scaleFontSize(11) }, isSelected && styles.chipTextActive]}>
                          {ambiente.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* CLIENTELA SECTION */}
        {clientelaDisponible.length > 1 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('clientela')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconContainer}>
                  <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="people" size={scaleIconSize(16)} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14) }]}>Clientela Típica</Text>
                <Text style={[styles.sectionCount, { fontSize: scaleFontSize(11) }]}>({clientelaDisponible.length - 1})</Text>
              </View>
              <IconSymbol 
                ios_icon_name={expandedSections.clientela ? "chevron.up" : "chevron.down"} 
                android_material_icon_name={expandedSections.clientela ? "expand_less" : "expand_more"} 
                size={scaleIconSize(18)} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
            
            {expandedSections.clientela && (
              <View style={styles.sectionContent}>
                <View style={styles.chipContainer}>
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
                      >
                        <Text style={[styles.chipIcon, { fontSize: scaleFontSize(14) }]}>{clientela.icon}</Text>
                        <Text style={[styles.chipText, { fontSize: scaleFontSize(11) }, isSelected && styles.chipTextActive]}>
                          {clientela.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {(tiposLocales.length === 1 && serviciosDisponibles.length === 0 && ambientesDisponibles.length === 1 && clientelaDisponible.length === 1) && !isLoadingOptions && (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="warning" size={scaleIconSize(48)} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(14) }]}>
              No hay opciones de filtro disponibles
            </Text>
            <Text style={[styles.emptyStateSubtext, { fontSize: scaleFontSize(12) }]}>
              Los filtros se generan automáticamente basados en los locales activos
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refreshDynamicOptions}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={scaleIconSize(16)} color={colors.white} />
              <Text style={[styles.refreshButtonText, { fontSize: scaleFontSize(13) }]}>Recargar opciones</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ✅ CRITICAL FIX v2.0: Footer with proper padding for Android system buttons */}
      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        <TouchableOpacity style={styles.aplicarButton} onPress={handleAplicar}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aplicarGradient}
          >
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={scaleIconSize(20)} color={colors.headerText} />
            <Text style={[styles.aplicarText, { fontSize: scaleFontSize(15) }]}>Aplicar filtros</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* COMUNIDAD MODAL */}
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
              <Text style={[styles.selectorModalTitle, { fontSize: scaleFontSize(16) }]}>Comunidad Autónoma</Text>
              <TouchableOpacity onPress={() => setShowComunidadModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={scaleIconSize(22)} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={scaleIconSize(18)} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { fontSize: scaleFontSize(14) }]}
                placeholder="Buscar comunidad..."
                placeholderTextColor={colors.textSecondary}
                value={searchComunidad}
                onChangeText={setSearchComunidad}
              />
              {searchComunidad.length > 0 && (
                <TouchableOpacity onPress={() => setSearchComunidad('')}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={scaleIconSize(18)} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.selectorModalBody}>
              {filteredComunidades.length > 0 ? (
                filteredComunidades.map((comunidad) => (
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
                        { fontSize: scaleFontSize(14) },
                        filtrosTemp.comunidad === comunidad && styles.selectorModalOptionTextActive,
                      ]}
                    >
                      {comunidad}
                    </Text>
                    {filtrosTemp.comunidad === comunidad && (
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={scaleIconSize(22)} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyModalState}>
                  <Text style={[styles.emptyModalText, { fontSize: scaleFontSize(14) }]}>No se encontraron comunidades</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* PROVINCIA MODAL */}
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
              <Text style={[styles.selectorModalTitle, { fontSize: scaleFontSize(16) }]}>
                Provincia {filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades' ? `de ${filtrosTemp.comunidad}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowProvinciaModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={scaleIconSize(22)} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={scaleIconSize(18)} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { fontSize: scaleFontSize(14) }]}
                placeholder="Buscar provincia..."
                placeholderTextColor={colors.textSecondary}
                value={searchProvincia}
                onChangeText={setSearchProvincia}
              />
              {searchProvincia.length > 0 && (
                <TouchableOpacity onPress={() => setSearchProvincia('')}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={scaleIconSize(18)} color={colors.textSecondary} />
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
                        { fontSize: scaleFontSize(14) },
                        filtrosTemp.provincia === provincia && styles.selectorModalOptionTextActive,
                      ]}
                    >
                      {provincia}
                    </Text>
                    {filtrosTemp.provincia === provincia && (
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={scaleIconSize(22)} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyModalState}>
                  <Text style={[styles.emptyModalText, { fontSize: scaleFontSize(14) }]}>
                    {filtrosTemp.comunidad ? 'No hay provincias disponibles' : 'Selecciona primero una comunidad'}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.headerText,
  },
  filterCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountText: {
    fontWeight: '800',
    color: colors.headerText,
  },
  limpiarText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  loadingBannerText: {
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    marginBottom: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  sectionCount: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  locationGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  locationButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  locationButtonDisabled: {
    opacity: 0.5,
  },
  locationLabel: {
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationValue: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  distanceContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  distanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  distanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distanceLabel: {
    fontWeight: '600',
    color: colors.text,
  },
  distanceValueBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  distanceValueText: {
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabelText: {
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
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
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  aplicarGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aplicarText: {
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  selectorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  selectorModalTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 18,
    marginTop: 14,
    marginBottom: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
  },
  selectorModalBody: {
    maxHeight: 400,
  },
  selectorModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  selectorModalOptionActive: {
    backgroundColor: colors.primary + '10',
  },
  selectorModalOptionText: {
    color: colors.text,
    fontWeight: '500',
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
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 14,
  },
  emptyStateSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyModalState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyModalText: {
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  refreshButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
});
