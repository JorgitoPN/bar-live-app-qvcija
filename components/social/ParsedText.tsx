
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { parseText, ParsedSegment } from '@/utils/textParser';
import { supabase } from '@/utils/supabase';

interface ParsedTextProps {
  text: string;
  style?: any;
  onHashtagPress?: (hashtag: string) => void;
  onMentionPress?: (mention: string) => void;
}

export default function ParsedText({ text, style, onHashtagPress, onMentionPress }: ParsedTextProps) {
  const router = useRouter();
  const segments = parseText(text);

  const handleHashtagPress = (hashtag: string) => {
    console.log('[ParsedText] Hashtag pressed:', hashtag);
    if (onHashtagPress) {
      onHashtagPress(hashtag);
    } else {
      // Default: navigate to hashtag search page
      router.push(`/social/hashtag?tag=${encodeURIComponent(hashtag)}`);
    }
  };

  const handleMentionPress = async (mention: string) => {
    console.log('[ParsedText] Mention pressed:', mention);
    if (onMentionPress) {
      onMentionPress(mention);
      return;
    }

    // Default: try to find and navigate to user or local profile
    try {
      // First, try to find user by username
      const { data: user } = await supabase
        .from('usuarios')
        .select('id')
        .eq('username', mention)
        .eq('activo', true)
        .single();

      if (user) {
        console.log('[ParsedText] Found user, navigating to profile:', user.id);
        router.push(`/perfil/usuario?userId=${user.id}`);
        return;
      }

      // If not found as user, try to find local by name
      const { data: localsWithSubs } = await supabase
        .from('locales')
        .select(`
          id,
          nombre,
          suscripciones_locales!suscripciones_locales_local_id_fkey(
            estado,
            plan_id,
            planes_suscripcion!suscripciones_locales_plan_id_fkey(
              nombre
            )
          )
        `)
        .ilike('nombre', mention)
        .eq('activo', true)
        .limit(1);

      if (localsWithSubs && localsWithSubs.length > 0) {
        const local = localsWithSubs[0];
        const subscription = local.suscripciones_locales;
        
        // Only navigate to locals with active Estándar or Premium plans
        if (subscription && subscription.estado === 'activa') {
          const planName = subscription.planes_suscripcion?.nombre;
          if (planName === 'estandar' || planName === 'premium') {
            console.log('[ParsedText] Found local, navigating to profile:', local.id);
            router.push(`/perfil/local?localId=${local.id}`);
            return;
          }
        }
      }

      console.log('[ParsedText] User/local not found for mention:', mention);
    } catch (error) {
      console.error('[ParsedText] Error finding mentioned user/local:', error);
    }
  };

  return (
    <Text style={style}>
      {segments.map((segment: ParsedSegment, index: number) => {
        if (segment.type === 'hashtag') {
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleHashtagPress(segment.value!)}
              activeOpacity={0.7}
            >
              <Text style={[style, styles.hashtag]}>{segment.content}</Text>
            </TouchableOpacity>
          );
        } else if (segment.type === 'mention') {
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleMentionPress(segment.value!)}
              activeOpacity={0.7}
            >
              <Text style={[style, styles.mention]}>{segment.content}</Text>
            </TouchableOpacity>
          );
        } else {
          return <Text key={index}>{segment.content}</Text>;
        }
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  hashtag: {
    color: colors.primary,
    fontWeight: '600',
  },
  mention: {
    color: colors.secondary,
    fontWeight: '600',
  },
});
