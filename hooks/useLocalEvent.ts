
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

interface EventoData {
  id: string;
  titulo: string;
  fecha: string;
  fecha_fin?: string | null;
  hora: string;
  hora_fin?: string | null;
  imagen_url?: string | null;
  precio?: number | null;
}

export function useLocalEvent(localId: string | undefined) {
  const [evento, setEvento] = useState<EventoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localId) {
      setLoading(false);
      return;
    }

    const fetchActiveEvent = async () => {
      try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 8);

        console.log('[useLocalEvent] Fetching active event for local:', localId);
        console.log('[useLocalEvent] Current date:', currentDate);
        console.log('[useLocalEvent] Current time:', currentTime);

        // Fetch all active events for this local and filter in memory
        // This is more reliable than complex SQL queries
        const { data: allEvents, error: eventsError } = await supabase
          .from('eventos')
          .select('id, titulo, fecha, fecha_fin, hora, hora_fin, imagen_url, precio')
          .eq('local_id', localId)
          .eq('activo', true)
          .order('fecha', { ascending: true })
          .order('hora', { ascending: true });

        if (eventsError) {
          console.error('[useLocalEvent] Error fetching events:', eventsError);
          setEvento(null);
          setLoading(false);
          return;
        }

        if (!allEvents || allEvents.length === 0) {
          console.log('[useLocalEvent] No active events found');
          setEvento(null);
          setLoading(false);
          return;
        }

        // Filter events to find live or upcoming
        let liveEvent = null;
        let upcomingEvent = null;

        for (const event of allEvents) {
          const eventStartDate = new Date(`${event.fecha}T${event.hora}`);
          
          let eventEndDate: Date;
          if (event.fecha_fin && event.hora_fin) {
            eventEndDate = new Date(`${event.fecha_fin}T${event.hora_fin}`);
          } else {
            // Default to 4 hours after start
            eventEndDate = new Date(eventStartDate.getTime() + 4 * 60 * 60 * 1000);
          }

          // Check if event is live
          if (now >= eventStartDate && now <= eventEndDate) {
            liveEvent = event;
            break; // Prioritize live events
          }

          // Check if event is upcoming (and we haven't found one yet)
          if (!upcomingEvent && now < eventStartDate) {
            upcomingEvent = event;
          }
        }

        if (liveEvent) {
          console.log('[useLocalEvent] Found LIVE event:', liveEvent.titulo);
          setEvento(liveEvent);
        } else if (upcomingEvent) {
          console.log('[useLocalEvent] Found UPCOMING event:', upcomingEvent.titulo);
          setEvento(upcomingEvent);
        } else {
          console.log('[useLocalEvent] No active or upcoming events found');
          setEvento(null);
        }
      } catch (error) {
        console.error('[useLocalEvent] Error:', error);
        setEvento(null);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveEvent();
    
    // Refresh every minute to keep countdown accurate
    const interval = setInterval(fetchActiveEvent, 60000);
    
    return () => clearInterval(interval);
  }, [localId]);

  return { evento, loading };
}
