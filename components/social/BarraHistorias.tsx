
// ... (keep imports and interfaces)

// ✅ FIXED: Extracted complex expression to separate variable and added historias to dependency array
const BarraHistorias = memo(function BarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
}: BarraHistoriasProps) {
  // ✅ Extract complex expressions
  const historiasLength = historias.length;
  const firstHistoriaId = historias[0]?.id;
  
  // ✅ Memoize historias to prevent unnecessary re-renders
  const memoizedHistorias = useMemo(() => historias, [historias, historiasLength, firstHistoriaId]);
  
  // ... (keep rest of the component)
}, (prevProps, nextProps) => {
  // ✅ Custom comparison for better memoization
  return (
    prevProps.historias.length === nextProps.historias.length &&
    prevProps.historias[0]?.id === nextProps.historias[0]?.id &&
    prevProps.historias[0]?.visto_por_usuario === nextProps.historias[0]?.visto_por_usuario
  );
});

export default BarraHistorias;
