
/**
 * Utility functions for time calculations and schedule handling
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
 */
export function parsearRangoHorario(rango: string): RangoHorario | null {
  try {
    // Handle different separators: "–" (en dash) or "-" (hyphen)
    const [inicio, fin] = rango.split(/[–-]/);
    
    if (!inicio || !fin) {
      console.error('Error parseando horario: formato inválido', rango);
      return null;
    }
    
    const [horaInicio, minInicio] = inicio.trim().split(':').map(Number);
    const [horaFin, minFin] = fin.trim().split(':').map(Number);
    
    // Validar rangos
    if (isNaN(horaInicio) || horaInicio < 0 || horaInicio > 23) {
      console.error('Error parseando horario: hora inicio inválida', rango);
      return null;
    }
    if (isNaN(minInicio) || minInicio < 0 || minInicio > 59) {
      console.error('Error parseando horario: minutos inicio inválidos', rango);
      return null;
    }
    if (isNaN(horaFin) || horaFin < 0 || horaFin > 24) {
      console.error('Error parseando horario: hora fin inválida', rango);
      return null;
    }
    if (isNaN(minFin) || minFin < 0 || minFin > 59) {
      console.error('Error parseando horario: minutos fin inválidos', rango);
      return null;
    }
    
    return { 
      apertura: horaInicio * 60 + minInicio, 
      cierre: horaFin * 60 + minFin 
    };
  } catch (error) {
    console.error('Error parseando horario:', rango, error);
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
 * Now includes days when time is more than 24 hours
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
 * Determine if a schedule is a nighttime schedule
 * A nighttime schedule is one that closes in the early morning hours (after midnight)
 * This includes:
 * - Schedules that open before midnight and close after (e.g., 23:00-06:00)
 * - Schedules that open after midnight and close in early morning (e.g., 00:30-06:00)
 */
function esHorarioNocturno(apertura: number, cierre: number): boolean {
  // If closing time is in early morning (00:00-08:00), it's nighttime
  // This covers both cases:
  // 1. cierre < apertura (crosses midnight, e.g., 23:00-06:00)
  // 2. Both apertura and cierre are after midnight but cierre is in early morning (e.g., 00:30-06:00)
  if (cierre < 480) { // Before 8:00 AM
    return true;
  }
  
  // If it crosses midnight (cierre < apertura), it's nighttime
  if (cierre < apertura) {
    return true;
  }
  
  return false;
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
 * Calculate the current status for a local with normal hours
 * Handles multiple time ranges per day and midnight crossings
 * 
 * CRITICAL FIX: Properly handles overnight schedules including venues that open after midnight
 * 
 * NIGHTTIME SCHEDULE DEFINITION:
 * A nighttime schedule is any schedule that closes in the early morning hours (alta madrugada).
 * This includes:
 * 1. Venues that open before midnight and close after (e.g., 23:00-06:00)
 * 2. Venues that open after midnight and close in early morning (e.g., 00:30-06:00)
 * 
 * LOGICAL DAY RULE:
 * The logical day is the day when the nighttime activity is reported.
 * For nighttime venues:
 * - If it's Wednesday night at 23:30 and venue opens at 23:00, logical day = Wednesday
 * - If it's Thursday at 00:30 and venue opened at 00:30 (nighttime schedule), logical day = Wednesday
 * - If it's Thursday at 02:00 and venue opened Wednesday at 23:00, logical day = Wednesday
 * 
 * Example: Blaster opens Wednesday at 00:30 and closes at 06:00
 * - At Wednesday 00:45, venue is OPEN, logical day = Wednesday (not Thursday)
 * - At Wednesday 05:00, venue is OPEN, logical day = Wednesday
 * - The activity is reported as Wednesday's nighttime activity
 */
export function calcularEstadoHorarioNormal(local: any, ahora: Date): EstadoLocal {
  const diaActualIndex = ahora.getDay();
  const diaActual = diasSemana[diaActualIndex];
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  
  // ✅ FIX v288.0: Disabled excessive logging that was saturating Android
  // These logs were being called 200+ times on initial load, blocking the UI thread
  // console.log(`⏰ [TIME] Calculando estado para: ${local.nombre || 'Local sin nombre'}`);
  // console.log(`⏰ [TIME] Día del calendario: ${diaActual}, Hora actual: ${formatearHora(horaActual)} (${horaActual} minutos)`);
  
  // STEP 1: Determine the logical day
  // The logical day is the day when the venue's operating period started
  // For nighttime venues, if we're in early morning (00:00-08:00), we need to check:
  // 1. If the previous day has an overnight schedule that extends to now
  // 2. If the current day has a nighttime schedule that starts after midnight
  let diaLogico = diaActual;
  let diaLogicoIndex = diaActualIndex;
  let estamosEnMadrugadaDelDiaAnterior = false;
  
  if (horaActual < 480) { // Before 8:00 AM (480 minutes)
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] Es madrugada (${formatearHora(horaActual)}), determinando día lógico...`);
    
    // Check previous day's schedule first
    const diaAnteriorIndex = (diaActualIndex - 1 + 7) % 7;
    const diaAnterior = diasSemana[diaAnteriorIndex];
    const horarioAnterior = local.horarios_completos?.[diaAnterior];
    
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] Verificando horario del día anterior: ${diaAnterior}`);
    
    let encontradoHorarioAnterior = false;
    
    if (horarioAnterior) {
      const franjasAnterior = normalizarFranjas(horarioAnterior);
      
      // Check if the previous day has an overnight schedule that extends to now
      if (franjasAnterior.length > 0 && franjasAnterior[0] !== 'Cerrado') {
        for (const rango of franjasAnterior) {
          if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
          
          const parsed = parsearRangoHorario(rango);
          if (!parsed) continue;
          
          const { apertura, cierre } = parsed;
          
          // If it's a nighttime schedule and current time is before closing
          if (esHorarioNocturno(apertura, cierre) && horaActual < cierre) {
            // ✅ FIX v288.0: Disabled excessive logging
            // console.log(`⏰ [TIME] Horario nocturno del día anterior detectado: ${formatearHora(apertura)}–${formatearHora(cierre)}`);
            // console.log(`⏰ [TIME] ✅ Estamos en la madrugada del horario nocturno del ${diaAnterior} (día lógico)`);
            diaLogico = diaAnterior;
            diaLogicoIndex = diaAnteriorIndex;
            estamosEnMadrugadaDelDiaAnterior = true;
            encontradoHorarioAnterior = true;
            break;
          }
        }
      }
    }
    
    // If no previous day schedule applies, check current day for nighttime schedules
    if (!encontradoHorarioAnterior) {
      const horarioActual = local.horarios_completos?.[diaActual];
      
      if (horarioActual) {
        const franjasActual = normalizarFranjas(horarioActual);
        
        if (franjasActual.length > 0 && franjasActual[0] !== 'Cerrado') {
          for (const rango of franjasActual) {
            if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
            
            const parsed = parsearRangoHorario(rango);
            if (!parsed) continue;
            
            const { apertura, cierre } = parsed;
            
            // Check if this is a nighttime schedule that starts after midnight
            // Example: 00:30-06:00 on Wednesday should be considered Wednesday's nighttime activity
            if (esHorarioNocturno(apertura, cierre) && apertura < 480) { // Opens before 8:00 AM
              // ✅ FIX v288.0: Disabled excessive logging
              // console.log(`⏰ [TIME] Horario nocturno del día actual detectado (abre después de medianoche): ${formatearHora(apertura)}–${formatearHora(cierre)}`);
              
              // This is a nighttime schedule on the current calendar day
              // The logical day should be the PREVIOUS day (the night belongs to the previous day)
              const diaLogicoNocturnoIndex = (diaActualIndex - 1 + 7) % 7;
              const diaLogicoNocturno = diasSemana[diaLogicoNocturnoIndex];
              
              // ✅ FIX v288.0: Disabled excessive logging
              // console.log(`⏰ [TIME] ✅ Horario nocturno del ${diaActual} se reporta como actividad del ${diaLogicoNocturno}`);
              diaLogico = diaLogicoNocturno;
              diaLogicoIndex = diaLogicoNocturnoIndex;
              
              // We'll check this schedule in STEP 2 by looking at the current day's schedule
              // but report it as the previous day's activity
              break;
            }
          }
        }
      }
    }
  }
  
  // ✅ FIX v288.0: Disabled excessive logging
  // console.log(`⏰ [TIME] Día lógico determinado: ${diaLogico}`);
  
  // STEP 2: Get the schedule for checking
  // If we're in early morning and found a nighttime schedule on current day,
  // we need to check the current day's schedule but report it as previous day's activity
  let horarioParaVerificar;
  let diaParaVerificar;
  
  if (horaActual < 480 && !estamosEnMadrugadaDelDiaAnterior && diaLogico !== diaActual) {
    // We're checking current day's nighttime schedule but reporting as previous day
    horarioParaVerificar = local.horarios_completos?.[diaActual];
    diaParaVerificar = diaActual;
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] Verificando horario del día calendario (${diaActual}) pero reportando como ${diaLogico}`);
  } else {
    // Normal case: check the logical day's schedule
    horarioParaVerificar = local.horarios_completos?.[diaLogico];
    diaParaVerificar = diaLogico;
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] Verificando horario del día lógico (${diaLogico})`);
  }
  
  if (!horarioParaVerificar) {
    horarioParaVerificar = [];
  }
  
  const franjas = normalizarFranjas(horarioParaVerificar);
  
  // CASE A: Day is closed (no schedule)
  if (franjas.length === 0 || franjas[0] === 'Cerrado') {
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] Local cerrado en día para verificar (${diaParaVerificar})`);
    
    // Search for next opening
    const proximaApertura = buscarProximaApertura(local, ahora);
    
    if (proximaApertura && proximaApertura.minutosRestantes <= 30) {
      // ✅ FIX v288.0: Disabled excessive logging
      // console.log(`⏰ [TIME] Abre pronto en ${proximaApertura.minutosRestantes} minutos`);
      return {
        badge: 'Abre pronto',
        estaAbierto: false,
        claseBg: 'bg-yellow-500',
        overlayIcon: null,
        tiempoRestante: formatearTiempo(proximaApertura.minutosRestantes),
        diaLogico: diaLogico,
      };
    }
    
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] Cerrado ahora, próxima apertura:`, proximaApertura);
    return {
      badge: proximaApertura 
        ? `Abre a las ${proximaApertura.hora}`
        : 'Cerrado ahora',
      estaAbierto: false,
      claseBg: 'bg-red-500',
      overlayIcon: 'lock',
      tiempoRestante: proximaApertura ? formatearTiempo(proximaApertura.minutosRestantes) : null,
      diaLogico: diaLogico,
    };
  }
  
  // CASE B: Day has schedules → check if it's open NOW
  // ✅ FIX v288.0: Disabled excessive logging
  // console.log(`⏰ [TIME] Verificando ${franjas.length} rangos horarios del día ${diaParaVerificar}`);
  
  for (let i = 0; i < franjas.length; i++) {
    const rango = franjas[i];
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] Verificando rango ${i + 1}: ${rango}`);
    
    if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
    
    const parsed = parsearRangoHorario(rango);
    if (!parsed) {
      // ✅ FIX v288.0: Disabled excessive logging
      // console.log(`⏰ [TIME] Error parseando rango: ${rango}`);
      continue;
    }
    
    const { apertura, cierre } = parsed;
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] Apertura: ${formatearHora(apertura)} (${apertura} min), Cierre: ${formatearHora(cierre)} (${cierre} min)`);
    
    const esNocturno = esHorarioNocturno(apertura, cierre);
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] ¿Es horario nocturno? ${esNocturno ? 'Sí' : 'No'}`);
    
    // NIGHTTIME SCHEDULE
    if (esNocturno) {
      // ✅ FIX v288.0: Disabled excessive logging
      // console.log(`⏰ [TIME] Horario nocturno detectado`);
      
      // Case 1: We're in the early morning continuation of previous day's night
      if (estamosEnMadrugadaDelDiaAnterior && cierre < apertura) {
        // Traditional overnight schedule (e.g., 23:00-06:00)
        if (horaActual < cierre) {
          // ✅ FIX v288.0: Disabled excessive logging
          // console.log(`⏰ [TIME] ✅ ABIERTO (en la madrugada del horario nocturno del ${diaLogico})`);
          
          const minutosHastaCierre = cierre - horaActual;
          // ✅ FIX v288.0: Disabled excessive logging
          // console.log(`⏰ [TIME] Minutos hasta cierre: ${minutosHastaCierre}`);
          
          if (minutosHastaCierre <= 60) {
            return {
              badge: 'Cierra pronto',
              estaAbierto: true,
              claseBg: 'bg-orange-500',
              overlayIcon: null,
              tiempoRestante: formatearTiempo(minutosHastaCierre),
              diaLogico: diaLogico,
            };
          }
          
          return {
            badge: 'Abierto ahora',
            estaAbierto: true,
            claseBg: 'bg-green-500',
            overlayIcon: null,
            tiempoRestante: formatearTiempo(minutosHastaCierre),
            diaLogico: diaLogico,
          };
        }
      }
      // Case 2: Nighttime schedule that opens after midnight (e.g., 00:30-06:00)
      else if (apertura < cierre && apertura < 480 && cierre < 480) {
        // Both opening and closing are after midnight and before 8 AM
        // ✅ FIX v288.0: Disabled excessive logging
        // console.log(`⏰ [TIME] Horario nocturno que abre después de medianoche`);
        
        if (horaActual >= apertura && horaActual < cierre) {
          // ✅ FIX v288.0: Disabled excessive logging
          // console.log(`⏰ [TIME] ✅ ABIERTO (horario nocturno del ${diaLogico})`);
          
          const minutosHastaCierre = cierre - horaActual;
          // ✅ FIX v288.0: Disabled excessive logging
          // console.log(`⏰ [TIME] Minutos hasta cierre: ${minutosHastaCierre}`);
          
          if (minutosHastaCierre <= 60) {
            return {
              badge: 'Cierra pronto',
              estaAbierto: true,
              claseBg: 'bg-orange-500',
              overlayIcon: null,
              tiempoRestante: formatearTiempo(minutosHastaCierre),
              diaLogico: diaLogico,
            };
          }
          
          return {
            badge: 'Abierto ahora',
            estaAbierto: true,
            claseBg: 'bg-green-500',
            overlayIcon: null,
            tiempoRestante: formatearTiempo(minutosHastaCierre),
            diaLogico: diaLogico,
          };
        }
      }
      // Case 3: Traditional overnight schedule, we're in the evening part
      else if (cierre < apertura && horaActual >= apertura) {
        // ✅ FIX v288.0: Disabled excessive logging
        // console.log(`⏰ [TIME] ✅ ABIERTO (después de la apertura del horario nocturno del ${diaLogico})`);
        
        // Calculate minutes until closing (tomorrow morning)
        const minutosHastaCierre = (24 * 60 - horaActual) + cierre;
        // ✅ FIX v288.0: Disabled excessive logging
        // console.log(`⏰ [TIME] Minutos hasta cierre (mañana): ${minutosHastaCierre}`);
        
        if (minutosHastaCierre <= 60) {
          return {
            badge: 'Cierra pronto',
            estaAbierto: true,
            claseBg: 'bg-orange-500',
            overlayIcon: null,
            tiempoRestante: formatearTiempo(minutosHastaCierre),
            diaLogico: diaLogico,
          };
        }
        
        return {
          badge: 'Abierto ahora',
          estaAbierto: true,
          claseBg: 'bg-green-500',
          overlayIcon: null,
          tiempoRestante: formatearTiempo(minutosHastaCierre),
          diaLogico: diaLogico,
        };
      } else {
        // ✅ FIX v288.0: Disabled excessive logging
        // console.log(`⏰ [TIME] ❌ CERRADO (fuera del horario nocturno)`);
      }
    } else {
      // DAYTIME SCHEDULE: Closing before midnight
      // ✅ FIX v288.0: Disabled excessive logging
      // console.log(`⏰ [TIME] Horario diurno detectado`);
      
      if (horaActual >= apertura && horaActual < cierre) {
        // ✅ OPEN (between opening and closing)
        // ✅ FIX v288.0: Disabled excessive logging
        // console.log(`⏰ [TIME] ✅ ABIERTO (horario diurno del ${diaLogico})`);
        
        const minutosHastaCierre = cierre - horaActual;
        // ✅ FIX v288.0: Disabled excessive logging
        // console.log(`⏰ [TIME] Minutos hasta cierre: ${minutosHastaCierre}`);
        
        if (minutosHastaCierre <= 60) {
          return {
            badge: 'Cierra pronto',
            estaAbierto: true,
            claseBg: 'bg-orange-500',
            overlayIcon: null,
            tiempoRestante: formatearTiempo(minutosHastaCierre),
            diaLogico: diaLogico,
          };
        }
        
        return {
          badge: 'Abierto ahora',
          estaAbierto: true,
          claseBg: 'bg-green-500',
          overlayIcon: null,
          tiempoRestante: formatearTiempo(minutosHastaCierre),
          diaLogico: diaLogico,
        };
      } else {
        // ✅ FIX v288.0: Disabled excessive logging
        // console.log(`⏰ [TIME] ❌ CERRADO (fuera del rango ${apertura}-${cierre})`);
      }
    }
  }
  
  // CASE C: Outside all time ranges → CLOSED
  // ✅ FIX v288.0: Disabled excessive logging
  // console.log(`⏰ [TIME] ❌ CERRADO (fuera de todos los rangos)`);
  
  const proximaApertura = buscarProximaApertura(local, ahora);
  
  if (proximaApertura && proximaApertura.minutosRestantes <= 30) {
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] Abre pronto en ${proximaApertura.minutosRestantes} minutos`);
    return {
      badge: 'Abre pronto',
      estaAbierto: false,
      claseBg: 'bg-yellow-500',
      overlayIcon: null,
      tiempoRestante: formatearTiempo(proximaApertura.minutosRestantes),
      diaLogico: diaLogico,
    };
  }
  
  // ✅ FIX v288.0: Disabled excessive logging
  // console.log(`⏰ [TIME] Próxima apertura:`, proximaApertura);
  return {
    badge: proximaApertura 
      ? `Abre a las ${proximaApertura.hora}`
      : 'Cerrado ahora',
    estaAbierto: false,
    claseBg: 'bg-red-500',
    overlayIcon: 'lock',
    tiempoRestante: proximaApertura ? formatearTiempo(proximaApertura.minutosRestantes) : null,
    diaLogico: diaLogico,
  };
}

/**
 * Get the complete status of a local (main entry point)
 */
export function getEstadoLocal(local: any, ahora: Date = new Date()): EstadoLocal {
  // CASE: Permanently closed
  if (local.estado_negocio === 'CLOSED_PERMANENTLY') {
    return { 
      badge: 'Cerrado permanentemente', 
      estaAbierto: false,
      claseBg: 'bg-red-500',
      overlayIcon: 'lock',
      tiempoRestante: null,
      diaLogico: diasSemana[ahora.getDay()],
    };
  }
  
  // CASE: Temporarily closed
  if (local.estado_negocio === 'CLOSED_TEMPORARILY') {
    return { 
      badge: 'Cerrado temporalmente', 
      estaAbierto: false,
      claseBg: 'bg-orange-500',
      overlayIcon: 'clock',
      tiempoRestante: null,
      diaLogico: diasSemana[ahora.getDay()],
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
      diaLogico: diasSemana[ahora.getDay()],
    };
  }
  
  // CASE: Open 24 hours
  if (esLocal24Horas(local.horarios_completos)) {
    // ✅ FIX v288.0: Disabled excessive logging
    // console.log(`⏰ [TIME] ✅ Local abierto 24 horas detectado: ${local.nombre}`);
    return { 
      badge: 'Abierto 24h', 
      estaAbierto: true,
      claseBg: 'bg-green-500',
      overlayIcon: null,
      tiempoRestante: null,
      diaLogico: diasSemana[ahora.getDay()],
    };
  }
  
  // CASE: Normal schedule (with all special cases)
  return calcularEstadoHorarioNormal(local, ahora);
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
