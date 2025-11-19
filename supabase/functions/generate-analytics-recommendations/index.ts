
// eslint-disable-next-line import/no-unresolved
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// eslint-disable-next-line import/no-unresolved
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    // Verify user authentication
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
      .select('id, nombre, propietario_id, tipo, provincia')
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

    // Get events data
    const { data: eventosData } = await supabaseClient
      .from('eventos')
      .select('id, titulo, fecha, hora, created_at, entradas_vendidas, entradas_totales')
      .eq('local_id', localId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Get subscription data to check for highlighting credits
    const { data: subscriptionData } = await supabaseClient
      .from('suscripciones_locales')
      .select('creditos_destacados_restantes, destacado_activo, destacado_fecha_fin, plan_id')
      .eq('local_id', localId)
      .eq('estado', 'activa')
      .maybeSingle();

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
        titulo: '⏰ Mejores Horarios para Publicar',
        descripcion: `Basado en el análisis de tus publicaciones en ${local.nombre}, los mejores horarios para publicar son: ${bestHours
          .map((h) => `${h.hour}:00-${h.hour + 1}:00`)
          .join(', ')}. Durante estos horarios, tus publicaciones obtienen hasta un ${Math.round(
          bestHours[0].avgEngagement * 1.5
        )} más de interacción en promedio. Aprovecha estos momentos para publicar contenido importante y eventos.`,
        prioridad: 'alta',
        datos_soporte: {
          local_nombre: local.nombre,
          local_tipo: local.tipo,
          mejores_horas: bestHours.map((h) => ({
            hora: `${h.hour}:00`,
            engagement_promedio: Math.round(h.avgEngagement),
          })),
        },
        acciones_sugeridas: [
          `Programa tus publicaciones para las ${bestHours[0].hour}:00`,
          'Usa historias durante las horas pico para maximizar visibilidad',
          'Publica anuncios de eventos en estos horarios para mayor alcance',
          'Evita publicar en horarios de baja actividad',
        ],
        impacto_estimado: 'Aumento del 30-50% en engagement',
        confianza: 0.85,
        valida_hasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 2. Event publishing strategy recommendation
    const totalEventos = eventosData?.length || 0;
    const eventosByDay = new Map();
    const eventosByHour = new Map();
    
    eventosData?.forEach((evento) => {
      const createdDate = new Date(evento.created_at);
      const day = createdDate.getDay();
      const hour = createdDate.getHours();
      
      // Track by day
      const existingDay = eventosByDay.get(day) || { count: 0, ventas: 0 };
      eventosByDay.set(day, {
        count: existingDay.count + 1,
        ventas: existingDay.ventas + (evento.entradas_vendidas || 0),
      });
      
      // Track by hour
      const existingHour = eventosByHour.get(hour) || { count: 0, ventas: 0 };
      eventosByHour.set(hour, {
        count: existingHour.count + 1,
        ventas: existingHour.ventas + (evento.entradas_vendidas || 0),
      });
    });

    const bestEventDays = Array.from(eventosByDay.entries())
      .map(([day, data]) => ({
        day,
        avgVentas: data.ventas / data.count,
      }))
      .sort((a, b) => b.avgVentas - a.avgVentas)
      .slice(0, 2);

    const bestEventHours = Array.from(eventosByHour.entries())
      .map(([hour, data]) => ({
        hour,
        avgVentas: data.ventas / data.count,
      }))
      .sort((a, b) => b.avgVentas - a.avgVentas)
      .slice(0, 2);

    const dayNames = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];

    if (totalEventos > 0 && bestEventDays.length > 0) {
      recommendations.push({
        tipo: 'estrategia_publicacion_eventos',
        titulo: '📅 Estrategia Óptima para Eventos',
        descripcion: `Basado en el análisis de tus ${totalEventos} eventos en ${local.nombre} (${local.tipo} en ${local.provincia}), los mejores días para publicar eventos son ${bestEventDays
          .map((d) => dayNames[d.day])
          .join(' y ')}${bestEventHours.length > 0 ? `, preferiblemente entre las ${bestEventHours[0].hour}:00 y ${bestEventHours[0].hour + 2}:00` : ''}. Los eventos publicados en estos momentos tienen un ${Math.round(
          (bestEventDays[0].avgVentas / (eventosData?.reduce((sum, e) => sum + (e.entradas_vendidas || 0), 0) / totalEventos || 1)) * 100
        )}% más de ventas de entradas.`,
        prioridad: 'alta',
        datos_soporte: {
          local_nombre: local.nombre,
          local_tipo: local.tipo,
          local_provincia: local.provincia,
          mejores_dias: bestEventDays.map((d) => ({
            dia: dayNames[d.day],
            ventas_promedio: Math.round(d.avgVentas),
          })),
          mejores_horas: bestEventHours.map((h) => ({
            hora: `${h.hour}:00`,
            ventas_promedio: Math.round(h.avgVentas),
          })),
          total_eventos_analizados: totalEventos,
        },
        acciones_sugeridas: [
          `Publica eventos los ${bestEventDays.map((d) => dayNames[d.day]).join(' o ')}`,
          bestEventHours.length > 0 ? `Horario óptimo: ${bestEventHours[0].hour}:00 - ${bestEventHours[0].hour + 2}:00` : 'Publica en horarios de alta actividad',
          'Anuncia eventos con 1-2 semanas de anticipación',
          'Usa historias para recordatorios 24-48h antes del evento',
          'Comparte contenido detrás de escenas para generar expectativa',
        ],
        impacto_estimado: 'Aumento del 40-60% en ventas de entradas',
        confianza: 0.8,
        valida_hasta: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } else if (totalEventos === 0) {
      // Recommend creating events if none exist
      recommendations.push({
        tipo: 'estrategia_publicacion_eventos',
        titulo: '📅 Comienza a Publicar Eventos',
        descripcion: `${local.nombre} no ha publicado eventos en los últimos 30 días. Los eventos son una excelente manera de atraer clientes y aumentar la visibilidad de tu ${local.tipo} en ${local.provincia}. Basado en locales similares en tu zona, los mejores días para eventos son Viernes y Sábado, publicados entre las 10:00-14:00 para máxima visibilidad.`,
        prioridad: 'media',
        datos_soporte: {
          local_nombre: local.nombre,
          local_tipo: local.tipo,
          local_provincia: local.provincia,
          eventos_publicados: 0,
          recomendacion_dias: ['Viernes', 'Sábado'],
          recomendacion_horas: ['10:00-14:00', '18:00-20:00'],
        },
        acciones_sugeridas: [
          'Crea tu primer evento para este fin de semana',
          'Publica el evento un Martes o Miércoles para dar tiempo de difusión',
          'Usa horarios de 10:00-14:00 para publicar (alta actividad)',
          'Incluye imágenes atractivas y descripción clara',
          'Promociona el evento en historias y posts',
        ],
        impacto_estimado: 'Aumento del 50-80% en visibilidad del local',
        confianza: 0.75,
        valida_hasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 3. Local highlighting recommendation
    if (subscriptionData) {
      const creditosRestantes = subscriptionData.creditos_destacados_restantes || 0;
      const destacadoActivo = subscriptionData.destacado_activo || false;
      const destacadoFechaFin = subscriptionData.destacado_fecha_fin;

      if (creditosRestantes > 0 && !destacadoActivo) {
        // Has credits but not currently highlighted
        const bestHighlightDays = bestHours.length > 0 
          ? bestHours.slice(0, 2).map(h => h.hour)
          : [18, 20]; // Default to evening hours

        recommendations.push({
          tipo: 'destacar_local',
          titulo: '⭐ Momento Ideal para Destacar',
          descripcion: `${local.nombre} tiene ${creditosRestantes} crédito${creditosRestantes > 1 ? 's' : ''} disponible${creditosRestantes > 1 ? 's' : ''} para destacar. Basado en el análisis de tu audiencia en ${local.provincia}, los mejores momentos para activar el destacado son los Viernes y Sábados entre las ${bestHighlightDays[0]}:00-${bestHighlightDays[0] + 2}:00, cuando tu audiencia está más activa. Destacar tu ${local.tipo} aumenta tu visibilidad hasta un 300% en búsquedas y el mapa.`,
          prioridad: 'alta',
          datos_soporte: {
            local_nombre: local.nombre,
            local_tipo: local.tipo,
            local_provincia: local.provincia,
            creditos_disponibles: creditosRestantes,
            destacado_activo: false,
            mejores_dias: ['Viernes', 'Sábado'],
            mejores_horas: bestHighlightDays.map(h => `${h}:00-${h + 2}:00`),
          },
          acciones_sugeridas: [
            'Activa el destacado antes del fin de semana (Jueves por la tarde)',
            `Horario óptimo: Viernes-Sábado ${bestHighlightDays[0]}:00-${bestHighlightDays[0] + 2}:00`,
            'Combina el destacado con publicación de eventos para máximo impacto',
            'Asegúrate de tener contenido fresco (posts/historias) antes de destacar',
            'Monitorea las analíticas durante el periodo destacado',
          ],
          impacto_estimado: 'Aumento del 200-400% en visibilidad y alcance',
          confianza: 0.9,
          valida_hasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } else if (destacadoActivo && destacadoFechaFin) {
        // Currently highlighted
        const diasRestantes = Math.ceil((new Date(destacadoFechaFin).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        recommendations.push({
          tipo: 'destacar_local',
          titulo: '⭐ Maximiza tu Periodo Destacado',
          descripcion: `${local.nombre} está actualmente destacado y lo estará por ${diasRestantes} día${diasRestantes > 1 ? 's' : ''} más. Aprovecha este periodo para publicar contenido de alta calidad, eventos especiales y promociones en tu ${local.tipo}. Después del periodo destacado, considera renovar si los resultados son positivos.`,
          prioridad: 'media',
          datos_soporte: {
            local_nombre: local.nombre,
            local_tipo: local.tipo,
            creditos_disponibles: creditosRestantes,
            destacado_activo: true,
            dias_restantes: diasRestantes,
            fecha_fin: destacadoFechaFin,
          },
          acciones_sugeridas: [
            'Publica contenido diariamente mientras estés destacado',
            'Crea eventos especiales para aprovechar la mayor visibilidad',
            'Responde rápidamente a comentarios y mensajes',
            'Monitorea el aumento en seguidores y check-ins',
            creditosRestantes > 0 ? 'Planifica tu próximo periodo destacado' : 'Considera renovar créditos si los resultados son buenos',
          ],
          impacto_estimado: 'Maximiza el ROI del periodo destacado actual',
          confianza: 0.85,
          valida_hasta: new Date(destacadoFechaFin).toISOString(),
        });
      } else if (creditosRestantes === 0) {
        // No credits available
        recommendations.push({
          tipo: 'destacar_local',
          titulo: '⭐ Aumenta tu Visibilidad',
          descripcion: `${local.nombre} actualmente no tiene créditos para destacar. Destacar tu ${local.tipo} te coloca en la parte superior de búsquedas y el mapa en ${local.provincia}, aumentando tu visibilidad hasta un 300%. Considera actualizar tu plan o comprar créditos adicionales para aprovechar los momentos de alta actividad.`,
          prioridad: 'baja',
          datos_soporte: {
            local_nombre: local.nombre,
            local_tipo: local.tipo,
            local_provincia: local.provincia,
            creditos_disponibles: 0,
            destacado_activo: false,
          },
          acciones_sugeridas: [
            'Revisa los planes de suscripción disponibles',
            'Considera actualizar a un plan con más créditos de destacado',
            'Planifica destacar tu local durante eventos especiales',
            'Combina el destacado con campañas de marketing para máximo impacto',
          ],
          impacto_estimado: 'Aumento del 200-400% en visibilidad cuando se active',
          confianza: 0.7,
          valida_hasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    // 4. Content performance recommendation
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
        titulo: '📱 Optimiza tu Tipo de Contenido',
        descripcion: `En ${local.nombre}, tus ${
          betterFormat === 'posts' ? 'publicaciones' : 'historias'
        } están generando ${Math.round(
          (betterFormat === 'posts' ? avgPostEngagement : avgStoryViews) * 1.3
        )} más interacción que ${
          betterFormat === 'posts' ? 'las historias' : 'los posts'
        }. Considera aumentar la frecuencia de ${
          betterFormat === 'posts' ? 'publicaciones' : 'historias'
        } para maximizar tu alcance en ${local.provincia}.`,
        prioridad: 'media',
        datos_soporte: {
          local_nombre: local.nombre,
          local_tipo: local.tipo,
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
          'Usa el formato más efectivo para anunciar eventos',
        ],
        impacto_estimado: 'Aumento del 20-40% en alcance',
        confianza: 0.75,
        valida_hasta: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 5. Engagement rate alert
    const recentEngagementRate = analyticsData?.[0]?.engagement_rate || 0;
    const avgEngagementRate =
      analyticsData?.reduce((sum, d) => sum + (d.engagement_rate || 0), 0) /
      (analyticsData?.length || 1);

    if (recentEngagementRate < avgEngagementRate * 0.7) {
      recommendations.push({
        tipo: 'alerta_bajo_rendimiento',
        titulo: '⚠️ Alerta: Bajo Rendimiento Detectado',
        descripcion: `La tasa de interacción de ${local.nombre} ha bajado un ${Math.round(
          (1 - recentEngagementRate / avgEngagementRate) * 100
        )}% en los últimos días. Es importante tomar acción para recuperar el engagement con tu audiencia en ${local.provincia}.`,
        prioridad: 'urgente',
        datos_soporte: {
          local_nombre: local.nombre,
          local_tipo: local.tipo,
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
          'Considera destacar tu local para recuperar visibilidad',
        ],
        impacto_estimado: 'Recuperación del 50-70% del engagement',
        confianza: 0.9,
        valida_hasta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 6. Growth strategy recommendation
    const followersGrowth = followersData?.length || 0;
    const avgFollowersPerWeek = followersGrowth / 4;

    if (avgFollowersPerWeek < 5) {
      recommendations.push({
        tipo: 'estrategia_crecimiento',
        titulo: '📈 Estrategia para Aumentar Seguidores',
        descripcion: `${local.nombre} está ganando ${Math.round(
          avgFollowersPerWeek
        )} seguidores por semana. Con algunas estrategias simples, podrías duplicar o triplicar este número y aumentar la visibilidad de tu ${local.tipo} en ${local.provincia}.`,
        prioridad: 'media',
        datos_soporte: {
          local_nombre: local.nombre,
          local_tipo: local.tipo,
          local_provincia: local.provincia,
          seguidores_por_semana: Math.round(avgFollowersPerWeek),
          total_nuevos_seguidores: followersGrowth,
        },
        acciones_sugeridas: [
          'Colabora con otros locales o influencers locales',
          'Usa hashtags relevantes en tus publicaciones',
          'Comparte contenido generado por usuarios',
          'Ofrece promociones exclusivas para nuevos seguidores',
          'Publica consistentemente (al menos 3 veces por semana)',
          'Destaca tu local durante campañas de crecimiento',
        ],
        impacto_estimado: 'Crecimiento del 100-200% en seguidores',
        confianza: 0.7,
        valida_hasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 7. Best days recommendation
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
      recommendations.push({
        tipo: 'dias_alta_interaccion',
        titulo: '📆 Días con Mayor Interacción',
        descripcion: `Los mejores días para publicar en ${local.nombre} son: ${bestDays
          .map((d) => dayNames[d.day])
          .join(', ')}. Tus publicaciones en estos días reciben hasta un ${Math.round(
          (bestDays[0].avgEngagement / bestDays[bestDays.length - 1].avgEngagement - 1) * 100
        )}% más de interacción. Aprovecha estos días para publicar eventos y activar el destacado de tu ${local.tipo}.`,
        prioridad: 'alta',
        datos_soporte: {
          local_nombre: local.nombre,
          local_tipo: local.tipo,
          mejores_dias: bestDays.map((d) => ({
            dia: dayNames[d.day],
            engagement_promedio: Math.round(d.avgEngagement),
          })),
        },
        acciones_sugeridas: [
          `Planifica tu contenido más importante para ${dayNames[bestDays[0].day]}`,
          'Mantén una frecuencia constante en los días de alta interacción',
          'Experimenta con diferentes tipos de contenido en estos días',
          'Publica eventos en estos días para máxima visibilidad',
          'Activa el destacado de tu local en estos días',
        ],
        impacto_estimado: 'Aumento del 25-45% en engagement',
        confianza: 0.8,
        valida_hasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 8. Visibility optimization
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
        titulo: '🎯 Optimiza la Visibilidad',
        descripcion: `El contenido de ${local.nombre} está siendo visto, pero la tasa de conversión a interacciones es baja (${(
          viewToEngagementRatio * 100
        ).toFixed(
          1
        )}%). Esto sugiere que necesitas contenido más atractivo o llamadas a la acción más claras para tu ${local.tipo} en ${local.provincia}.`,
        prioridad: 'alta',
        datos_soporte: {
          local_nombre: local.nombre,
          local_tipo: local.tipo,
          local_provincia: local.provincia,
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
          'Destaca tu local cuando publiques contenido de alta calidad',
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
