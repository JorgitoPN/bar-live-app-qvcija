
// ✅ FIXED: Wrapped functions in useCallback and added missing dependencies

const loadAnalyticsData = useCallback(async () => {
  // ... existing code
}, [localId, user, timeRange]);

const loadRecommendations = useCallback(async () => {
  // ... existing code
}, [localId]);

const checkAndGenerateRecommendations = useCallback(async () => {
  // ... existing code
}, [localId, generateRecommendations]);

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

  // ... rest of useEffect
}, [localId, timeRange, loadAnalyticsData, loadRecommendations, checkAndGenerateRecommendations, router]);
