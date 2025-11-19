
import { supabase } from './supabase';

export type ActivityType =
  | 'view_post'
  | 'like_post'
  | 'comment_post'
  | 'save_post'
  | 'view_story'
  | 'follow_user'
  | 'search'
  | 'view_local'
  | 'view_event'
  | 'ad_click'
  | 'ad_view'
  | 'profile_view'
  | 'map_view'
  | 'map_interaction'
  | 'search_appearance'
  | 'event_interaction';

export type EntityType = 'post' | 'story' | 'user' | 'local' | 'event' | 'ad';

interface TrackActivityParams {
  usuarioId: string;
  tipoActividad: ActivityType;
  entidadId?: string;
  entidadTipo?: EntityType;
  duracionSegundos?: number;
  metadata?: Record<string, any>;
}

/**
 * Track user activity for ad personalization and analytics
 */
export async function trackActivity({
  usuarioId,
  tipoActividad,
  entidadId,
  entidadTipo,
  duracionSegundos,
  metadata,
}: TrackActivityParams): Promise<void> {
  try {
    const { error } = await supabase.rpc('track_user_activity', {
      p_usuario_id: usuarioId,
      p_tipo_actividad: tipoActividad,
      p_entidad_id: entidadId || null,
      p_entidad_tipo: entidadTipo || null,
      p_duracion_segundos: duracionSegundos || null,
      p_metadata: metadata || null,
    });

    if (error) {
      console.error('Error tracking activity:', error);
    }
  } catch (error) {
    console.error('Error tracking activity:', error);
  }
}

/**
 * Track profile view in Explore page
 */
export async function trackProfileView(
  localId: string,
  usuarioId?: string,
  source: 'explore' | 'search' | 'map' | 'social' | 'direct' = 'explore'
): Promise<void> {
  try {
    const { error } = await supabase.from('profile_views').insert({
      local_id: localId,
      usuario_id: usuarioId || null,
      source,
    });

    if (error) {
      console.error('[ActivityTracker] Error tracking profile view:', error);
    } else {
      console.log('[ActivityTracker] ✅ Profile view tracked:', { localId, source });
    }
  } catch (error) {
    console.error('[ActivityTracker] Error tracking profile view:', error);
  }
}

/**
 * Track map interaction (view, click, zoom, pan)
 */
export async function trackMapInteraction(
  localId: string,
  interactionType: 'view' | 'click' | 'zoom' | 'pan',
  usuarioId?: string
): Promise<void> {
  try {
    const { error } = await supabase.from('map_interactions').insert({
      local_id: localId,
      usuario_id: usuarioId || null,
      interaction_type: interactionType,
    });

    if (error) {
      console.error('[ActivityTracker] Error tracking map interaction:', error);
    } else {
      console.log('[ActivityTracker] ✅ Map interaction tracked:', { localId, interactionType });
    }
  } catch (error) {
    console.error('[ActivityTracker] Error tracking map interaction:', error);
  }
}

/**
 * Track search appearance
 */
export async function trackSearchAppearance(
  localId: string,
  searchQuery: string,
  position: number,
  clicked: boolean = false,
  usuarioId?: string
): Promise<void> {
  try {
    const { error } = await supabase.from('search_results').insert({
      local_id: localId,
      usuario_id: usuarioId || null,
      search_query: searchQuery,
      position,
      clicked,
    });

    if (error) {
      console.error('[ActivityTracker] Error tracking search appearance:', error);
    } else {
      console.log('[ActivityTracker] ✅ Search appearance tracked:', { localId, searchQuery, position });
    }
  } catch (error) {
    console.error('[ActivityTracker] Error tracking search appearance:', error);
  }
}

/**
 * Track event interaction
 */
export async function trackEventInteraction(
  eventoId: string,
  localId: string,
  tipo: 'view' | 'click' | 'share' | 'save' | 'ticket_view' | 'attendance',
  usuarioId?: string
): Promise<void> {
  try {
    const { error } = await supabase.from('evento_interacciones').insert({
      evento_id: eventoId,
      local_id: localId,
      usuario_id: usuarioId || null,
      tipo,
    });

    if (error) {
      console.error('[ActivityTracker] Error tracking event interaction:', error);
    } else {
      console.log('[ActivityTracker] ✅ Event interaction tracked:', { eventoId, tipo });
    }
  } catch (error) {
    console.error('[ActivityTracker] Error tracking event interaction:', error);
  }
}

/**
 * Get user interests inferred from activity
 */
export async function getUserInterests(usuarioId: string) {
  try {
    const { data, error } = await supabase
      .from('user_interests')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('puntuacion', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user interests:', error);
    return [];
  }
}

/**
 * Get ad preferences for user
 */
export async function getAdPreferences(usuarioId: string) {
  try {
    const { data, error } = await supabase
      .from('ad_preferences')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Return default preferences if none exist
    return data || {
      personalizacion_activa: true,
      datos_terceros_activos: true,
      temas_bloqueados: [],
    };
  } catch (error) {
    console.error('Error getting ad preferences:', error);
    return {
      personalizacion_activa: true,
      datos_terceros_activos: true,
      temas_bloqueados: [],
    };
  }
}

/**
 * Update ad preferences for user
 */
export async function updateAdPreferences(
  usuarioId: string,
  preferences: {
    personalizacion_activa?: boolean;
    datos_terceros_activos?: boolean;
    temas_bloqueados?: string[];
  }
) {
  try {
    const { data, error } = await supabase
      .from('ad_preferences')
      .upsert({
        usuario_id: usuarioId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating ad preferences:', error);
    throw error;
  }
}

/**
 * Get recommended ads for user
 */
export async function getRecommendedAds(usuarioId: string, limit: number = 5) {
  try {
    const { data, error } = await supabase.rpc('get_recommended_ads', {
      p_usuario_id: usuarioId,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting recommended ads:', error);
    return [];
  }
}

/**
 * Track ad impression
 */
export async function trackAdImpression(adId: string, usuarioId: string) {
  try {
    // Increment ad impressions
    await supabase.rpc('increment', {
      table_name: 'ads',
      row_id: adId,
      column_name: 'impresiones',
    });

    // Track activity
    await trackActivity({
      usuarioId,
      tipoActividad: 'ad_view',
      entidadId: adId,
      entidadTipo: 'ad',
    });
  } catch (error) {
    console.error('Error tracking ad impression:', error);
  }
}

/**
 * Track ad click
 */
export async function trackAdClick(adId: string, usuarioId: string) {
  try {
    // Increment ad clicks
    await supabase.rpc('increment', {
      table_name: 'ads',
      row_id: adId,
      column_name: 'clics',
    });

    // Track activity
    await trackActivity({
      usuarioId,
      tipoActividad: 'ad_click',
      entidadId: adId,
      entidadTipo: 'ad',
    });
  } catch (error) {
    console.error('Error tracking ad click:', error);
  }
}
