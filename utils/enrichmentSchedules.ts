
import { GooglePlaceDetails } from '@/types';

/**
 * Días de la semana en español
 */
const DIAS_SEMANA = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado'
];

/**
 * Convertir horarios de Google Places a formato BarLive
 */
export function convertirHorarios(
  openingHours: GooglePlaceDetails['opening_hours']
): Record<string, string[]> {
  console.log('[Schedules] Converting schedules...');
  
  const horarios: Record<string, string[]> = {
    lunes: ['Cerrado'],
    martes: ['Cerrado'],
    miercoles: ['Cerrado'],
    jueves: ['Cerrado'],
    viernes: ['Cerrado'],
    sabado: ['Cerrado'],
    domingo: ['Cerrado'],
  };
  
  if (!openingHours || !openingHours.weekday_text) {
    console.log('[Schedules] No opening hours available');
    return horarios;
  }
  
  // Procesar cada día
  for (const dayText of openingHours.weekday_text) {
    const parsed = parseDaySchedule(dayText);
    if (parsed) {
      horarios[parsed.dia] = parsed.horarios;
    }
  }
  
  console.log('[Schedules] Schedules converted successfully');
  return horarios;
}

/**
 * Parsear el texto de horario de un día
 * Ejemplos:
 * - "lunes: 09:00–23:00"
 * - "martes: 09:00–14:00, 17:00–23:00"
 * - "miércoles: Cerrado"
 * - "Monday: 9:00 AM – 11:00 PM"
 */
function parseDaySchedule(dayText: string): { dia: string; horarios: string[] } | null {
  console.log('[Schedules] Parsing:', dayText);
  
  // Separar día y horarios
  const parts = dayText.split(':');
  if (parts.length < 2) {
    return null;
  }
  
  const dayName = parts[0].trim().toLowerCase();
  const scheduleText = parts.slice(1).join(':').trim();
  
  // Mapear nombre del día a español
  const diaMap: Record<string, string> = {
    'monday': 'lunes',
    'tuesday': 'martes',
    'wednesday': 'miercoles',
    'thursday': 'jueves',
    'friday': 'viernes',
    'saturday': 'sabado',
    'sunday': 'domingo',
    'lunes': 'lunes',
    'martes': 'martes',
    'miércoles': 'miercoles',
    'miercoles': 'miercoles',
    'jueves': 'jueves',
    'viernes': 'viernes',
    'sábado': 'sabado',
    'sabado': 'sabado',
    'domingo': 'domingo',
  };
  
  const dia = diaMap[dayName];
  if (!dia) {
    console.log('[Schedules] Unknown day:', dayName);
    return null;
  }
  
  // Verificar si está cerrado
  if (
    scheduleText.toLowerCase().includes('cerrado') ||
    scheduleText.toLowerCase().includes('closed')
  ) {
    return { dia, horarios: ['Cerrado'] };
  }
  
  // Verificar si está abierto 24 horas
  if (
    scheduleText.toLowerCase().includes('24 horas') ||
    scheduleText.toLowerCase().includes('24 hours') ||
    scheduleText.toLowerCase().includes('open 24 hours')
  ) {
    return { dia, horarios: ['00:00-23:59'] };
  }
  
  // Extraer rangos horarios
  const horarios: string[] = [];
  
  // Patrones para detectar horarios
  // Formato 24h: 09:00–23:00 o 09:00-23:00
  const pattern24h = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/g;
  
  // Formato 12h: 9:00 AM – 11:00 PM
  const pattern12h = /(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
  
  let match;
  
  // Intentar formato 12h primero
  while ((match = pattern12h.exec(scheduleText)) !== null) {
    const startHour = parseInt(match[1]);
    const startMin = match[2];
    const startPeriod = match[3].toUpperCase();
    const endHour = parseInt(match[4]);
    const endMin = match[5];
    const endPeriod = match[6].toUpperCase();
    
    // Convertir a formato 24h
    let start24h = startHour;
    if (startPeriod === 'PM' && startHour !== 12) start24h += 12;
    if (startPeriod === 'AM' && startHour === 12) start24h = 0;
    
    let end24h = endHour;
    if (endPeriod === 'PM' && endHour !== 12) end24h += 12;
    if (endPeriod === 'AM' && endHour === 12) end24h = 0;
    
    const startStr = `${start24h.toString().padStart(2, '0')}:${startMin}`;
    const endStr = `${end24h.toString().padStart(2, '0')}:${endMin}`;
    
    horarios.push(`${startStr}-${endStr}`);
  }
  
  // Si no encontró formato 12h, intentar formato 24h
  if (horarios.length === 0) {
    while ((match = pattern24h.exec(scheduleText)) !== null) {
      const startHour = match[1].padStart(2, '0');
      const startMin = match[2];
      const endHour = match[3].padStart(2, '0');
      const endMin = match[4];
      
      horarios.push(`${startHour}:${startMin}-${endHour}:${endMin}`);
    }
  }
  
  // Si no se encontraron horarios, marcar como cerrado
  if (horarios.length === 0) {
    console.log('[Schedules] No valid schedules found, marking as closed');
    return { dia, horarios: ['Cerrado'] };
  }
  
  console.log('[Schedules] Parsed schedules:', horarios);
  return { dia, horarios };
}

/**
 * Verificar si un local está abierto ahora
 */
export function estaAbiertoAhora(
  horarios: Record<string, string[]>
): boolean {
  const now = new Date();
  const dia = DIAS_SEMANA[now.getDay()];
  const horaActual = now.getHours();
  const minutoActual = now.getMinutes();
  const tiempoActual = horaActual * 60 + minutoActual;
  
  const horariosHoy = horarios[dia];
  if (!horariosHoy || horariosHoy.includes('Cerrado')) {
    return false;
  }
  
  for (const rango of horariosHoy) {
    if (rango === 'Cerrado') continue;
    
    const [inicio, fin] = rango.split('-');
    if (!inicio || !fin) continue;
    
    const [inicioHora, inicioMin] = inicio.split(':').map(Number);
    const [finHora, finMin] = fin.split(':').map(Number);
    
    const tiempoInicio = inicioHora * 60 + inicioMin;
    let tiempoFin = finHora * 60 + finMin;
    
    // Si cierra después de medianoche (ej: 02:00)
    if (tiempoFin < tiempoInicio) {
      tiempoFin += 24 * 60;
    }
    
    if (tiempoActual >= tiempoInicio && tiempoActual <= tiempoFin) {
      return true;
    }
  }
  
  return false;
}
