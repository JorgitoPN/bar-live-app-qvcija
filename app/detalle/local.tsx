
// ✅ FIXED: Added missing dependency 'cargarReviewsBarlive' to useCallback
const cargarLocal = useCallback(async () => {
  try {
    const cachedData = localPreloader.getCached(params.id as string);
    if (cachedData) {
      console.log('[DetalleLocal] Using cached data - INSTANT LOAD');
      setLocal(cachedData);
      cargarReviewsBarlive();
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('locales')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('[DetalleLocal] Error loading local:', error);
      return;
    }

    console.log('[DetalleLocal] Loaded local from Supabase:', data);
    setLocal(data);
    setLoading(false);
  } catch (error) {
    console.error('[DetalleLocal] Error:', error);
    setLoading(false);
  }
}, [params.id, cargarReviewsBarlive]);
