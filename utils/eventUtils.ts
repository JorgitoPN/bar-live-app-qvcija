
/**
 * Utility functions for event management
 */

export interface EventStatus {
  isLive: boolean;
  isUpcoming: boolean;
  isExpired: boolean;
  timeRemaining: string;
  statusText: string;
}

/**
 * Get the current status of an event
 */
export function getEventStatus(
  fecha: string,
  hora: string,
  fecha_fin?: string | null,
  hora_fin?: string | null
): EventStatus {
  const now = new Date();
  
  // Parse event start date/time
  const eventStartDate = new Date(`${fecha}T${hora}`);
  
  // Parse event end date/time
  let eventEndDate: Date;
  if (fecha_fin && hora_fin) {
    eventEndDate = new Date(`${fecha_fin}T${hora_fin}`);
  } else {
    // If no end date, assume event ends 4 hours after start
    eventEndDate = new Date(eventStartDate.getTime() + 4 * 60 * 60 * 1000);
  }
  
  // Determine status
  const isLive = now >= eventStartDate && now <= eventEndDate;
  const isUpcoming = now < eventStartDate;
  const isExpired = now > eventEndDate;
  
  let timeRemaining = '';
  let statusText = '';
  
  if (isLive) {
    // Calculate time until event ends
    const diff = eventEndDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      timeRemaining = `${hours}h ${minutes}m`;
      statusText = `Finaliza en ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      timeRemaining = `${minutes}m`;
      statusText = `Finaliza en ${minutes}m`;
    } else {
      timeRemaining = 'Finalizando...';
      statusText = 'Finalizando...';
    }
  } else if (isUpcoming) {
    // Calculate time until event starts
    const diff = eventStartDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      timeRemaining = `${days}d ${hours}h`;
      statusText = `Comienza en ${days}d ${hours}h`;
    } else if (hours > 0) {
      timeRemaining = `${hours}h ${minutes}m`;
      statusText = `Comienza en ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      timeRemaining = `${minutes}m`;
      statusText = `Comienza en ${minutes}m`;
    } else {
      timeRemaining = 'Comenzando...';
      statusText = 'Comenzando...';
    }
  } else {
    timeRemaining = 'Finalizado';
    statusText = 'Evento finalizado';
  }
  
  return {
    isLive,
    isUpcoming,
    isExpired,
    timeRemaining,
    statusText,
  };
}

/**
 * Format event date for display
 */
export function formatEventDate(fecha: string): string {
  try {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).toUpperCase();
  } catch (error) {
    return fecha;
  }
}

/**
 * Format event time for display
 */
export function formatEventTime(hora: string): string {
  try {
    const parts = hora.split(':');
    return `${parts[0]}:${parts[1]}`;
  } catch (error) {
    return hora;
  }
}

/**
 * Get short date format (e.g., "15 ENE")
 */
export function formatShortDate(fecha: string): { dia: string; mes: string } {
  try {
    const date = new Date(fecha);
    const dia = date.getDate().toString();
    const mes = date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
    return { dia, mes };
  } catch (error) {
    return { dia: '', mes: '' };
  }
}
