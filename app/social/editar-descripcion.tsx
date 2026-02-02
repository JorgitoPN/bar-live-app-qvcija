
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  StatusBar,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { processPostHashtags, processPostMentions } from '@/utils/postHelpers';
import MentionAutocomplete, { MentionSuggestion } from '@/components/social/MentionAutocomplete';
import HashtagAutocomplete from '@/components/social/HashtagAutocomplete';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

/**
 * ✅ EDIT DESCRIPTION ONLY PAGE v319.0
 * 
 * NEW IMPLEMENTATION v319.0:
 * - ✅ Full-screen page for editing ONLY the description/caption
 * - ✅ Does NOT allow editing images, tags, or location
 * - ✅ Simpler and faster for quick caption edits
 * - ✅ Processes mentions (@username) and hashtags (#tag)
 * - ✅ Character limit: 2200 characters
 * - ✅ Auto-save with optimistic UI
 */

export default function EditarDescripcionScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const postId = params.postId as string;

  const { user } = useAuth();
  
  const [contenido, setContenido] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('contenido, autor_id')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Verify ownership
      if (postData.autor_id !== user?.id) {
        Alert.alert('Error', 'No tienes permiso para editar esta publicación');
        router.back();
        return;
      }

      setContenido(postData.contenido || '');
    } catch (error) {
      console.error('[EditarDescripcion v319.0] Error loading post:', error);
      Alert.alert('Error', 'No se pudo cargar la publicación');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [postId, user, router]);

  useEffect(() => {
    if (postId && user) {
      loadPost();
    }
  }, [postId, user, loadPost]);

  const handleSelectInlineMention = (mention: MentionSuggestion, mentionText: string) => {
    const textBeforeCursor = contenido.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;

    const mentionUsername = mention.tipo === 'local' ? mention.nombre : mention.username;
    const newText = 
      contenido.substring(0, lastAtIndex) + 
      `@${mentionUsername} ` + 
      contenido.substring(cursorPosition);
    
    setContenido(newText);
    
    const newCursorPosition = lastAtIndex + mentionUsername.length + 2;
    setCursorPosition(newCursorPosition);
  };

  const handleSelectInlineHashtag = (hashtag: string, hashtagText: string) => {
    const textBeforeCursor = contenido.substring(0, cursorPosition);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    
    if (lastHashIndex === -1) return;

    const newText = 
      contenido.substring(0, lastHashIndex) + 
      `#${hashtag} ` + 
      contenido.substring(cursorPosition);
    
    setContenido(newText);
    
    const newCursorPosition = lastHashIndex + hashtag.length + 2;
    setCursorPosition(newCursorPosition);
  };

  const guardarCambios = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para editar');
      return;
    }

    setSaving(true);

    try {
      console.log('[EditarDescripcion v319.0] 💾 Saving description for post:', postId);

      const { error: updateError } = await supabase
        .from('posts')
        .update({
          contenido: contenido,
          editado_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('autor_id', user.id);

      if (updateError) {
        console.error('[EditarDescripcion v319.0] Error updating post:', updateError);
        throw updateError;
      }

      // Process hashtags and mentions
      if (contenido) {
        await Promise.all([
          processPostHashtags(postId, contenido),
          processPostMentions(postId, contenido),
        ]);
      }

      console.log('[EditarDescripcion v319.0] ✅ Description updated successfully');
      
      Alert.alert('Éxito', 'Descripción actualizada correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('[EditarDescripcion v319.0] Error saving changes:', error);
      Alert.alert('Error', 'No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando...</Text>
      </View>
    );
  }

  const backIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
        
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={backIconSize} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(18) }]}>Editar descripción</Text>
            <TouchableOpacity 
              onPress={guardarCambios} 
              style={[styles.saveButton, !contenido.trim() && styles.saveButtonDisabled]}
              disabled={saving || !contenido.trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.headerText} />
              ) : (
                <Text style={[styles.saveButtonText, { fontSize: scaleFontSize(15) }]}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.textInputSection}>
            <TextInput
              style={[styles.textInput, { fontSize: scaleFontSize(16) }]}
              placeholder="Escribe una descripción..."
              placeholderTextColor={colors.textSecondary}
              value={contenido}
              onChangeText={setContenido}
              onSelectionChange={(event) => {
                setCursorPosition(event.nativeEvent.selection.start);
              }}
              multiline
              maxLength={2200}
              editable={!saving}
              autoFocus
            />
            <Text style={[styles.charCount, { fontSize: scaleFontSize(12) }]}>{contenido.length}/2200</Text>
            <View style={styles.helperContainer}>
              <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={14} color={colors.primary} />
              <Text style={[styles.helperText, { fontSize: scaleFontSize(12) }]}>
                Escribe @ para mencionar usuarios o locales, # para hashtags
              </Text>
            </View>
          </View>

          <MentionAutocomplete
            text={contenido}
            cursorPosition={cursorPosition}
            onSelectMention={handleSelectInlineMention}
            keyboardHeight={keyboardHeight}
          />

          <HashtagAutocomplete
            text={contenido}
            cursorPosition={cursorPosition}
            onSelectHashtag={handleSelectInlineHashtag}
            keyboardHeight={keyboardHeight}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontWeight: '700',
    color: colors.headerText,
  },
  content: {
    flex: 1,
  },
  textInputSection: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flex: 1,
  },
  textInput: {
    color: colors.text,
    flex: 1,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  helperText: {
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
  },
});
