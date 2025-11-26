
// ... (keep imports and interfaces)

export default function PanelAnalisisScreen() {
  // ... (keep all state and hooks)

  // ✅ FIXED: Wrapped functions in useCallback
  const loadAnalyticsData = useCallback(async () => {
    if (!localId || !user) return;

    try {
      setLoading(true);
      console.log('[PanelAnalisis] Loading analytics for local:', localId);

      // ... (keep all loading logic)
    } catch (error: any) {
      console.error('[PanelAnalisis] Error loading analytics:', error);
      Alert.alert('Error', error.message || 'No se pudieron cargar las analíticas');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [localId, user, timeRange, router]);

  const loadRecommendations = useCallback(async () => {
    if (!localId) return;

    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('local_id', localId)
        .eq('estado', 'activa')
        .order('prioridad', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PanelAnalisis] Error loading recommendations:', error);
        return;
      }

      setRecommendations(data || []);
    } catch (error) {
      console.error('[PanelAnalisis] Error:', error);
    }
  }, [localId]);

  const checkAndGenerateRecommendations = useCallback(async () => {
    if (!localId) return;

    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('id')
        .eq('local_id', localId)
        .eq('estado', 'activa')
        .limit(1);

      if (error) {
        console.error('[PanelAnalisis] Error checking recommendations:', error);
        return;
      }

      // If no recommendations exist, generate them automatically
      if (!data || data.length === 0) {
        console.log('[PanelAnalisis] 🤖 No recommendations found, auto-generating...');
        await generateRecommendations();
      }
    } catch (error) {
      console.error('[PanelAnalisis] Error checking recommendations:', error);
    }
  }, [localId]);

  // ✅ FIXED: Added dependencies to useEffect
  useEffect(() => {
    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      router.back();
      return;
    }

    console.log('[PanelAnalisis] 🔄 Auto-loading analytics and recommendations on page access');
    loadAnalyticsData();
    loadRecommendations();
    checkAndGenerateRecommendations();

    // ... (keep rest of useEffect)
  }, [localId, timeRange, loadAnalyticsData, loadRecommendations, checkAndGenerateRecommendations, router]);

  // ... (keep rest of the component)
}
