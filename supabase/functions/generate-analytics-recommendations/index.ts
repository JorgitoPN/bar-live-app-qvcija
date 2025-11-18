
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[AI Recommendations] Request received');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[AI Recommendations] No authorization header');
      throw new Error('Missing authorization header');
    }

    console.log('[AI Recommendations] Authorization header present');

    // Create Supabase client with the user's JWT token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Get request body
    const { localId } = await req.json();
    if (!localId) {
      throw new Error('localId is required');
    }

    console.log('[AI Recommendations] Generating for local:', localId);

    // Verify user authentication - FIXED: Use getUser() without parameter
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error('[AI Recommendations] Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!user) {
      console.error('[AI Recommendations] No user found');
      throw new Error('Authentication failed: No user session found');
    }

    console.log('[AI Recommendations] User authenticated:', user.id);

    // Verify local ownership
    const { data: local, error: localError } = await supabaseClient
      .from('locales')
      .select('id, nombre, propietario_id')
      .eq('id', localId)
      .single();

    if (localError) {
      console.error('[AI Recommendations] Local query error:', localError);
      throw new Error(`Failed to fetch local: ${localError.message}`);
    }

    if (!local) {
      throw new Error('Local not found');
    }

    if (local.propietario_id !== user.id) {
      console.error('[AI Recommendations] Ownership mismatch:', {
        local_owner: local.propietario_id,
        user_id: user.id,
      });
      throw new Error('You do not own this local');
    }

    console.log('[AI Recommendations] Ownership verified');

    // Get analytics data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: analyticsData, error: analyticsError } = await supabaseClient
      .from('analytics_data')
      .select('*')
      .eq('local_id', localId)
      .gte('fecha', thirtyDaysAgo.toISOString().split('T')[0])
      .order('fecha', { ascending: false });

    if (analyticsError) {
      console.error('[AI Recommendations] Error fetching analytics:', analyticsError);
    }

    // Get posts data
    const { data: postsData } = await supabaseClient
      .from('posts')
      .select('id, likes, comentarios, created_at, contenido')
      .eq('local_id', localId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Get stories data
    const { data: storiesData } = await supabaseClient
      .from('historias')
      .select('id, created_at')
      .eq('local_id', localId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get story views
    const { data: storyViewsData } = await supabaseClient
      .from('historia_views')
      .select('historia_id, viewed_at')
      .in(
        'historia_id',
        storiesData?.map((s) => s.id) || []
      );

    // Get followers growth
    const { data: followersData } = await supabaseClient
      .from('seguidores')
      .select('created_at')
      .eq('seguido_id', localId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Generate recommendations
    const recommendations = [];

    // 1. Best posting times recommendation
    const postsByHour = new Map();
    postsData?.forEach((post) => {
      const hour = new Date(post.created_at).getHours();
      const engagement = (post.likes || 0) + (post.comentarios || 0);
      const existing = postsByHour.get(hour) || { count: 0, engagement: 0 };
      postsByHour.set(hour, {
        count: existing.count + 1,
        engagement: existing.engagement + engagement,
      });
    });

    const bestHours = Array.from(postsByHour.entries())
      .map(([hour, data]) => ({
        hour,
        avgEngagement: data.engagement / data.count,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 3);

    if (bestHours.length > 0) {
      recommendations.push({
        tipo: 'mejor_horario_publicacion',
        titulo: 'Mejores Horarios para Publicar',
        descripcion: `Basado en el análisis de tus publicaciones, los mejores horarios para publicar son: ${bestHours
          .map((h) => `${h.hour}:00-${h.hour + 1}:00`)
          .join(', ')}. Durante estos horarios, tus publicaciones obtienen un ${Math.round(
          bestHours[0].avgEngagement * 1.5
        )} más de interacción en promedio.`,
        prioridad: 'alta',
        datos_soporte: {
          mejores_horas: bestHours.map((h) => ({
            hora: `${h.hour}:00`,
            engagement_promedio: Math.round(h.avgEngagement),
          })),
        },
        acciones_sugeridas: [
          `Programa tus publicaciones para las ${bestHours[0].hour}:00`,
          'Usa historias durante las horas pico para maximizar visibilidad',
          'Evita publicar en horarios de baja actividad',
        ],
        impacto_estimado: 'Aumento del 30-50% en engagement',
        confianza: 0.85,
        valida_hasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 2. Content performance recommendation
    const totalPosts = postsData?.length || 0;
    const totalStories = storiesData?.length || 0;
    const avgPostEngagement =
      postsData?.reduce((sum, p) => sum + (p.likes || 0) + (p.comentarios || 0), 0) /
      (totalPosts || 1);
    const avgStoryViews = (storyViewsData?.length || 0) / (totalStories || 1);

    if (totalPosts > 5 && totalStories > 5) {
      const betterFormat = avgPostEngagement > avgStoryViews ? 'posts' : 'historias';
      recommendations.push({
        tipo: 'tipo_contenido',
        titulo: 'Optimiza tu Tipo de Contenido',
        descripcion: `Tus ${
          betterFormat === 'posts' ? 'publicaciones' : 'historias'
        } están generando ${Math.round(
          (betterFormat === 'posts' ? avgPostEngagement : avgStoryViews) * 1.3
        )} más interacción que ${
          betterFormat === 'posts' ? 'las historias' : 'los posts'
        }. Considera aumentar la frecuencia de ${
          betterFormat === 'posts' ? 'publicaciones' : 'historias'
        } para maximizar tu alcance.`,
        prioridad: 'media',
        datos_soporte: {
          posts: {
            total: totalPosts,
            engagement_promedio: Math.round(avgPostEngagement),
          },
          historias: {
            total: totalStories,
            vistas_promedio: Math.round(avgStoryViews),
          },
        },
        acciones_sugeridas: [
          `Publica ${betterFormat === 'posts' ? '3-4 posts' : '5-7 historias'} por semana`,
          'Experimenta con diferentes formatos de contenido',
          'Analiza qué tipo de contenido genera más comentarios',
        ],
        impacto_estimado: 'Aumento del 20-40% en alcance',
        confianza: 0.75,
        valida_hasta: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 3. Engagement rate alert
    const recentEngagementRate = analyticsData?.[0]?.engagement_rate || 0;
    const avgEngagementRate =
      analyticsData?.reduce((sum, d) => sum + (d.engagement_rate || 0), 0) /
      (analyticsData?.length || 1);

    if (recentEngagementRate < avgEngagementRate * 0.7) {
      recommendations.push({
        tipo: 'alerta_bajo_rendimiento',
        titulo: '⚠️ Alerta: Bajo Rendimiento Detectado',
        descripcion: `Tu tasa de interacción ha bajado un ${Math.round(
          (1 - recentEngagementRate / avgEngagementRate) * 100
        )}% en los últimos días. Es importante tomar acción para recuperar el engagement con tu audiencia.`,
        prioridad: 'urgente',
        datos_soporte: {
          engagement_actual: recentEngagementRate.toFixed(2),
          engagement_promedio: avgEngagementRate.toFixed(2),
          diferencia_porcentual: Math.round(
            (1 - recentEngagementRate / avgEngagementRate) * 100
          ),
        },
        acciones_sugeridas: [
          'Publica contenido más interactivo (encuestas, preguntas)',
          'Responde a todos los comentarios para fomentar conversación',
          'Comparte contenido detrás de escenas de tu local',
          'Organiza un evento o promoción especial',
        ],
        impacto_estimado: 'Recuperación del 50-70% del engagement',
        confianza: 0.9,
        valida_hasta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 4. Growth strategy recommendation
    const followersGrowth = followersData?.length || 0;
    const avgFollowersPerWeek = followersGrowth / 4;

    if (avgFollowersPerWeek < 5) {
      recommendations.push({
        tipo: 'estrategia_crecimiento',
        titulo: 'Estrategia para Aumentar Seguidores',
        descripcion: `Actualmente estás ganando ${Math.round(
          avgFollowersPerWeek
        )} seguidores por semana. Con algunas estrategias simples, podrías duplicar o triplicar este número.`,
        prioridad: 'media',
        datos_soporte: {
          seguidores_por_semana: Math.round(avgFollowersPerWeek),
          total_nuevos_seguidores: followersGrowth,
        },
        acciones_sugeridas: [
          'Colabora con otros locales o influencers locales',
          'Usa hashtags relevantes en tus publicaciones',
          'Comparte contenido generado por usuarios',
          'Ofrece promociones exclusivas para nuevos seguidores',
          'Publica consistentemente (al menos 3 veces por semana)',
        ],
        impacto_estimado: 'Crecimiento del 100-200% en seguidores',
        confianza: 0.7,
        valida_hasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 5. Best days recommendation
    const postsByDay = new Map();
    postsData?.forEach((post) => {
      const day = new Date(post.created_at).getDay();
      const engagement = (post.likes || 0) + (post.comentarios || 0);
      const existing = postsByDay.get(day) || { count: 0, engagement: 0 };
      postsByDay.set(day, {
        count: existing.count + 1,
        engagement: existing.engagement + engagement,
      });
    });

    const bestDays = Array.from(postsByDay.entries())
      .map(([day, data]) => ({
        day,
        avgEngagement: data.engagement / data.count,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 3);

    if (bestDays.length > 0) {
      const dayNames = [
        'Domingo',
        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado',
      ];
      recommendations.push({
        tipo: 'dias_alta_interaccion',
        titulo: 'Días con Mayor Interacción',
        descripcion: `Los mejores días para publicar son: ${bestDays
          .map((d) => dayNames[d.day])
          .join(', ')}. Tus publicaciones en estos días reciben hasta un ${Math.round(
          (bestDays[0].avgEngagement / bestDays[bestDays.length - 1].avgEngagement - 1) * 100
        )}% más de interacción.`,
        prioridad: 'alta',
        datos_soporte: {
          mejores_dias: bestDays.map((d) => ({
            dia: dayNames[d.day],
            engagement_promedio: Math.round(d.avgEngagement),
          })),
        },
        acciones_sugeridas: [
          `Planifica tu contenido más importante para ${dayNames[bestDays[0].day]}`,
          'Mantén una frecuencia constante en los días de alta interacción',
          'Experimenta con diferentes tipos de contenido en estos días',
        ],
        impacto_estimado: 'Aumento del 25-45% en engagement',
        confianza: 0.8,
        valida_hasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 6. Visibility optimization
    const totalViews =
      analyticsData?.reduce((sum, d) => sum + (d.total_views || 0), 0) || 0;
    const totalEngagement =
      analyticsData?.reduce(
        (sum, d) => sum + (d.total_likes || 0) + (d.total_comments || 0),
        0
      ) || 0;
    const viewToEngagementRatio = totalEngagement / (totalViews || 1);

    if (viewToEngagementRatio < 0.05) {
      recommendations.push({
        tipo: 'optimizacion_visibilidad',
        titulo: 'Optimiza la Visibilidad de tu Local',
        descripcion: `Tu contenido está siendo visto, pero la tasa de conversión a interacciones es baja (${(
          viewToEngagementRatio * 100
        ).toFixed(
          1
        )}%). Esto sugiere que necesitas contenido más atractivo o llamadas a la acción más claras.`,
        prioridad: 'alta',
        datos_soporte: {
          total_vistas: totalViews,
          total_interacciones: totalEngagement,
          tasa_conversion: (viewToEngagementRatio * 100).toFixed(2) + '%',
        },
        acciones_sugeridas: [
          'Incluye llamadas a la acción claras en tus publicaciones',
          'Usa preguntas para fomentar comentarios',
          'Comparte contenido que invite a la participación',
          'Mejora la calidad visual de tus publicaciones',
          'Cuenta historias que conecten emocionalmente',
        ],
        impacto_estimado: 'Aumento del 40-60% en tasa de conversión',
        confianza: 0.75,
        valida_hasta: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Delete old recommendations
    await supabaseClient
      .from('ai_recommendations')
      .delete()
      .eq('local_id', localId)
      .eq('estado', 'activa');

    // Insert new recommendations
    if (recommendations.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('ai_recommendations')
        .insert(
          recommendations.map((rec) => ({
            local_id: localId,
            estado: 'activa',
            ...rec,
          }))
        );

      if (insertError) {
        console.error('[AI Recommendations] Error inserting:', insertError);
        throw insertError;
      }
    }

    console.log(
      `[AI Recommendations] Generated ${recommendations.length} recommendations for local ${localId}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        recommendations,
        count: recommendations.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[AI Recommendations] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});
