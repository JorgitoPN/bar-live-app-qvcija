
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 🧹 LIMPIEZA AUTOMÁTICA DE SALAS VIRTUALES
 * 
 * Este Edge Function se ejecuta periódicamente (cada hora) para:
 * 1. Limpiar mensajes públicos y privados de locales cerrados
 * 2. Resetear salas de locales 24/7 cada 24 horas
 * 3. Hacer checkout automático de usuarios en locales cerrados
 * 
 * Lógica:
 * - Cuando un local cierra → Eliminar TODO el contenido de la sala
 * - Locales 24/7 → Resetear contenido cada 24 horas (nueva jornada)
 * - Apertura del local → Sala limpia (sin contenido residual)
 */

interface CleanupStats {
  localesCerrados: number;
  locales24h: number;
  mensajesEliminados: number;
  checkoutsRealizados: number;
  salasLimpiadas: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[VirtualRoomCleanup] 🧹 Starting virtual room cleanup...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const stats: CleanupStats = {
      localesCerrados: 0,
      locales24h: 0,
      mensajesEliminados: 0,
      checkoutsRealizados: 0,
      salasLimpiadas: [],
    };

    // 1. Obtener todos los locales con sus horarios
    const { data: locales, error: localesError } = await supabase
      .from('locales')
      .select('id, nombre, horarios_completos, google_business_status')
      .eq('activo', true);

    if (localesError) {
      console.error('[VirtualRoomCleanup] ❌ Error fetching locales:', localesError);
      throw localesError;
    }

    console.log('[VirtualRoomCleanup] 📊 Found', locales?.length || 0, 'active locales');

    const now = new Date();
    const currentDay = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    for (const local of locales || []) {
      const isOpen = checkIfLocalIsOpen(local, currentDay, currentTime);
      const is24h = checkIf24Hours(local);

      console.log(`[VirtualRoomCleanup] 🏠 ${local.nombre}: Open=${isOpen}, 24h=${is24h}`);

      // CASO 1: Local cerrado → Limpiar TODO
      if (!isOpen && !is24h) {
        console.log(`[VirtualRoomCleanup] 🔒 Local cerrado: ${local.nombre} - Limpiando sala...`);
        
        // Eliminar todos los mensajes (públicos y privados)
        const { error: deleteMessagesError, count: deletedMessages } = await supabase
          .from('sala_virtual_interacciones')
          .delete({ count: 'exact' })
          .eq('local_id', local.id);

        if (deleteMessagesError) {
          console.error(`[VirtualRoomCleanup] ❌ Error deleting messages for ${local.nombre}:`, deleteMessagesError);
        } else {
          console.log(`[VirtualRoomCleanup] ✅ Deleted ${deletedMessages || 0} messages from ${local.nombre}`);
          stats.mensajesEliminados += deletedMessages || 0;
        }

        // Hacer checkout automático de todos los usuarios
        const { error: checkoutError, count: checkouts } = await supabase
          .from('sala_virtual_checkins')
          .update({
            activo: false,
            checked_out_at: now.toISOString(),
          })
          .eq('local_id', local.id)
          .eq('activo', true);

        if (checkoutError) {
          console.error(`[VirtualRoomCleanup] ❌ Error checking out users for ${local.nombre}:`, checkoutError);
        } else {
          console.log(`[VirtualRoomCleanup] ✅ Checked out ${checkouts || 0} users from ${local.nombre}`);
          stats.checkoutsRealizados += checkouts || 0;
        }

        stats.localesCerrados++;
        stats.salasLimpiadas.push(local.nombre);
      }

      // CASO 2: Local 24/7 → Resetear cada 24 horas
      if (is24h) {
        console.log(`[VirtualRoomCleanup] 🌐 Local 24/7: ${local.nombre} - Checking reset...`);
        
        // Verificar si han pasado 24 horas desde el último reset
        const { data: lastReset, error: lastResetError } = await supabase
          .from('sala_virtual_resets')
          .select('last_reset_at')
          .eq('local_id', local.id)
          .single();

        if (lastResetError && lastResetError.code !== 'PGRST116') {
          console.error(`[VirtualRoomCleanup] ❌ Error checking last reset for ${local.nombre}:`, lastResetError);
          continue;
        }

        const lastResetTime = lastReset?.last_reset_at ? new Date(lastReset.last_reset_at) : null;
        const hoursSinceReset = lastResetTime 
          ? (now.getTime() - lastResetTime.getTime()) / (1000 * 60 * 60)
          : 25; // Si no hay registro, forzar reset

        if (hoursSinceReset >= 24) {
          console.log(`[VirtualRoomCleanup] 🔄 Resetting 24/7 local: ${local.nombre} (${hoursSinceReset.toFixed(1)}h since last reset)`);
          
          // Eliminar todos los mensajes
          const { error: deleteMessagesError, count: deletedMessages } = await supabase
            .from('sala_virtual_interacciones')
            .delete({ count: 'exact' })
            .eq('local_id', local.id);

          if (deleteMessagesError) {
            console.error(`[VirtualRoomCleanup] ❌ Error deleting messages for ${local.nombre}:`, deleteMessagesError);
          } else {
            console.log(`[VirtualRoomCleanup] ✅ Deleted ${deletedMessages || 0} messages from ${local.nombre}`);
            stats.mensajesEliminados += deletedMessages || 0;
          }

          // Hacer checkout de todos los usuarios (nueva jornada)
          const { error: checkoutError, count: checkouts } = await supabase
            .from('sala_virtual_checkins')
            .update({
              activo: false,
              checked_out_at: now.toISOString(),
            })
            .eq('local_id', local.id)
            .eq('activo', true);

          if (checkoutError) {
            console.error(`[VirtualRoomCleanup] ❌ Error checking out users for ${local.nombre}:`, checkoutError);
          } else {
            console.log(`[VirtualRoomCleanup] ✅ Checked out ${checkouts || 0} users from ${local.nombre}`);
            stats.checkoutsRealizados += checkouts || 0;
          }

          // Actualizar timestamp del último reset
          const { error: upsertError } = await supabase
            .from('sala_virtual_resets')
            .upsert({
              local_id: local.id,
              last_reset_at: now.toISOString(),
            }, {
              onConflict: 'local_id',
            });

          if (upsertError) {
            console.error(`[VirtualRoomCleanup] ❌ Error updating reset timestamp for ${local.nombre}:`, upsertError);
          }

          stats.locales24h++;
          stats.salasLimpiadas.push(`${local.nombre} (24/7)`);
        } else {
          console.log(`[VirtualRoomCleanup] ⏳ 24/7 local ${local.nombre}: ${hoursSinceReset.toFixed(1)}h since reset (< 24h, skipping)`);
        }
      }
    }

    console.log('[VirtualRoomCleanup] ✅ Cleanup completed');
    console.log('[VirtualRoomCleanup] 📊 Stats:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        stats,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[VirtualRoomCleanup] ❌ Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Verifica si un local está abierto en este momento
 */
function checkIfLocalIsOpen(local: any, currentDay: string, currentTime: string): boolean {
  if (!local.horarios_completos) return false;

  const horarios = local.horarios_completos[currentDay];
  if (!horarios || horarios.length === 0) return false;

  for (const horario of horarios) {
    const [apertura, cierre] = horario.split('–').map((h: string) => h.trim());
    
    if (!apertura || !cierre) continue;

    // Caso 1: Horario normal (ej: 09:00–18:00)
    if (cierre > apertura) {
      if (currentTime >= apertura && currentTime < cierre) {
        return true;
      }
    }
    // Caso 2: Horario que cruza medianoche (ej: 23:00–06:00)
    else {
      if (currentTime >= apertura || currentTime < cierre) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Verifica si un local es 24/7
 */
function checkIf24Hours(local: any): boolean {
  if (!local.horarios_completos) return false;

  const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  
  for (const day of days) {
    const horarios = local.horarios_completos[day];
    if (!horarios || horarios.length === 0) return false;
    
    const has24h = horarios.some((h: string) => 
      h.includes('00:00–23:59') || 
      h.includes('00:00–00:00') ||
      h.includes('Abierto 24 horas')
    );
    
    if (!has24h) return false;
  }

  return true;
}
