
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { parseText, ParsedSegment } from '@/utils/textParser';
import { supabase } from '@/utils/supabase';

interface ParsedTextProps {
  text: string;
  style?: any;
  onHashtagPress?: (hashtag: string) => void;
  onMentionPress?: (mention: string) => void;
}

/**
 * ✅ PARSED TEXT v2.0 - FIXED USER REDIRECTION
 * 
 * Features:
 * - ✅ Parse hashtags and mentions
 * - ✅ Clickable hashtags navigate to hashtag page
 * - ✅ Clickable mentions navigate to user/local profiles
 * - ✅ FIXED: Redirect to own profile if user clicks on their own mention
 */

export default function ParsedText({ text, style, onHashtagPress, onMentionPress }: ParsedTextProps) {
  const router = useRouter();
  const { user } = useAuth();
  const segments = parseText(text);

  const handleHashtagPress = (hashtag: string) => {
    console.log('[ParsedText] Hashtag pressed:', hashtag);
    if (onHashtagPress) {
      onHashtagPress(hashtag);
    } else {
      router.push(`/social/hashtag?tag=${encodeURIComponent(hashtag)}`);
    }
  };

  const handleMentionPress = async (mention: string) => {
    console.log('[ParsedText v2.0] Mention pressed:', mention);
    if (onMentionPress) {
      onMentionPress(mention);
      return;
    }

    try {
      // ✅ First, check if it's a user
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id, username')
        .eq('username', mention)
        .eq('activo', true)
        .single();

      if (userData) {
        console.log('[ParsedText v2.0] Found user:', userData.id);
        
        // ✅ FIXED: Check if it's the current user
        if (user && userData.id === user.id) {
          console.log('[ParsedText v2.0] ✅ Navigating to own profile');
          router.push('/(tabs)/perfil');
        } else {
          console.log('[ParsedText v2.0] ✅ Navigating to other user profile');
          router.push(`/perfil/usuario?userId=${userData.id}`);
        }
        return;
      }

      // ✅ If not a user, check if it's a local with active subscription
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
        const subscription = local.suscripciones_locales as any;
        
        if (subscription && subscription.estado === 'activa') {
          const planName = subscription.planes_suscripcion?.nombre;
          if (planName === 'estandar' || planName === 'premium') {
            console.log('[ParsedText v2.0] ✅ Found local, navigating to profile:', local.id);
            router.push(`/perfil/local?localId=${local.id}`);
            return;
          }
        }
      }

      console.log('[ParsedText v2.0] ⚠️ User/local not found for mention:', mention);
    } catch (error) {
      console.error('[ParsedText v2.0] ❌ Error finding mentioned user/local:', error);
    }
  };

  return (
    <Text style={style}>
      {segments.map((segment: ParsedSegment, index: number) => {
        if (segment.type === 'hashtag') {
          return (
            <Text
              key={index}
              style={[style, styles.hashtag]}
              onPress={() => handleHashtagPress(segment.value!)}
            >
              {segment.content}
            </Text>
          );
        } else if (segment.type === 'mention') {
          return (
            <Text
              key={index}
              style={[style, styles.mention]}
              onPress={() => handleMentionPress(segment.value!)}
            >
              {segment.content}
            </Text>
          );
        } else {
          return <Text key={index} style={style}>{segment.content}</Text>;
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
