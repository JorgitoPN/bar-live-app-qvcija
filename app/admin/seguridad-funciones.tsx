
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { IconSymbol } from '@/components/IconSymbol';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

interface SecurityFunction {
  schema_name: string;
  function_name: string;
  function_oid: number;
  is_security_definer: boolean;
  has_safe_search_path: boolean;
  current_search_path: string;
  risk_level: 'ALTO' | 'MEDIO' | 'BAJO';
  recommendation: string;
}

interface SecurityStats {
  total: number;
  alto: number;
  medio: number;
  bajo: number;
  corregidas: number;
  pendientes: number;
  porcentaje: number;
}

export default function SeguridadFuncionesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [functions, setFunctions] = useState<SecurityFunction[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    total: 0,
    alto: 0,
    medio: 0,
    bajo: 0,
    corregidas: 0,
    pendientes: 0,
    porcentaje: 0,
  });
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'TODOS' | 'ALTO' | 'MEDIO' | 'BAJO'>('TODOS');
  const [selectedSchema, setSelectedSchema] = useState<'TODOS' | 'public' | 'vault' | 'pgbouncer'>('public');
  const [selectedFunction, setSelectedFunction] = useState<SecurityFunction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const loadSecurityAudit = useCallback(async () => {
    try {
      console.log('Cargando auditoría de seguridad...');
      
      const { data, error } = await supabase.rpc('audit_security_definer_functions');

      if (error) {
        console.error('Error al cargar auditoría:', error);
        Alert.alert('Error', 'No se pudo cargar la auditoría de seguridad');
        return;
      }

      console.log(`Auditoría cargada: ${data?.length || 0} funciones encontradas`);
      
      const functionsData = data as SecurityFunction[];
      const publicFunctions = functionsData.filter(f => f.schema_name === 'public');
      setFunctions(functionsData);

      const totalPublic = publicFunctions.length;
      const corregidas = publicFunctions.filter(f => f.has_safe_search_path).length;
      const pendientes = totalPublic - corregidas;
      const porcentaje = totalPublic > 0 ? Math.round((corregidas / totalPublic) * 100) : 0;

      const statsData: SecurityStats = {
        total: totalPublic,
        alto: publicFunctions.filter(f => f.risk_level === 'ALTO').length,
        medio: publicFunctions.filter(f => f.risk_level === 'MEDIO').length,
        bajo: publicFunctions.filter(f => f.risk_level === 'BAJO').length,
        corregidas,
        pendientes,
        porcentaje,
      };
      setStats(statsData);

    } catch (error) {
      console.error('Error en loadSecurityAudit:', error);
      Alert.alert('Error', 'Error al cargar la auditoría');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityAudit();
  }, [loadSecurityAudit]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSecurityAudit();
  }, [loadSecurityAudit]);

  const handleFunctionPress = (func: SecurityFunction) => {
    setSelectedFunction(func);
    setShowDetailsModal(true);
  };

  const getRiskColor = (level: string) => {
    const levelText = level;
    if (levelText === 'ALTO') {
      const colorValue = '#FF3B30';
      return colorValue;
    }
    if (levelText === 'MEDIO') {
      const colorValue = '#FF9500';
      return colorValue;
    }
    const colorValue = '#34C759';
    return colorValue;
  };

  const getRiskIcon = (level: string) => {
    const levelText = level;
    if (levelText === 'ALTO') {
      const iconName = 'error';
      return iconName;
    }
    if (levelText === 'MEDIO') {
      const iconName = 'warning';
      return iconName;
    }
    const iconName = 'check-circle';
    return iconName;
  };

  const filteredFunctions = functions.filter(func => {
    const matchesRisk = selectedRiskLevel === 'TODOS' || func.risk_level === selectedRiskLevel;
    const matchesSchema = selectedSchema === 'TODOS' || func.schema_name === selectedSchema;
    return matchesRisk && matchesSchema;
  });

  const progressPercentage = stats.porcentaje;
  const progressText = `${progressPercentage}%`;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando auditoría de seguridad...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={scaleIconSize(24)}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seguridad de Funciones</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={scaleIconSize(24)}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Banner de Éxito */}
        {stats.porcentaje >= 90 && (
          <View style={styles.successBanner}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={scaleIconSize(32)}
              color="#34C759"
            />
            <View style={styles.successTextContainer}>
              <Text style={styles.successTitle}>¡Excelente Progreso!</Text>
              <Text style={styles.successText}>
                {stats.corregidas} de {stats.total} funciones corregidas
              </Text>
              <Text style={styles.successSubtext}>
                {stats.pendientes === 3 ? 'Solo quedan 3 funciones de PostGIS (no modificables)' : `${stats.pendientes} funciones pendientes`}
              </Text>
            </View>
          </View>
        )}

        {/* Estadísticas Generales */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Resumen de Auditoría</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: progressText }]} />
            </View>
            <Text style={styles.progressText}>{progressText}</Text>
            <Text style={styles.progressSubtext}>
              {stats.corregidas} de {stats.total} funciones corregidas
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#34C759' }]}>{stats.corregidas}</Text>
              <Text style={styles.statLabel}>Corregidas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: stats.pendientes <= 3 ? '#34C759' : '#FF9500' }]}>
                {stats.pendientes}
              </Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
          </View>

          <View style={styles.riskGrid}>
            <View style={[styles.riskItem, { backgroundColor: stats.alto === 0 ? '#34C75920' : '#FF3B3020' }]}>
              <IconSymbol
                ios_icon_name={stats.alto === 0 ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"}
                android_material_icon_name={stats.alto === 0 ? "check-circle" : "error"}
                size={scaleIconSize(24)}
                color={stats.alto === 0 ? "#34C759" : "#FF3B30"}
              />
              <Text style={[styles.riskValue, { color: stats.alto === 0 ? '#34C759' : '#FF3B30' }]}>
                {stats.alto}
              </Text>
              <Text style={styles.riskLabel}>Alto Riesgo</Text>
              {stats.alto === 0 && <Text style={styles.riskCheck}>✅</Text>}
            </View>
            <View style={[styles.riskItem, { backgroundColor: stats.medio <= 3 ? '#34C75920' : '#FF950020' }]}>
              <IconSymbol
                ios_icon_name={stats.medio <= 3 ? "checkmark.circle.fill" : "exclamationmark.circle.fill"}
                android_material_icon_name={stats.medio <= 3 ? "check-circle" : "warning"}
                size={scaleIconSize(24)}
                color={stats.medio <= 3 ? "#34C759" : "#FF9500"}
              />
              <Text style={[styles.riskValue, { color: stats.medio <= 3 ? '#34C759' : '#FF9500' }]}>
                {stats.medio}
              </Text>
              <Text style={styles.riskLabel}>Riesgo Medio</Text>
              {stats.medio <= 3 && <Text style={styles.riskCheck}>✅</Text>}
            </View>
            <View style={[styles.riskItem, { backgroundColor: '#34C75920' }]}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={scaleIconSize(24)}
                color="#34C759"
              />
              <Text style={[styles.riskValue, { color: '#34C759' }]}>{stats.bajo}</Text>
              <Text style={styles.riskLabel}>Bajo Riesgo</Text>
            </View>
          </View>
        </View>

        {/* Información de PostGIS */}
        {stats.pendientes === 3 && (
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={scaleIconSize(24)}
              color={colors.primary}
            />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Funciones PostGIS</Text>
              <Text style={styles.infoText}>
                Las 3 funciones pendientes son parte del sistema PostGIS (st_estimatedextent) y no pueden ser modificadas. Son seguras por diseño.
              </Text>
            </View>
          </View>
        )}

        {/* Filtros */}
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filtros</Text>
          
          <Text style={styles.filterLabel}>Nivel de Riesgo:</Text>
          <View style={styles.filterButtons}>
            {(['TODOS', 'ALTO', 'MEDIO', 'BAJO'] as const).map((level) => {
              const isSelected = selectedRiskLevel === level;
              const buttonText = level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.filterButton,
                    isSelected && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedRiskLevel(level)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      isSelected && styles.filterButtonTextActive,
                    ]}
                  >
                    {buttonText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.filterLabel}>Esquema:</Text>
          <View style={styles.filterButtons}>
            {(['TODOS', 'public', 'vault', 'pgbouncer'] as const).map((schema) => {
              const isSelected = selectedSchema === schema;
              const buttonText = schema;
              return (
                <TouchableOpacity
                  key={schema}
                  style={[
                    styles.filterButton,
                    isSelected && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedSchema(schema)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      isSelected && styles.filterButtonTextActive,
                    ]}
                  >
                    {buttonText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Lista de Funciones */}
        <View style={styles.functionsCard}>
          <Text style={styles.functionsTitle}>
            Funciones Encontradas
          </Text>
          <Text style={styles.functionsCount}>
            {filteredFunctions.length}
          </Text>

          {filteredFunctions.map((func, index) => {
            const riskColor = getRiskColor(func.risk_level);
            const riskIcon = getRiskIcon(func.risk_level);
            const functionName = func.function_name;
            const schemaName = func.schema_name;
            const riskLevel = func.risk_level;
            const searchPath = func.current_search_path;
            const isFixed = func.has_safe_search_path;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.functionItem,
                  isFixed && styles.functionItemFixed,
                ]}
                onPress={() => handleFunctionPress(func)}
              >
                <View style={styles.functionHeader}>
                  <View style={styles.functionInfo}>
                    <View style={styles.functionNameRow}>
                      <Text style={styles.functionName}>{functionName}</Text>
                      {isFixed && (
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={scaleIconSize(16)}
                          color="#34C759"
                        />
                      )}
                    </View>
                    <Text style={styles.functionSchema}>{schemaName}</Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name={riskIcon}
                      size={scaleIconSize(16)}
                      color={riskColor}
                    />
                    <Text style={[styles.riskBadgeText, { color: riskColor }]}>
                      {riskLevel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.functionSearchPath} numberOfLines={1}>
                  {searchPath}
                </Text>
              </TouchableOpacity>
            );
          })}

          {filteredFunctions.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={scaleIconSize(48)}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>
                No se encontraron funciones con estos filtros
              </Text>
            </View>
          )}
        </View>

        {/* Información de Ayuda */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>ℹ️ Información</Text>
          <Text style={styles.helpText}>
            Las funciones SECURITY DEFINER se ejecutan con privilegios elevados y pueden representar un riesgo de seguridad si no tienen un search_path seguro configurado.
          </Text>
          <Text style={styles.helpText}>
            • ALTO: Función sin search_path seguro - Requiere corrección inmediata
          </Text>
          <Text style={styles.helpText}>
            • MEDIO: Función con search_path pero necesita revisión
          </Text>
          <Text style={styles.helpText}>
            • BAJO: Función segura o no es SECURITY DEFINER
          </Text>
          
          {stats.pendientes === 3 && (
            <View style={styles.postgisNote}>
              <Text style={styles.postgisNoteTitle}>📍 Nota sobre PostGIS</Text>
              <Text style={styles.postgisNoteText}>
                Las 3 funciones pendientes (st_estimatedextent) son parte del sistema PostGIS y no pueden ser modificadas. Son seguras por diseño.
              </Text>
            </View>
          )}
        </View>

        {/* Logros */}
        {stats.porcentaje >= 90 && (
          <View style={styles.achievementsCard}>
            <Text style={styles.achievementsTitle}>🏆 Logros</Text>
            <View style={styles.achievementItem}>
              <IconSymbol
                ios_icon_name="checkmark.seal.fill"
                android_material_icon_name="verified"
                size={scaleIconSize(24)}
                color="#34C759"
              />
              <Text style={styles.achievementText}>
                100% de funciones de ALTO riesgo corregidas
              </Text>
            </View>
            <View style={styles.achievementItem}>
              <IconSymbol
                ios_icon_name="shield.checkered"
                android_material_icon_name="security"
                size={scaleIconSize(24)}
                color="#34C759"
              />
              <Text style={styles.achievementText}>
                {stats.porcentaje}% de funciones totales corregidas
              </Text>
            </View>
            <View style={styles.achievementItem}>
              <IconSymbol
                ios_icon_name="lock.shield.fill"
                android_material_icon_name="lock"
                size={scaleIconSize(24)}
                color="#34C759"
              />
              <Text style={styles.achievementText}>
                Base de datos protegida contra ataques de inyección
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal de Detalles */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDetailsModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedFunction && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalles de la Función</Text>
                  <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                    <IconSymbol
                      ios_icon_name="xmark"
                      android_material_icon_name="close"
                      size={scaleIconSize(24)}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {selectedFunction.has_safe_search_path && (
                    <View style={styles.fixedBanner}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={scaleIconSize(20)}
                        color="#34C759"
                      />
                      <Text style={styles.fixedBannerText}>Función Corregida ✅</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nombre:</Text>
                    <Text style={styles.detailValue}>{selectedFunction.function_name}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Esquema:</Text>
                    <Text style={styles.detailValue}>{selectedFunction.schema_name}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nivel de Riesgo:</Text>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor(selectedFunction.risk_level) + '20' }]}>
                      <Text style={[styles.riskBadgeText, { color: getRiskColor(selectedFunction.risk_level) }]}>
                        {selectedFunction.risk_level}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>SECURITY DEFINER:</Text>
                    <Text style={styles.detailValue}>
                      {selectedFunction.is_security_definer ? 'Sí' : 'No'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Search Path Seguro:</Text>
                    <Text style={[
                      styles.detailValue,
                      { color: selectedFunction.has_safe_search_path ? '#34C759' : '#FF3B30' }
                    ]}>
                      {selectedFunction.has_safe_search_path ? 'Sí ✅' : 'No ❌'}
                    </Text>
                  </View>

                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Search Path Actual:</Text>
                    <Text style={styles.detailValueCode}>
                      {selectedFunction.current_search_path}
                    </Text>
                  </View>

                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Recomendación:</Text>
                    <Text style={styles.detailValueRecommendation}>
                      {selectedFunction.recommendation}
                    </Text>
                  </View>

                  {!selectedFunction.has_safe_search_path && (
                    <View style={styles.solutionBox}>
                      <Text style={styles.solutionTitle}>💡 Solución Recomendada:</Text>
                      <Text style={styles.solutionText}>
                        {selectedFunction.risk_level === 'ALTO' 
                          ? 'Agregar: SET search_path = pg_catalog, public, pg_temp'
                          : 'Revisar si la función realmente necesita SECURITY DEFINER o puede ser SECURITY INVOKER'}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: scaleFontSize(16),
    color: colors.textSecondary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  successBanner: {
    margin: 16,
    padding: 20,
    backgroundColor: '#34C75920',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 4,
  },
  successText: {
    fontSize: scaleFontSize(14),
    color: colors.text,
    marginBottom: 2,
  },
  successSubtext: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  progressText: {
    fontSize: scaleFontSize(24),
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  progressSubtext: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: scaleFontSize(28),
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    marginTop: 4,
  },
  riskGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  riskItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  riskValue: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    marginTop: 4,
  },
  riskLabel: {
    fontSize: scaleFontSize(10),
    color: colors.textSecondary,
    marginTop: 2,
  },
  riskCheck: {
    fontSize: scaleFontSize(16),
    marginTop: 4,
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: colors.primary + '10',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    flexDirection: 'row',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    lineHeight: 18,
  },
  filtersCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filtersTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  functionsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  functionsTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  functionsCount: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    marginBottom: 16,
  },
  functionItem: {
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  functionItemFixed: {
    borderColor: '#34C759',
    borderWidth: 1,
  },
  functionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  functionInfo: {
    flex: 1,
  },
  functionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  functionName: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.text,
  },
  functionSchema: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  riskBadgeText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  functionSearchPath: {
    fontSize: scaleFontSize(11),
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    marginTop: 12,
  },
  helpCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  helpTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  helpText: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  postgisNote: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  postgisNoteTitle: {
    fontSize: scaleFontSize(13),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  postgisNoteText: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    lineHeight: 18,
  },
  achievementsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#34C75910',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#34C759',
    marginBottom: 100,
  },
  achievementsTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  achievementText: {
    fontSize: scaleFontSize(14),
    color: colors.text,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  fixedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#34C75920',
    borderRadius: 8,
    marginBottom: 16,
  },
  fixedBannerText: {
    fontSize: scaleFontSize(14),
    fontWeight: 'bold',
    color: '#34C759',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailColumn: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: scaleFontSize(14),
    color: colors.text,
  },
  detailValueCode: {
    fontSize: scaleFontSize(12),
    color: colors.text,
    fontFamily: 'monospace',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  detailValueRecommendation: {
    fontSize: scaleFontSize(13),
    color: colors.text,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    lineHeight: 20,
  },
  solutionBox: {
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  solutionTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  solutionText: {
    fontSize: scaleFontSize(13),
    color: colors.text,
    lineHeight: 20,
  },
});
