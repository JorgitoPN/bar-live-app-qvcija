
/**
 * Utility functions for time calculations and schedule handling
 * 
 * ✅ v446.0: CRITICAL FIX - TIMEZONE & STATUS CONSISTENCY
 * - ALL calculations now use Europe/Madrid timezone (matching backend)
 * - Overnight schedule logic matches backend RPC exactly
 * - Status calculation is 100% consistent with backend
 * 
 * ✅ v428.0: TIME NORMALIZATION SYSTEM
 * All times ending in "24:00" are automatically converted to "23:59"
 * This ensures compliance with standard 24-hour format (00:00-23:59)
 */

interface EstadoLocal {
  badge: string;
  estaAbierto: boolean | null;
  claseBg?: string;
  overlayIcon?: string | null;
  tiempoRestante?: string | null;
  diaLogico?: string;
}

interface ProximaApertura {
  dia: string;
  hora: string;
  minutosRestantes: number;
}

interface RangoHorario {
  apertura: number;
  cierre: number;
}

const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/**
 * ✅ v446.0: CRITICAL - Get current time in Spain timezone
 * This ensures consistency with backend RPC function
 */
function getCurrentSpainTime(): Date {
  // Get current UTC time
  const now = new Date();
  
  // Convert to Spain timezone (Europe/Madrid)
  // Spain is UTC+1 (CET) or UTC+2 (CEST during daylight saving)
  const spainTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  
  return spainTime;
}

/**
 * Normalize and validate a time string
 * Converts "24:00" to "23:59" and validates the time is between 00:00 and 23:59
 */
export function normalizeAndValidateTime(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') {
    console.warn('Invalid time string provided:', timeStr);
    return timeStr;
  }

  const trimmedTime = timeStr.trim();

  // Convert "24:00" to "23:59" - CRITICAL FIX v428.0
  if (trimmedTime === '24:00') {
    return '23:59';
  }

  // Validate format HH:MM and range 00:00 to 23:59
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(trimmedTime)) {
    console.warn(`⏰ [TIME NORMALIZE] Invalid time format or range: ${trimmedTime}. Expected HH:MM between 00:00 and 23:59.`);
    return trimmedTime;
  }

  return trimmedTime;
}

/**
 * Normalize schedule data to array format
 */
function normalizarFranjas(franjas: any): string[] {
  if (!franjas) return [];
  if (Array.isArray(franjas)) return franjas;
  if (typeof franjas === 'string') return [franjas];
  return [];
}

/**
 * Parse a time range string and validate it
 * Returns null if the format is invalid or corrupted
 * Now includes normalization to convert "24:00" to "23:59"
 */
export function parsearRangoHorario(rango: string): RangoHorario | null {
  try {
    // Handle different separators: "–" (en dash) or "-" (hyphen)
    const [inicio, fin] = rango.split(/[–-]/);
    
    if (!inicio || !fin) {
      return null;
    }
    
    // Normalize times (convert 24:00 to 23:59)
    const inicioNormalizado = normalizeAndValidateTime(inicio.trim());
    const finNormalizado = normalizeAndValidateTime(fin.trim());
    
    const [horaInicio, minInicio] = inicioNormalizado.split(':').map(Number);
    const [horaFin, minFin] = finNormalizado.split(':').map(Number);
    
    // Validar rangos (now 0-23 for hours since we normalize 24:00 to 23:59)
    if (isNaN(horaInicio) || horaInicio < 0 || horaInicio > 23) {
      return null;
    }
    if (isNaN(minInicio) || minInicio < 0 || minInicio > 59) {
      return null;
    }
    if (isNaN(horaFin) || horaFin < 0 || horaFin > 23) {
      return null;
    }
    if (isNaN(minFin) || minFin < 0 || minFin > 59) {
      return null;
    }
    
    return { 
      apertura: horaInicio * 60 + minInicio, 
      cierre: horaFin * 60 + minFin 
    };
  } catch (error) {
    return null;
  }
}

/**
 * Format time in minutes to HH:MM string
 */
export function formatearHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format time remaining in a human-readable way
 */
export function formatearTiempo(minutos: number): string {
  if (minutos < 60) {
    return `${minutos} min`;
  }
  
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  
  // If more than 24 hours, show days
  if (horas >= 24) {
    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;
    
    if (horasRestantes === 0 && mins === 0) {
      return `${dias} ${dias === 1 ? 'día' : 'días'}`;
    } else if (horasRestantes === 0) {
      return `${dias} ${dias === 1 ? 'día' : 'días'} ${mins} min`;
    } else if (mins === 0) {
      return `${dias} ${dias === 1 ? 'día' : 'días'} ${horasRestantes} h`;
    } else {
      return `${dias} ${dias === 1 ? 'día' : 'días'} ${horasRestantes} h ${mins} min`;
    }
  }
  
  // Less than 24 hours
  if (mins === 0) {
    return `${horas} h`;
  }
  return `${horas} h ${mins} min`;
}

/**
 * Format day name in Spanish
 */
export function formatearDiaSemana(dia: string): string {
  const dias: Record<string, string> = {
    lunes: 'lunes',
    martes: 'martes',
    miercoles: 'miércoles',
    jueves: 'jueves',
    viernes: 'viernes',
    sabado: 'sábado',
    domingo: 'domingo',
  };
  return dias[dia] || dia;
}

/**
 * Calculate minutes until a specific time on a specific day
 */
export function calcularMinutosHasta(ahora: Date, diaIndex: number, horaMinutos: number): number {
  const diaActual = ahora.getDay();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  
  let diasHasta = diaIndex - diaActual;
  if (diasHasta < 0) {
    diasHasta += 7;
  }
  
  const minutosHasta = (diasHasta * 24 * 60) + (horaMinutos - horaActual);
  return minutosHasta;
}

/**
 * Check if a local is open 24 hours
 * A local is 24h ONLY if ALL 7 days have 24-hour schedules
 */
export function esLocal24Horas(horarios: Record<string, any>): boolean {
  if (!horarios) return false;
  
  let diasCon24h = 0;
  
  for (const dia of diasSemana) {
    const horarioDia = horarios[dia];
    
    // If no schedule for this day, it's not 24h
    if (!horarioDia) {
      return false;
    }
    
    const franjas = normalizarFranjas(horarioDia);
    
    // If empty or closed, not 24h
    if (franjas.length === 0 || franjas[0] === 'Cerrado') {
      return false;
    }
    
    // Check if this day has 24-hour schedule
    const es24h = franjas.some(h => {
      const horarioLower = h.toLowerCase().trim();
      return (
        horarioLower === '24 horas' || 
        horarioLower === '24h' || 
        horarioLower === 'abierto 24 horas' ||
        horarioLower.includes('abierto 24')
      );
    });
    
    if (es24h) {
      diasCon24h++;
    }
  }
  
  // A local is 24h ONLY if ALL 7 days have 24-hour schedules
  return diasCon24h === 7;
}

/**
 * Search for the next opening time in the next 7 days
 */
export function buscarProximaApertura(local: any, ahora: Date): ProximaApertura | null {
  const diaActual = ahora.getDay();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  
  // First, check if it opens later TODAY
  const diaNombreHoy = diasSemana[diaActual];
  const horarioHoy = local.horarios_completos?.[diaNombreHoy];
  
  if (horarioHoy) {
    const franjas = normalizarFranjas(horarioHoy);
    
    if (franjas.length > 0 && franjas[0] !== 'Cerrado') {
      for (const rango of franjas) {
        if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
        
        const parsed = parsearRangoHorario(rango);
        if (!parsed) continue;
        
        // If opening is later today
        if (parsed.apertura > horaActual) {
          return {
            dia: diaNombreHoy,
            hora: formatearHora(parsed.apertura),
            minutosRestantes: parsed.apertura - horaActual
          };
        }
      }
    }
  }
  
  // Search in the next 7 days
  for (let i = 1; i <= 7; i++) {
    const diaIndex = (ahora.getDay() + i) % 7;
    const diaNombre = diasSemana[diaIndex];
    const horarioDia = local.horarios_completos?.[diaNombre];
    
    if (horarioDia) {
      const franjas = normalizarFranjas(horarioDia);
      
      if (franjas.length > 0 && franjas[0] !== 'Cerrado') {
        // Get the first valid time range
        for (const rango of franjas) {
          if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
          
          const parsed = parsearRangoHorario(rango);
          if (!parsed) continue;
          
          return {
            dia: diaNombre,
            hora: formatearHora(parsed.apertura),
            minutosRestantes: calcularMinutosHasta(ahora, diaIndex, parsed.apertura)
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * ✅ v446.0: CRITICAL FIX - Calculate status matching backend RPC EXACTLY
 * This function now uses Spain timezone and matches backend logic 100%
 */
export function calcularEstadoHorarioNormal(local: any, ahora: Date): EstadoLocal {
  const diaActualIndex = ahora.getDay();
  const diaActual = diasSemana[diaActualIndex];
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  
  // ✅ STEP 1: Check current day's schedule
  const horarioActual = local.horarios_completos?.[diaActual];
  
  if (!horarioActual) {
    // No schedule for today - check next opening
    const proximaApertura = buscarProximaApertura(local, ahora);
    
    if (proximaApertura && proximaApertura.minutosRestantes <= 30) {
      return {
        badge: 'Abre pronto',
        estaAbierto: false,
        claseBg: 'bg-yellow-500',
        overlayIcon: null,
        tiempoRestante: formatearTiempo(proximaApertura.minutosRestantes),
        diaLogico: diaActual,
      };
    }
    
    return {
      badge: proximaApertura 
        ? `Abre a las ${proximaApertura.hora}`
        : 'Cerrado ahora',
      estaAbierto: false,
      claseBg: 'bg-red-500',
      overlayIcon: 'lock',
      tiempoRestante: proximaApertura ? formatearTiempo(proximaApertura.minutosRestantes) : null,
      diaLogico: diaActual,
    };
  }
  
  const franjasActual = normalizarFranjas(horarioActual);
  
  // CASE A: Day is closed
  if (franjasActual.length === 0 || franjasActual[0] === 'Cerrado') {
    const proximaApertura = buscarProximaApertura(local, ahora);
    
    if (proximaApertura && proximaApertura.minutosRestantes <= 30) {
      return {
        badge: 'Abre pronto',
        estaAbierto: false,
        claseBg: 'bg-yellow-500',
        overlayIcon: null,
        tiempoRestante: formatearTiempo(proximaApertura.minutosRestantes),
        diaLogico: diaActual,
      };
    }
    
    return {
      badge: proximaApertura 
        ? `Abre a las ${proximaApertura.hora}`
        : 'Cerrado ahora',
      estaAbierto: false,
      claseBg: 'bg-red-500',
      overlayIcon: 'lock',
      tiempoRestante: proximaApertura ? formatearTiempo(proximaApertura.minutosRestantes) : null,
      diaLogico: diaActual,
    };
  }
  
  // ✅ STEP 2: Check if open in current day's schedule (matching backend logic)
  let isOpenInCurrentDay = false;
  let closingTimeCurrentDay: number | null = null;
  
  for (const rango of franjasActual) {
    if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
    
    const parsed = parsearRangoHorario(rango);
    if (!parsed) continue;
    
    const { apertura, cierre } = parsed;
    
    // Normal schedule (start < end)
    if (apertura < cierre) {
      if (horaActual >= apertura && horaActual < cierre) {
        isOpenInCurrentDay = true;
        closingTimeCurrentDay = cierre;
        break;
      }
    }
    // Overnight schedule (start > end): evening part
    else if (apertura > cierre) {
      if (horaActual >= apertura) {
        isOpenInCurrentDay = true;
        closingTimeCurrentDay = cierre; // Will close tomorrow morning
        break;
      }
    }
  }
  
  if (isOpenInCurrentDay && closingTimeCurrentDay !== null) {
    // Calculate minutes until closing
    let minutosHastaCierre: number;
    
    // Check if this is an overnight schedule
    const isOvernight = closingTimeCurrentDay < horaActual;
    if (isOvernight) {
      // Overnight: closing is tomorrow morning
      minutosHastaCierre = (24 * 60 - horaActual) + closingTimeCurrentDay;
    } else {
      // Same day closing
      minutosHastaCierre = closingTimeCurrentDay - horaActual;
    }
    
    if (minutosHastaCierre <= 60) {
      return {
        badge: 'Cierra pronto',
        estaAbierto: true,
        claseBg: 'bg-orange-500',
        overlayIcon: null,
        tiempoRestante: formatearTiempo(minutosHastaCierre),
        diaLogico: diaActual,
      };
    }
    
    return {
      badge: 'Abierto ahora',
      estaAbierto: true,
      claseBg: 'bg-green-500',
      overlayIcon: null,
      tiempoRestante: formatearTiempo(minutosHastaCierre),
      diaLogico: diaActual,
    };
  }
  
  // ✅ STEP 3: Check if in morning continuation of previous day's overnight schedule
  const diaAnteriorIndex = (diaActualIndex - 1 + 7) % 7;
  const diaAnterior = diasSemana[diaAnteriorIndex];
  const horarioAnterior = local.horarios_completos?.[diaAnterior];
  
  if (horarioAnterior) {
    const franjasAnterior = normalizarFranjas(horarioAnterior);
    
    for (const rango of franjasAnterior) {
      if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
      
      const parsed = parsearRangoHorario(rango);
      if (!parsed) continue;
      
      const { apertura, cierre } = parsed;
      
      // Only overnight schedules (start > end) morning continuation
      if (apertura > cierre) {
        if (horaActual < cierre) {
          const minutosHastaCierre = cierre - horaActual;
          
          if (minutosHastaCierre <= 60) {
            return {
              badge: 'Cierra pronto',
              estaAbierto: true,
              claseBg: 'bg-orange-500',
              overlayIcon: null,
              tiempoRestante: formatearTiempo(minutosHastaCierre),
              diaLogico: diaAnterior, // Logical day is previous day
            };
          }
          
          return {
            badge: 'Abierto ahora',
            estaAbierto: true,
            claseBg: 'bg-green-500',
            overlayIcon: null,
            tiempoRestante: formatearTiempo(minutosHastaCierre),
            diaLogico: diaAnterior, // Logical day is previous day
          };
        }
      }
    }
  }
  
  // ✅ STEP 4: Not open - find next opening
  const proximaApertura = buscarProximaApertura(local, ahora);
  
  if (proximaApertura && proximaApertura.minutosRestantes <= 30) {
    return {
      badge: 'Abre pronto',
      estaAbierto: false,
      claseBg: 'bg-yellow-500',
      overlayIcon: null,
      tiempoRestante: formatearTiempo(proximaApertura.minutosRestantes),
      diaLogico: diaActual,
    };
  }
  
  return {
    badge: proximaApertura 
      ? `Abre a las ${proximaApertura.hora}`
      : 'Cerrado ahora',
    estaAbierto: false,
    claseBg: 'bg-red-500',
    overlayIcon: 'lock',
    tiempoRestante: proximaApertura ? formatearTiempo(proximaApertura.minutosRestantes) : null,
    diaLogico: diaActual,
  };
}

/**
 * ✅ v446.0: CRITICAL FIX - Get status using Spain timezone
 * This is the main entry point - now uses Spain time for consistency
 */
export function getEstadoLocal(local: any, ahora?: Date): EstadoLocal {
  // ✅ CRITICAL: Use Spain timezone if no time provided
  const spainTime = ahora || getCurrentSpainTime();
  
  // CASE: Permanently closed
  if (local.estado_negocio === 'CLOSED_PERMANENTLY' || local.google_business_status === 'CLOSED_PERMANENTLY') {
    return { 
      badge: 'Cerrado permanentemente', 
      estaAbierto: false,
      claseBg: 'bg-red-500',
      overlayIcon: 'lock',
      tiempoRestante: null,
      diaLogico: diasSemana[spainTime.getDay()],
    };
  }
  
  // CASE: Temporarily closed
  if (local.estado_negocio === 'CLOSED_TEMPORARILY' || local.google_business_status === 'CLOSED_TEMPORARILY') {
    return { 
      badge: 'Cerrado temporalmente', 
      estaAbierto: false,
      claseBg: 'bg-orange-500',
      overlayIcon: 'clock',
      tiempoRestante: null,
      diaLogico: diasSemana[spainTime.getDay()],
    };
  }
  
  // CASE: No schedule information
  if (!local.horarios_completos || Object.keys(local.horarios_completos).length === 0) {
    return { 
      badge: 'Sin información de horario', 
      estaAbierto: null,
      claseBg: 'bg-gray-400',
      overlayIcon: 'questionmark',
      tiempoRestante: null,
      diaLogico: diasSemana[spainTime.getDay()],
    };
  }
  
  // CASE: Open 24 hours
  if (esLocal24Horas(local.horarios_completos)) {
    return { 
      badge: 'Abierto 24h', 
      estaAbierto: true,
      claseBg: 'bg-green-500',
      overlayIcon: null,
      tiempoRestante: null,
      diaLogico: diasSemana[spainTime.getDay()],
    };
  }
  
  // CASE: Normal schedule
  return calcularEstadoHorarioNormal(local, spainTime);
}

/**
 * Calculate time until opening or closing (legacy function for compatibility)
 */
export function calcularTiempoHasta(horarios_completos: Record<string, string[]> | null, estado_actual: string | null): string {
  if (!horarios_completos || Object.keys(horarios_completos).length === 0) {
    return estado_actual === 'abierto_ahora' ? 'Abierto' : 'Cerrado';
  }

  const local = { horarios_completos };
  const estado = getEstadoLocal(local);
  
  if (estado.tiempoRestante) {
    return `${estado.badge} • ${estado.tiempoRestante}`;
  }
  
  return estado.badge;
}

/**
 * Format day name in Spanish (legacy function)
 */
export function formatDayName(day: string): string {
  return formatearDiaSemana(day);
}

/**
 * Get current opening status with time info (legacy function)
 */
export function getOpeningStatus(horarios_completos: Record<string, string[]> | null, estado_actual: string | null): {
  isOpen: boolean;
  text: string;
  color: string;
} {
  const local = { horarios_completos };
  const estado = getEstadoLocal(local);
  
  const colorMap: Record<string, string> = {
    'bg-green-500': '#22C55E',
    'bg-orange-500': '#F97316',
    'bg-yellow-500': '#EAB308',
    'bg-red-500': '#EF4444',
    'bg-gray-400': '#9CA3AF',
  };
  
  return {
    isOpen: estado.estaAbierto === true,
    text: estado.tiempoRestante ? `${estado.badge} • ${estado.tiempoRestante}` : estado.badge,
    color: colorMap[estado.claseBg || 'bg-gray-400'] || '#9CA3AF',
  };
}
