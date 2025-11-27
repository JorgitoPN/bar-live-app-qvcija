
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!localId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;

    const fetchActiveEvent = async () => {
      try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 8);

        logger.debug('[useLocalEvent] Fetching active event for local:', localId);

        // Fetch all active events for this local and filter in memory
        const { data: allEvents, error: eventsError } = await supabase
          .from('eventos')
          .select('id, titulo, fecha, fecha_fin, hora, hora_fin, imagen_url, precio')
          .eq('local_id', localId)
          .eq('activo', true)
          .order('fecha', { ascending: true })
          .order('hora', { ascending: true });

        if (eventsError) {
          logger.error('[useLocalEvent] Error fetching events:', eventsError.message);
          
          // Check if the error is an HTML response (500 error)
          const errorMessage = eventsError.message || '';
          if (errorMessage.includes('<html>') || errorMessage.includes('<!DOCTYPE') || errorMessage.includes('500 Internal Server Error')) {
            // Retry logic for server errors
            if (retryCount < 3 && isMounted) {
              const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
              logger.debug(`[useLocalEvent] Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/3)...`);
              
              retryTimeout = setTimeout(() => {
                if (isMounted) {
                  setRetryCount(prev => prev + 1);
                }
              }, retryDelay);
              return;
            }
          }
          
          if (isMounted) {
            setEvento(null);
            setLoading(false);
            setRetryCount(0);
          }
          return;
        }

        // Success - reset retry count
        if (isMounted) {
          setRetryCount(0);
        }

        if (!allEvents || allEvents.length === 0) {
          logger.debug('[useLocalEvent] No active events found');
          if (isMounted) {
            setEvento(null);
            setLoading(false);
          }
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
            break;
          }

          // Check if event is upcoming
          if (!upcomingEvent && now < eventStartDate) {
            upcomingEvent = event;
          }
        }

        if (isMounted) {
          if (liveEvent) {
            logger.debug('[useLocalEvent] Found LIVE event:', liveEvent.titulo);
            setEvento(liveEvent);
          } else if (upcomingEvent) {
            logger.debug('[useLocalEvent] Found UPCOMING event:', upcomingEvent.titulo);
            setEvento(upcomingEvent);
          } else {
            logger.debug('[useLocalEvent] No active or upcoming events found');
            setEvento(null);
          }
          setLoading(false);
        }
      } catch (error) {
        logger.error('[useLocalEvent] Unexpected error:', error);
        
        // Retry on unexpected errors
        if (retryCount < 3 && isMounted) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          logger.debug(`[useLocalEvent] Retrying after unexpected error in ${retryDelay}ms`);
          
          retryTimeout = setTimeout(() => {
            if (isMounted) {
              setRetryCount(prev => prev + 1);
            }
          }, retryDelay);
          return;
        }
        
        if (isMounted) {
          setEvento(null);
          setLoading(false);
          setRetryCount(0);
        }
      }
    };

    fetchActiveEvent();
    
    // Refresh every minute
    const interval = setInterval(() => {
      if (isMounted) {
        fetchActiveEvent();
      }
    }, 60000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [localId, retryCount]);

  return { evento, loading };
}
