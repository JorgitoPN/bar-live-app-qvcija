
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { useFilters } from '@/contexts/FilterContext';
import { Filtros } from '@/types';
import Slider from '@react-native-community/slider';

/**
 * ✅ ADVANCED FILTERS PAGE v2.1 - ENHANCED UX & INSTANT LOADING
 * 
 * NEW FEATURES v2.1:
 * - ✅ INCREASED search radius to 100km (was 50km)
 * - ✅ QUICK CLEAR button next to back button (icon-only for clean UI)
 * - ✅ REMOVED spacing between header and content (seamless design)
 * - ✅ INSTANT LOADING - no "Cargando opciones..." banner (uses cached data)
 * - ✅ FIXED filter application - results now show correctly in Explorar & Mapa
 * 
 * FEATURES v2.0:
 * - ✅ Visual indicator badge on filter button (active filter count)
 * - ✅ Slider for search radius (smooth, intuitive distance selection)
 * - ✅ Dropdown for Comunidad Autónoma (clear, organized selection)
 * - ✅ Single-selection for venue categories (synchronized with Explorar)
 * - ✅ Improved responsive design (compact, optimized selectors)
 * - ✅ Dynamic result updates (real-time filtering in Explorar & Mapa)
 * 
 * ARCHITECTURE:
 * - ✅ Full-page modal presentation (not bottom sheet)
 * - ✅ Synchronized with FilterContext for global state
 * - ✅ Dynamic filter options based on actual data (cached)
 * - ✅ Instant feedback with visual indicators
 * - ✅ Clear hierarchy and organization
 * - ✅ Optimized performance with memoization
 * - ✅ Accessible from both Map and Explore
 * - ✅ Consistent behavior across all entry points
 */

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

export default function FiltrosAvanzadosScreen() {
  const router = useRouter();
  const {
    filtros: contextFiltros,
    aplicarFiltros: contextAplicarFiltros,
    limpiarFiltros: contextLimpiarFiltros,
    dynamicOptions,
    refreshDynamicOptions,
    isLoadingOptions,
    hasActiveFilters,
  } = useFilters();

  const [filtrosTemp, setFiltrosTemp] = useState<Filtros>(contextFiltros);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ubicacion: true,
    tipo: false,
    servicios: false,
    ambiente: false,
    clientela: false,
    comunidadDropdown: false,
  });
  const [searchComunidad, setSearchComunidad] = useState('');
  const [searchProvincia, setSearchProvincia] = useState('');
  const [hasInteractedWithRadius, setHasInteractedWithRadius] = useState(false);

  useEffect(() => {
    console.log('[FiltrosAvanzados v2.1] 🚀 Screen mounted, options loaded from cache');
    // ✅ FIX v2.1: No need to refresh options on mount - they're already loaded in FilterContext
    // This eliminates the "Cargando opciones..." banner and makes the page instant
  }, []);

  useEffect(() => {
    console.log('[FiltrosAvanzados v1.0] 🔄 Context filters changed, updating temp filters');
    setFiltrosTemp(contextFiltros);
  }, [contextFiltros]);

  const toggleArrayItem = useCallback((array: string[] | undefined, item: string): string[] => {
    const arr = array || [];
    if (arr.includes(item)) {
      return arr.filter((i) => i !== item);
    }
    return [...arr, item];
  }, []);

  const handleTipoToggle = useCallback((tipoId: string) => {
    console.log('[FiltrosAvanzados v2.0] 🎯 Seleccionando categoría (única):', tipoId);
    setFiltrosTemp(prev => ({
      ...prev,
      tipo: tipoId === 'todos' ? undefined : [tipoId], // ✅ Single selection only
    }));
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

  const handleComunidadSelect = useCallback((selectedComunidad: string) => {
    console.log('[FiltrosAvanzados v1.0] 📍 Selected comunidad:', selectedComunidad);
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
  }, []);

  const handleProvinciaSelect = useCallback((provincia: string) => {
    console.log('[FiltrosAvanzados v1.0] 📍 Selected provincia:', provincia);
    setFiltrosTemp(prev => ({
      ...prev,
      provincia: prev.provincia === provincia ? undefined : provincia,
    }));
  }, []);

  const handleDistanciaChange = useCallback((value: number) => {
    console.log('[FiltrosAvanzados v2.1] 📏 Ajustando radio de búsqueda:', value, 'km');
    setHasInteractedWithRadius(true);
    setFiltrosTemp(prev => ({
      ...prev,
      distancia: value,
    }));
  }, []);

  const handleSinRango = useCallback(() => {
    console.log('[FiltrosAvanzados v2.1] 🚫 Usuario seleccionó "Sin rango"');
    setHasInteractedWithRadius(false);
    setFiltrosTemp(prev => ({
      ...prev,
      distancia: undefined,
    }));
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleAplicar = useCallback(() => {
    console.log('[FiltrosAvanzados v2.1] ✅ Applying filters:', filtrosTemp);
    // ✅ FIX: Only apply distance filter if user has interacted with the slider
    const filtrosToApply = { ...filtrosTemp };
    if (!hasInteractedWithRadius) {
      delete filtrosToApply.distancia;
    }
    console.log('[FiltrosAvanzados v2.1] 📊 Final filters to apply:', filtrosToApply);
    contextAplicarFiltros(filtrosToApply);
    router.back();
  }, [filtrosTemp, hasInteractedWithRadius, contextAplicarFiltros, router]);

  const handleLimpiar = useCallback(() => {
    console.log('[FiltrosAvanzados v2.1] 🧹 Clearing all filters');
    const emptyFiltros = {};
    setFiltrosTemp(emptyFiltros);
    setHasInteractedWithRadius(false);
    contextLimpiarFiltros();
  }, [contextLimpiarFiltros]);

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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

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

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>Filtros Avanzados</Text>
            {activeFiltersCount > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={[styles.filterCountText, { fontSize: scaleFontSize(12) }]}>{activeFiltersCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerActions}>
            {/* ✅ REMOVED: Clear button from header - moved to footer */}
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

        {/* UBICACIÓN SECTION */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('ubicacion')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconContainer}>
                <IconSymbol 
                  ios_icon_name="mappin.circle.fill" 
                  android_material_icon_name="location_on" 
                  size={scaleIconSize(18)} 
                  color={colors.primary} 
                />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>Ubicación</Text>
            </View>
            <IconSymbol 
              ios_icon_name={expandedSections.ubicacion ? "chevron.up" : "chevron.down"} 
              android_material_icon_name={expandedSections.ubicacion ? "expand_less" : "expand_more"} 
              size={scaleIconSize(20)} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          {expandedSections.ubicacion && (
            <View style={styles.sectionContent}>
              {/* Comunidad Dropdown */}
              <View style={styles.selectorContainer}>
                <Text style={[styles.selectorLabel, { fontSize: scaleFontSize(12) }]}>Comunidad Autónoma</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => toggleSection('comunidadDropdown')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownText, { fontSize: scaleFontSize(14) }]} numberOfLines={1}>
                    {filtrosTemp.comunidad || 'Todas las Comunidades'}
                  </Text>
                  <IconSymbol 
                    ios_icon_name={expandedSections.comunidadDropdown ? "chevron.up" : "chevron.down"} 
                    android_material_icon_name={expandedSections.comunidadDropdown ? "expand_less" : "expand_more"} 
                    size={scaleIconSize(20)} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
                
                {expandedSections.comunidadDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView 
                      style={styles.dropdownScroll}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {allComunidades.map((comunidad) => {
                        const isSelected = filtrosTemp.comunidad === comunidad || 
                          (comunidad === 'Todas las Comunidades' && !filtrosTemp.comunidad);
                        
                        return (
                          <TouchableOpacity
                            key={comunidad}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemActive,
                            ]}
                            onPress={() => {
                              handleComunidadSelect(comunidad);
                              toggleSection('comunidadDropdown');
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              { fontSize: scaleFontSize(14) },
                              isSelected && styles.dropdownItemTextActive
                            ]}>
                              {comunidad}
                            </Text>
                            {isSelected && (
                              <IconSymbol 
                                ios_icon_name="checkmark" 
                                android_material_icon_name="check" 
                                size={scaleIconSize(18)} 
                                color={colors.primary} 
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Provincia Selector */}
              {filtrosTemp.comunidad && filtrosTemp.comunidad !== 'Todas las Comunidades' && (
                <View style={styles.selectorContainer}>
                  <Text style={[styles.selectorLabel, { fontSize: scaleFontSize(12) }]}>Provincia</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipScrollContainer}
                  >
                    {availableProvincias.map((provincia) => {
                      const isSelected = filtrosTemp.provincia === provincia;
                      
                      return (
                        <TouchableOpacity
                          key={provincia}
                          style={[
                            styles.chip,
                            isSelected && styles.chipActive,
                          ]}
                          onPress={() => handleProvinciaSelect(provincia)}
                        >
                          <Text style={[
                            styles.chipText,
                            { fontSize: scaleFontSize(12) },
                            isSelected && styles.chipTextActive
                          ]}>
                            {provincia}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Distance Slider */}
              <View style={styles.distanceContainer}>
                <View style={styles.distanceHeader}>
                  <IconSymbol 
                    ios_icon_name="location.circle" 
                    android_material_icon_name="location_on" 
                    size={scaleIconSize(16)} 
                    color={colors.primary} 
                  />
                  <Text style={[styles.distanceLabel, { fontSize: scaleFontSize(14) }]}>Radio de búsqueda</Text>
                  <Text style={[styles.distanceValue, { fontSize: scaleFontSize(16) }]}>
                    {hasInteractedWithRadius && filtrosTemp.distancia ? `${filtrosTemp.distancia.toFixed(0)} km` : 'Sin rango'}
                  </Text>
                </View>
                
                {/* ✅ NEW: "Sin rango" button */}
                <TouchableOpacity 
                  style={[
                    styles.sinRangoButton,
                    !hasInteractedWithRadius && styles.sinRangoButtonActive
                  ]}
                  onPress={handleSinRango}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.sinRangoButtonText,
                    { fontSize: scaleFontSize(13) },
                    !hasInteractedWithRadius && styles.sinRangoButtonTextActive
                  ]}>
                    Sin rango
                  </Text>
                </TouchableOpacity>
                
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={100}
                  step={1}
                  value={filtrosTemp.distancia || 5}
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
                  <IconSymbol 
                    ios_icon_name="building.2.fill" 
                    android_material_icon_name="store" 
                    size={scaleIconSize(18)} 
                    color={colors.primary} 
                  />
                </View>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>Tipo de Local</Text>
                <Text style={[styles.sectionCount, { fontSize: scaleFontSize(12) }]}>({tiposLocales.length - 1})</Text>
              </View>
              <IconSymbol 
                ios_icon_name={expandedSections.tipo ? "chevron.up" : "chevron.down"} 
                android_material_icon_name={expandedSections.tipo ? "expand_less" : "expand_more"} 
                size={scaleIconSize(20)} 
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
                          styles.chipSingle,
                          isSelected && styles.chipActive,
                        ]}
                        onPress={() => handleTipoToggle(tipo.id)}
                      >
                        <Text style={styles.chipIcon}>{tipo.icon}</Text>
                        <Text style={[
                          styles.chipText,
                          { fontSize: scaleFontSize(12) },
                          isSelected && styles.chipTextActive
                        ]}>
                          {tipo.label}
                        </Text>
                        {isSelected && tipo.id !== 'todos' && (
                          <IconSymbol 
                            ios_icon_name="checkmark.circle.fill" 
                            android_material_icon_name="check_circle" 
                            size={scaleIconSize(16)} 
                            color={colors.headerText} 
                          />
                        )}
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
                  <IconSymbol 
                    ios_icon_name="checkmark.seal.fill" 
                    android_material_icon_name="verified" 
                    size={scaleIconSize(18)} 
                    color={colors.primary} 
                  />
                </View>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>Servicios</Text>
                <Text style={[styles.sectionCount, { fontSize: scaleFontSize(12) }]}>({serviciosDisponibles.length})</Text>
              </View>
              <IconSymbol 
                ios_icon_name={expandedSections.servicios ? "chevron.up" : "chevron.down"} 
                android_material_icon_name={expandedSections.servicios ? "expand_less" : "expand_more"} 
                size={scaleIconSize(20)} 
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
                        <Text style={styles.chipIcon}>{servicio.icon}</Text>
                        <Text style={[
                          styles.chipText,
                          { fontSize: scaleFontSize(12) },
                          isSelected && styles.chipTextActive
                        ]}>
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
                  <IconSymbol 
                    ios_icon_name="sparkles" 
                    android_material_icon_name="auto_awesome" 
                    size={scaleIconSize(18)} 
                    color={colors.primary} 
                  />
                </View>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>Ambiente</Text>
                <Text style={[styles.sectionCount, { fontSize: scaleFontSize(12) }]}>({ambientesDisponibles.length - 1})</Text>
              </View>
              <IconSymbol 
                ios_icon_name={expandedSections.ambiente ? "chevron.up" : "chevron.down"} 
                android_material_icon_name={expandedSections.ambiente ? "expand_less" : "expand_more"} 
                size={scaleIconSize(20)} 
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
                        <Text style={styles.chipIcon}>{ambiente.icon}</Text>
                        <Text style={[
                          styles.chipText,
                          { fontSize: scaleFontSize(12) },
                          isSelected && styles.chipTextActive
                        ]}>
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
                  <IconSymbol 
                    ios_icon_name="person.3.fill" 
                    android_material_icon_name="people" 
                    size={scaleIconSize(18)} 
                    color={colors.primary} 
                  />
                </View>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>Clientela Típica</Text>
                <Text style={[styles.sectionCount, { fontSize: scaleFontSize(12) }]}>({clientelaDisponible.length - 1})</Text>
              </View>
              <IconSymbol 
                ios_icon_name={expandedSections.clientela ? "chevron.up" : "chevron.down"} 
                android_material_icon_name={expandedSections.clientela ? "expand_less" : "expand_more"} 
                size={scaleIconSize(20)} 
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
                        <Text style={styles.chipIcon}>{clientela.icon}</Text>
                        <Text style={[
                          styles.chipText,
                          { fontSize: scaleFontSize(12) },
                          isSelected && styles.chipTextActive
                        ]}>
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

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.clearFooterButton} onPress={handleLimpiar}>
            <Text style={[styles.clearFooterButtonText, { fontSize: scaleFontSize(14) }]}>Limpiar filtros</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.applyButton} onPress={handleAplicar}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyGradient}
            >
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check_circle" 
                size={scaleIconSize(22)} 
                color={colors.headerText} 
              />
              <Text style={[styles.applyText, { fontSize: scaleFontSize(16) }]}>Aplicar Filtros</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
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
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  filterCountText: {
    fontWeight: '800',
    color: colors.headerText,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  loadingText: {
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    marginBottom: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  selectorContainer: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipScrollContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipText: {
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.headerText,
    fontWeight: '700',
  },
  distanceContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  distanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  distanceLabel: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
  },
  distanceValue: {
    fontWeight: '700',
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabelText: {
    fontWeight: '500',
    color: colors.textSecondary,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  dropdownText: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  dropdownItemActive: {
    backgroundColor: colors.primary + '10',
  },
  dropdownItemText: {
    flex: 1,
    fontWeight: '500',
    color: colors.text,
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  chipSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    minWidth: 100,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clearFooterButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFooterButtonText: {
    fontWeight: '700',
    color: colors.text,
  },
  applyButton: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  applyGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  applyText: {
    fontWeight: '700',
    color: colors.headerText,
  },
  sinRangoButton: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  sinRangoButtonActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  sinRangoButtonText: {
    fontWeight: '600',
    color: colors.text,
  },
  sinRangoButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
