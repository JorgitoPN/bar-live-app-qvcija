
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
 * ✅ FILTROS AVANZADOS v6.0 - DISEÑO MEJORADO
 * 
 * MEJORAS:
 * - 🎨 Diseño más limpio y moderno
 * - 📱 Mejor organización visual
 * - ✨ Animaciones suaves
 * - 🎯 Mejor UX con chips más grandes
 * - 🌈 Colores más vibrantes
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
    console.log('[FiltrosAvanzados v6.0] 🎨 Inicializando diseño mejorado');
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
    console.log('[FiltrosAvanzados v6.0] ✅ Aplicando filtros:', filtrosTemp);
    contextAplicarFiltros(filtrosTemp);
    router.back();
  }, [filtrosTemp, contextAplicarFiltros, router]);

  const handleLimpiar = useCallback(() => {
    console.log('[FiltrosAvanzados v6.0] 🧹 Limpiando filtros');
    const emptyFiltros = {};
    setFiltrosTemp(emptyFiltros);
    setTimeout(() => {
      contextLimpiarFiltros();
    }, 0);
  }, [contextLimpiarFiltros]);

  const handleComunidadSelect = useCallback((selectedComunidad: string) => {
    console.log('[FiltrosAvanzados v6.0] 📍 Comunidad seleccionada:', selectedComunidad);
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
    console.log('[FiltrosAvanzados v6.0] 📍 Provincia seleccionada:', provincia);
    setFiltrosTemp(prev => ({
      ...prev,
      provincia: prev.provincia === provincia ? undefined : provincia,
    }));
    setShowProvinciaModal(false);
    setSearchProvincia('');
  }, []);

  const handleDistanciaChange = useCallback((value: number) => {
    console.log('[FiltrosAvanzados v6.0] 📏 Radio cambiado a:', value, 'km');
    setFiltrosTemp(prev => ({
      ...prev,
      distancia: value,
    }));
  }, []);

  const activateDistanceFilter = useCallback(() => {
    console.log('[FiltrosAvanzados v6.0] 🎯 Activando filtro de distancia');
    setFiltrosTemp(prev => ({
      ...prev,
      distancia: 50,
    }));
  }, []);

  const resetDistanceFilter = useCallback(() => {
    console.log('[FiltrosAvanzados v6.0] 🔄 Reseteando radio de búsqueda');
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

  const footerPaddingBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 20) : 20;
  const scrollContentPaddingBottom = Platform.OS === 'android' ? 120 + insets.bottom : 120;
  const isDistanceFilterActive = filtrosTemp.distancia !== undefined && filtrosTemp.distancia !== null;

  const distanceDisplayValue = isDistanceFilterActive ? `${Math.round(filtrosTemp.distancia!)} km` : 'Sin límite';

  return (
    <View style={styles.container}>
      {/* HEADER MEJORADO */}
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
              size={scaleIconSize(24)} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(22) }]}>Filtros Avanzados</Text>
            {activeFiltersCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={[styles.headerBadgeText, { fontSize: scaleFontSize(12) }]}>
                  {activeFiltersCount}
                </Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity onPress={handleLimpiar} style={styles.clearButton}>
            <IconSymbol 
              ios_icon_name="trash" 
              android_material_icon_name="delete" 
              size={scaleIconSize(20)} 
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
            <Text style={[styles.loadingText, { fontSize: scaleFontSize(14) }]}>
              Cargando opciones...
            </Text>
          </View>
        )}

        {/* 📍 UBICACIÓN - DISEÑO MEJORADO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#3B82F6' + '20' }]}>
                <IconSymbol 
                  ios_icon_name="mappin.circle.fill" 
                  android_material_icon_name="location_on" 
                  size={scaleIconSize(20)} 
                  color="#3B82F6" 
                />
              </View>
              <Text style={[styles.cardTitle, { fontSize: scaleFontSize(16) }]}>Ubicación</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            {/* Selectores de ubicación */}
            <View style={styles.locationRow}>
              <TouchableOpacity
                style={styles.locationSelector}
                onPress={() => setShowComunidadModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.locationSelectorContent}>
                  <Text style={[styles.locationSelectorLabel, { fontSize: scaleFontSize(11) }]}>
                    COMUNIDAD
                  </Text>
                  <Text 
                    style={[styles.locationSelectorValue, { fontSize: scaleFontSize(14) }]} 
                    numberOfLines={1}
                  >
                    {filtrosTemp.comunidad || 'Todas'}
                  </Text>
                </View>
                <IconSymbol 
                  ios_icon_name="chevron.right" 
                  android_material_icon_name="chevron_right" 
                  size={scaleIconSize(18)} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.locationSelector,
                  (!filtrosTemp.comunidad || filtrosTemp.comunidad === 'Todas las Comunidades') && 
                  styles.locationSelectorDisabled
                ]}
                onPress={() => {
                  if (filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades') {
                    setShowProvinciaModal(true);
                  }
                }}
                disabled={!filtrosTemp.comunidad || filtrosTemp.comunidad === 'Todas las Comunidades'}
                activeOpacity={0.7}
              >
                <View style={styles.locationSelectorContent}>
                  <Text style={[styles.locationSelectorLabel, { fontSize: scaleFontSize(11) }]}>
                    PROVINCIA
                  </Text>
                  <Text 
                    style={[styles.locationSelectorValue, { fontSize: scaleFontSize(14) }]} 
                    numberOfLines={1}
                  >
                    {filtrosTemp.provincia || 
                     (filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades' 
                       ? 'Todas' 
                       : 'Selecciona')}
                  </Text>
                </View>
                <IconSymbol 
                  ios_icon_name="chevron.right" 
                  android_material_icon_name="chevron_right" 
                  size={scaleIconSize(18)} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            {/* Radio de búsqueda mejorado */}
            <View style={styles.distanceCard}>
              <View style={styles.distanceCardHeader}>
                <View style={styles.distanceCardHeaderLeft}>
                  <View style={[styles.iconCircleSmall, { backgroundColor: '#10B981' + '20' }]}>
                    <IconSymbol 
                      ios_icon_name="location.circle" 
                      android_material_icon_name="my_location" 
                      size={scaleIconSize(16)} 
                      color="#10B981" 
                    />
                  </View>
                  <Text style={[styles.distanceCardTitle, { fontSize: scaleFontSize(13) }]}>
                    Radio de búsqueda
                  </Text>
                </View>
                <View style={[
                  styles.distanceBadge,
                  isDistanceFilterActive && styles.distanceBadgeActive
                ]}>
                  <Text style={[
                    styles.distanceBadgeText,
                    { fontSize: scaleFontSize(13) },
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
                  
                  <View style={styles.distanceSliderLabels}>
                    <Text style={[styles.distanceSliderLabel, { fontSize: scaleFontSize(11) }]}>
                      1 km
                    </Text>
                    <Text style={[styles.distanceSliderLabel, { fontSize: scaleFontSize(11) }]}>
                      100 km
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.distanceResetButton}
                    onPress={resetDistanceFilter}
                    activeOpacity={0.7}
                  >
                    <IconSymbol 
                      ios_icon_name="arrow.counterclockwise" 
                      android_material_icon_name="refresh" 
                      size={scaleIconSize(14)} 
                      color={colors.textSecondary} 
                    />
                    <Text style={[styles.distanceResetText, { fontSize: scaleFontSize(12) }]}>
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
                  <IconSymbol 
                    ios_icon_name="slider.horizontal.3" 
                    android_material_icon_name="tune" 
                    size={scaleIconSize(18)} 
                    color="#10B981" 
                  />
                  <Text style={[styles.distanceActivateText, { fontSize: scaleFontSize(14) }]}>
                    Activar filtro de distancia
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ✅ SERVICIOS - DISEÑO MEJORADO */}
        {serviciosDisponibles.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#8B5CF6' + '20' }]}>
                  <IconSymbol 
                    ios_icon_name="checkmark.seal.fill" 
                    android_material_icon_name="verified" 
                    size={scaleIconSize(20)} 
                    color="#8B5CF6" 
                  />
                </View>
                <Text style={[styles.cardTitle, { fontSize: scaleFontSize(16) }]}>Servicios</Text>
                <View style={styles.countBadge}>
                  <Text style={[styles.countBadgeText, { fontSize: scaleFontSize(11) }]}>
                    {serviciosDisponibles.length}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.chipsGrid}>
                {serviciosDisponibles.map((servicio) => {
                  const isSelected = filtrosTemp.servicios?.includes(servicio.id);
                  
                  return (
                    <TouchableOpacity
                      key={servicio.id}
                      style={[
                        styles.chipLarge,
                        isSelected && styles.chipLargeActive,
                      ]}
                      onPress={() => handleServicioToggle(servicio.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipLargeIcon, { fontSize: scaleFontSize(18) }]}>
                        {servicio.icon}
                      </Text>
                      <Text 
                        style={[
                          styles.chipLargeText, 
                          { fontSize: scaleFontSize(12) },
                          isSelected && styles.chipLargeTextActive
                        ]}
                      >
                        {servicio.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.chipCheckmark}>
                          <IconSymbol 
                            ios_icon_name="checkmark" 
                            android_material_icon_name="check" 
                            size={scaleIconSize(12)} 
                            color={colors.headerText} 
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ✨ AMBIENTE - DISEÑO MEJORADO */}
        {ambientesDisponibles.length > 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#F59E0B' + '20' }]}>
                  <IconSymbol 
                    ios_icon_name="sparkles" 
                    android_material_icon_name="auto_awesome" 
                    size={scaleIconSize(20)} 
                    color="#F59E0B" 
                  />
                </View>
                <Text style={[styles.cardTitle, { fontSize: scaleFontSize(16) }]}>Ambiente</Text>
                <View style={styles.countBadge}>
                  <Text style={[styles.countBadgeText, { fontSize: scaleFontSize(11) }]}>
                    {ambientesDisponibles.length - 1}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.chipsGrid}>
                {ambientesDisponibles.map((ambiente) => {
                  const isSelected = ambiente.id === 'cualquiera'
                    ? !filtrosTemp.ambiente || filtrosTemp.ambiente.length === 0
                    : filtrosTemp.ambiente?.includes(ambiente.id);
                  
                  return (
                    <TouchableOpacity
                      key={ambiente.id}
                      style={[
                        styles.chipLarge,
                        isSelected && styles.chipLargeActive,
                      ]}
                      onPress={() => handleAmbienteToggle(ambiente.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipLargeIcon, { fontSize: scaleFontSize(18) }]}>
                        {ambiente.icon}
                      </Text>
                      <Text 
                        style={[
                          styles.chipLargeText, 
                          { fontSize: scaleFontSize(12) },
                          isSelected && styles.chipLargeTextActive
                        ]}
                      >
                        {ambiente.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.chipCheckmark}>
                          <IconSymbol 
                            ios_icon_name="checkmark" 
                            android_material_icon_name="check" 
                            size={scaleIconSize(12)} 
                            color={colors.headerText} 
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* 👥 CLIENTELA - DISEÑO MEJORADO */}
        {clientelaDisponible.length > 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#EC4899' + '20' }]}>
                  <IconSymbol 
                    ios_icon_name="person.3.fill" 
                    android_material_icon_name="people" 
                    size={scaleIconSize(20)} 
                    color="#EC4899" 
                  />
                </View>
                <Text style={[styles.cardTitle, { fontSize: scaleFontSize(16) }]}>Clientela Típica</Text>
                <View style={styles.countBadge}>
                  <Text style={[styles.countBadgeText, { fontSize: scaleFontSize(11) }]}>
                    {clientelaDisponible.length - 1}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.chipsGrid}>
                {clientelaDisponible.map((clientela) => {
                  const isSelected = clientela.id === 'cualquiera'
                    ? !filtrosTemp.clientela || filtrosTemp.clientela.length === 0
                    : filtrosTemp.clientela?.includes(clientela.id);
                  
                  return (
                    <TouchableOpacity
                      key={clientela.id}
                      style={[
                        styles.chipLarge,
                        isSelected && styles.chipLargeActive,
                      ]}
                      onPress={() => handleClientelaToggle(clientela.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipLargeIcon, { fontSize: scaleFontSize(18) }]}>
                        {clientela.icon}
                      </Text>
                      <Text 
                        style={[
                          styles.chipLargeText, 
                          { fontSize: scaleFontSize(12) },
                          isSelected && styles.chipLargeTextActive
                        ]}
                      >
                        {clientela.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.chipCheckmark}>
                          <IconSymbol 
                            ios_icon_name="checkmark" 
                            android_material_icon_name="check" 
                            size={scaleIconSize(12)} 
                            color={colors.headerText} 
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ESTADO VACÍO */}
        {(serviciosDisponibles.length === 0 && 
          ambientesDisponibles.length === 1 && 
          clientelaDisponible.length === 1) && 
          !isLoadingOptions && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyStateIcon, { backgroundColor: colors.primary + '15' }]}>
              <IconSymbol 
                ios_icon_name="exclamationmark.triangle" 
                android_material_icon_name="warning" 
                size={scaleIconSize(48)} 
                color={colors.primary} 
              />
            </View>
            <Text style={[styles.emptyStateTitle, { fontSize: scaleFontSize(16) }]}>
              No hay opciones disponibles
            </Text>
            <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(13) }]}>
              Los filtros se generan automáticamente basados en los locales activos
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={refreshDynamicOptions}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="arrow.clockwise" 
                android_material_icon_name="refresh" 
                size={scaleIconSize(18)} 
                color={colors.headerText} 
              />
              <Text style={[styles.emptyStateButtonText, { fontSize: scaleFontSize(14) }]}>
                Recargar opciones
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FOOTER MEJORADO */}
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
            <IconSymbol 
              ios_icon_name="checkmark.circle.fill" 
              android_material_icon_name="check_circle" 
              size={scaleIconSize(22)} 
              color={colors.headerText} 
            />
            <Text style={[styles.applyButtonText, { fontSize: scaleFontSize(16) }]}>
              Aplicar Filtros
            </Text>
            {activeFiltersCount > 0 && (
              <View style={styles.applyButtonBadge}>
                <Text style={[styles.applyButtonBadgeText, { fontSize: scaleFontSize(12) }]}>
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
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(18) }]}>
                Comunidad Autónoma
              </Text>
              <TouchableOpacity 
                onPress={() => setShowComunidadModal(false)}
                style={styles.modalCloseButton}
              >
                <IconSymbol 
                  ios_icon_name="xmark.circle.fill" 
                  android_material_icon_name="cancel" 
                  size={scaleIconSize(28)} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchContainer}>
              <IconSymbol 
                ios_icon_name="magnifyingglass" 
                android_material_icon_name="search" 
                size={scaleIconSize(20)} 
                color={colors.textSecondary} 
              />
              <TextInput
                style={[styles.modalSearchInput, { fontSize: scaleFontSize(15) }]}
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
                    size={scaleIconSize(20)} 
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
                          { fontSize: scaleFontSize(15) },
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
                            size={scaleIconSize(24)} 
                            color={colors.primary} 
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.modalEmpty}>
                  <Text style={[styles.modalEmptyText, { fontSize: scaleFontSize(14) }]}>
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
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(18) }]}>
                Provincia
                {filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades' && (
                  <Text style={[styles.modalSubtitle, { fontSize: scaleFontSize(14) }]}>
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
                  size={scaleIconSize(28)} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchContainer}>
              <IconSymbol 
                ios_icon_name="magnifyingglass" 
                android_material_icon_name="search" 
                size={scaleIconSize(20)} 
                color={colors.textSecondary} 
              />
              <TextInput
                style={[styles.modalSearchInput, { fontSize: scaleFontSize(15) }]}
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
                    size={scaleIconSize(20)} 
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
                          { fontSize: scaleFontSize(15) },
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
                            size={scaleIconSize(24)} 
                            color={colors.primary} 
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.modalEmpty}>
                  <Text style={[styles.modalEmptyText, { fontSize: scaleFontSize(14) }]}>
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
  
  // HEADER MEJORADO
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerTitle: {
    fontWeight: '800',
    color: colors.headerText,
    letterSpacing: 0.5,
  },
  headerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    fontWeight: '800',
    color: colors.headerText,
  },
  clearButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  
  // SCROLL VIEW
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  
  // LOADING CARD
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary + '10',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  loadingText: {
    fontWeight: '600',
    color: colors.primary,
  },
  
  // CARDS MEJORADAS
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  cardContent: {
    padding: 18,
  },
  
  // UBICACIÓN
  locationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  locationSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
  },
  locationSelectorDisabled: {
    opacity: 0.5,
  },
  locationSelectorContent: {
    flex: 1,
  },
  locationSelectorLabel: {
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  locationSelectorValue: {
    fontWeight: '600',
    color: colors.text,
  },
  
  // DISTANCIA MEJORADA
  distanceCard: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 16,
  },
  distanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  distanceCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distanceCardTitle: {
    fontWeight: '600',
    color: colors.text,
  },
  distanceBadge: {
    backgroundColor: colors.cardBorder + '40',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
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
    letterSpacing: 0.5,
  },
  distanceBadgeTextActive: {
    color: '#10B981',
  },
  distanceSlider: {
    width: '100%',
    height: 40,
    marginVertical: 8,
  },
  distanceSliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  distanceSliderLabel: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  distanceResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 10,
  },
  distanceResetText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  distanceActivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10B981' + '15',
    borderWidth: 1.5,
    borderColor: '#10B981' + '40',
    borderRadius: 12,
    paddingVertical: 14,
  },
  distanceActivateText: {
    fontWeight: '700',
    color: '#10B981',
  },
  
  // CHIPS MEJORADOS
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    position: 'relative',
  },
  chipLargeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLargeIcon: {
  },
  chipLargeText: {
    fontWeight: '600',
    color: colors.text,
  },
  chipLargeTextActive: {
    color: colors.headerText,
    fontWeight: '700',
  },
  chipCheckmark: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  
  // FOOTER MEJORADO
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  applyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  applyButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  applyButtonText: {
    fontWeight: '800',
    color: colors.headerText,
    letterSpacing: 0.5,
  },
  applyButtonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  applyButtonBadgeText: {
    fontWeight: '800',
    color: colors.headerText,
  },
  
  // MODALES MEJORADOS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
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
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  modalSearchInput: {
    flex: 1,
    color: colors.text,
    fontWeight: '500',
  },
  modalList: {
    maxHeight: 450,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
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
    marginLeft: 12,
  },
  modalEmpty: {
    padding: 48,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // ESTADO VACÍO MEJORADO
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    fontWeight: '700',
    color: colors.headerText,
  },
});
