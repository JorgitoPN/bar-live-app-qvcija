
/**
 * Text Parser Utility
 * Detects and formats hashtags and mentions in social media text
 */

export interface ParsedSegment {
  type: 'text' | 'hashtag' | 'mention';
  content: string;
  value?: string; // The actual hashtag/mention without the # or @
}

/**
 * Parse text to detect hashtags (#) and mentions (@)
 * Returns an array of segments with their types
 */
export function parseText(text: string): ParsedSegment[] {
  if (!text) return [];

  const segments: ParsedSegment[] = [];
  // Regex to match hashtags and mentions
  // Hashtags: # followed by alphanumeric characters and underscores
  // Mentions: @ followed by alphanumeric characters and underscores
  const regex = /(#[a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]+)|(@[a-zA-Z0-9_]+)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    // Add the hashtag or mention
    const fullMatch = match[0];
    if (fullMatch.startsWith('#')) {
      segments.push({
        type: 'hashtag',
        content: fullMatch,
        value: fullMatch.substring(1), // Remove the #
      });
    } else if (fullMatch.startsWith('@')) {
      segments.push({
        type: 'mention',
        content: fullMatch,
        value: fullMatch.substring(1), // Remove the @
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return segments;
}

/**
 * Extract all hashtags from text
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  
  const regex = /#[a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]+/g;
  const matches = text.match(regex);
  
  if (!matches) return [];
  
  // Remove # and convert to lowercase for consistency
  return matches.map(tag => tag.substring(1).toLowerCase());
}

/**
 * Extract all mentions from text
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  
  const regex = /@[a-zA-Z0-9_]+/g;
  const matches = text.match(regex);
  
  if (!matches) return [];
  
  // Remove @ and convert to lowercase for consistency
  return matches.map(mention => mention.substring(1).toLowerCase());
}

/**
 * Search for users by username (for mention autocomplete)
 */
export async function searchUsersForMention(query: string, supabase: any): Promise<Array<{
  id: string;
  username: string;
  nombre: string;
  avatar?: string;
}>> {
  if (!query || query.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, username, nombre, avatar')
      .ilike('username', `%${query}%`)
      .eq('activo', true)
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[TextParser] Error searching users:', error);
    return [];
  }
}

/**
 * Search for locals by name (for mention autocomplete)
 */
export async function searchLocalsForMention(query: string, supabase: any): Promise<Array<{
  id: string;
  nombre: string;
  imagen_url?: string;
  tipo: string;
}>> {
  if (!query || query.length < 2) return [];

  try {
    // Search locals with active subscriptions (Estándar or Premium)
    const { data: localsWithSubs, error } = await supabase
      .from('locales')
      .select(`
        id,
        nombre,
        imagen_url,
        tipo,
        suscripciones_locales!suscripciones_locales_local_id_fkey(
          estado,
          plan_id,
          planes_suscripcion!suscripciones_locales_plan_id_fkey(
            nombre
          )
        )
      `)
      .ilike('nombre', `%${query}%`)
      .eq('activo', true)
      .limit(10);

    if (error) throw error;

    // Filter to only include locals with active Estándar or Premium plans
    const filteredLocals = localsWithSubs?.filter((local: any) => {
      const subscription = local.suscripciones_locales;
      if (!subscription || subscription.estado !== 'activa') {
        return false;
      }
      const planName = subscription.planes_suscripcion?.nombre;
      return planName === 'estandar' || planName === 'premium';
    }) || [];

    return filteredLocals.map((local: any) => ({
      id: local.id,
      nombre: local.nombre,
      imagen_url: local.imagen_url,
      tipo: local.tipo,
    }));
  } catch (error) {
    console.error('[TextParser] Error searching locals:', error);
    return [];
  }
}
