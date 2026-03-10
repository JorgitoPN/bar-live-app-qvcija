
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

/**
 * ✅ NEW v311.0: Instagram DM-style timestamp formatter
 * 
 * Formats timestamps for conversation lists following Instagram DM style:
 * - Less than 1 hour: "5 min", "12 min"
 * - Less than 24 hours: "2 h", "8 h"
 * - Yesterday: "Ayer"
 * - Less than a week: "3 d", "5 d"
 * - Older: "12 Feb" (short date format)
 * 
 * @param timestamp - ISO 8601 timestamp string or Date object
 * @returns Formatted time string (e.g., "5 min", "2 h", "Ayer", "3 d", "12 Feb")
 */
export const formatLastMessageTime = (timestamp: string | Date): string => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    
    // Calculate time differences
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Less than 1 hour: show minutes
    if (diffMinutes < 60) {
      if (diffMinutes < 1) return 'Ahora';
      return `${diffMinutes} min`;
    }
    
    // Less than 24 hours: show hours
    if (diffHours < 24) {
      return `${diffHours} h`;
    }
    
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Ayer';
    }
    
    // Less than a week: show days
    if (diffDays < 7) {
      return `${diffDays} d`;
    }
    
    // Older than a week: show short date
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    
    // If it's from this year, just show day and month
    if (date.getFullYear() === now.getFullYear()) {
      return `${day} ${month}`;
    }
    
    // If it's from a previous year, include the year
    return `${day} ${month} ${date.getFullYear()}`;
  } catch (error) {
    console.error('[formatLastMessageTime] Error formatting timestamp:', error);
    return '';
  }
};
