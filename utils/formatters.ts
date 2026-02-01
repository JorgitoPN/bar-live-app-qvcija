
export const formatearFecha = (fecha: string): string => {
  const date = new Date(fecha);
  const ahora = new Date();
  const diff = ahora.getTime() - date.getTime();
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos}m`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 7) return `Hace ${dias}d`;
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export const formatearNumero = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatearPrecio = (precio: number): string => {
  return `${precio.toFixed(2)}€`;
};

export const formatearDistancia = (distancia: number): string => {
  if (distancia < 1) {
    return `${Math.round(distancia * 1000)}m`;
  }
  return `${distancia.toFixed(1)}km`;
};

export const formatearHora = (fecha: string): string => {
  const date = new Date(fecha);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export const formatearFechaCompleta = (fecha: string): string => {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const calcularDiasRestantes = (fecha: string): number => {
  const hoy = new Date();
  const fechaEvento = new Date(fecha);
  const diff = fechaEvento.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const calcularPorcentaje = (valor: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((valor / total) * 100);
};

/**
 * ✅ NEW v310.0: Instagram-style follower count formatter
 * 
 * Formats follower counts like Instagram:
 * - Less than 1,000: Shows full number (e.g., "523")
 * - 1,000 to 999,999: Shows in thousands with "k" (e.g., "1.2k", "5k")
 * - 1,000,000 or more: Shows in millions with "M" (e.g., "2.3M")
 * 
 * Rounds down like Instagram (Math.floor)
 * 
 * @param count - The follower count to format
 * @returns Formatted string ready for display
 */
export const formatFollowersCount = (count: number): string => {
  if (count < 1000) {
    return count.toString();
  } else if (count < 1_000_000) {
    const kCount = Math.floor(count / 100) / 10;
    return kCount % 1 === 0 ? `${Math.floor(kCount)}k` : `${kCount}k`;
  } else {
    const mCount = Math.floor(count / 100_000) / 10;
    return mCount % 1 === 0 ? `${Math.floor(mCount)}M` : `${mCount}M`;
  }
};
