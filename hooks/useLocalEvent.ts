
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
          console.error('[useLocalEvent] Error code:', eventsError.code);
          console.error('[useLocalEvent] Error message:', eventsError.message);
          console.error('[useLocalEvent] Error details:', eventsError.details);
          console.error('[useLocalEvent] Error hint:', eventsError.hint);
          
          // Check if the error is an HTML response (500 error)
          const errorMessage = eventsError.message || '';
          if (errorMessage.includes('<html>') || errorMessage.includes('<!DOCTYPE') || errorMessage.includes('500 Internal Server Error')) {
            console.error('[useLocalEvent] ⚠️ Received HTML error page instead of JSON. This indicates a server error.');
            console.error('[useLocalEvent] Possible causes:');
            console.error('[useLocalEvent] 1. Supabase API is experiencing issues');
            console.error('[useLocalEvent] 2. Database query timeout or resource limit');
            console.error('[useLocalEvent] 3. RLS policy evaluation error');
            console.error('[useLocalEvent] 4. Network connectivity issues');
            
            // Retry logic for server errors
            if (retryCount < 3 && isMounted) {
              const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
              console.log(`[useLocalEvent] Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/3)...`);
              
              retryTimeout = setTimeout(() => {
                if (isMounted) {
                  setRetryCount(prev => prev + 1);
                }
              }, retryDelay);
              return;
            } else {
              console.error('[useLocalEvent] Max retries reached or component unmounted. Giving up.');
            }
          }
          
          if (isMounted) {
            setEvento(null);
            setLoading(false);
            setRetryCount(0); // Reset retry count on final failure
          }
          return;
        }

        // Success - reset retry count
        if (isMounted) {
          setRetryCount(0);
        }

        if (!allEvents || allEvents.length === 0) {
          console.log('[useLocalEvent] No active events found');
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
            break; // Prioritize live events
          }

          // Check if event is upcoming (and we haven't found one yet)
          if (!upcomingEvent && now < eventStartDate) {
            upcomingEvent = event;
          }
        }

        if (isMounted) {
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
          setLoading(false);
        }
      } catch (error) {
        console.error('[useLocalEvent] Unexpected error:', error);
        
        // Log additional details about the error
        if (error instanceof Error) {
          console.error('[useLocalEvent] Error name:', error.name);
          console.error('[useLocalEvent] Error message:', error.message);
          console.error('[useLocalEvent] Error stack:', error.stack);
        }
        
        // Retry on unexpected errors too
        if (retryCount < 3 && isMounted) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          console.log(`[useLocalEvent] Retrying after unexpected error in ${retryDelay}ms (attempt ${retryCount + 1}/3)...`);
          
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
    
    // Refresh every minute to keep countdown accurate
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
  }, [localId, retryCount]); // Add retryCount to dependencies to trigger refetch

  return { evento, loading };
}
