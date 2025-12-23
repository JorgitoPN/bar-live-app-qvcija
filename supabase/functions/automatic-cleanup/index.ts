
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  tipo_limpieza: string;
  grupos_procesados: number;
  locales_eliminados: number;
  locales_excluidos: number;
  detalles: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[AutoCleanup Edge Function] Starting automatic cleanup...');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for options
    const { dryRun = false, incluirDuplicados = true, incluirInvalidos = true } = await req.json().catch(() => ({}));

    console.log('[AutoCleanup] Configuration:', { dryRun, incluirDuplicados, incluirInvalidos });

    // Execute cleanup
    const { data, error } = await supabase.rpc('ejecutar_limpieza_completa', {
      p_admin_id: null, // System-triggered cleanup
      p_dry_run: dryRun,
      p_incluir_duplicados: incluirDuplicados,
      p_incluir_invalidos: incluirInvalidos,
    });

    if (error) {
      console.error('[AutoCleanup] Error executing cleanup:', error);
      throw error;
    }

    const resultados = data as CleanupResult[];
    const totalEliminados = resultados.reduce((sum, r) => sum + r.locales_eliminados, 0);
    const totalExcluidos = resultados.reduce((sum, r) => sum + r.locales_excluidos, 0);

    console.log('[AutoCleanup] ✅ Cleanup completed');
    console.log('[AutoCleanup] Total eliminated:', totalEliminados);
    console.log('[AutoCleanup] Total excluded:', totalExcluidos);

    // Log cleanup execution
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      dryRun,
      totalEliminados,
      totalExcluidos,
      resultados: resultados.map(r => ({
        tipo: r.tipo_limpieza,
        gruposProcesados: r.grupos_procesados,
        localesEliminados: r.locales_eliminados,
        localesExcluidos: r.locales_excluidos,
      })),
    };

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[AutoCleanup] Error:', error);
    
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
