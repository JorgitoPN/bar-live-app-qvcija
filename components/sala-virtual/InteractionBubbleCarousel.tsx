
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PredefinedMessage {
  id: string;
  text: string;
  emoji: string;
}

interface InteractionBubbleCarouselProps {
  visible: boolean;
  onClose: () => void;
  recipientName: string;
  onSelectMessage: (message: string) => void;
  onViewProfile: () => void;
  themeColors: any;
  mode: 'day' | 'night';
}

const PREDEFINED_MESSAGES = {
  flirtatious: [
    { id: '1', text: '¿Me sacas a bailar? 💃', emoji: '💃' },
    { id: '2', text: '¿Te puedo sacar a bailar? 🕺✨', emoji: '🕺' },
    { id: '3', text: 'Te he visto y no he podido no saludarte... 👀', emoji: '👀' },
    { id: '4', text: 'Me gusta tu estilo. 😊', emoji: '😊' },
  ],
  invitation: [
    { id: '5', text: '¿Te invito a una copa? 🥂', emoji: '🥂' },
    { id: '6', text: '¿Me invitas a una copa? 😇', emoji: '😇' },
    { id: '7', text: 'Pago yo la siguiente ronda 🍸', emoji: '🍸' },
    { id: '8', text: '¿Qué estás tomando? 🍹', emoji: '🍹' },
  ],
  icebreaker: [
    { id: '9', text: 'S.O.S: Mis amigos son unos pesados, ¿me rescatas? 😂', emoji: '😂' },
    { id: '10', text: '¿Te apetece charlar un rato? 😊', emoji: '😊' },
    { id: '11', text: '¿Vienes mucho por aquí? ✨', emoji: '✨' },
  ],
};

export function InteractionBubbleCarousel({
  visible,
  onClose,
  recipientName,
  onSelectMessage,
  onViewProfile,
  themeColors,
  mode,
}: InteractionBubbleCarouselProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // ✅ LINT FIX: Added all animation dependencies
  useEffect(() => {
    console.log('[InteractionBubbleCarousel] Visibility changed:', visible, 'Recipient:', recipientName);
    if (visible) {
      console.log('[InteractionBubbleCarousel] Modal opened for:', recipientName);
      console.log('[InteractionBubbleCarousel] Theme colors:', themeColors);
      console.log('[InteractionBubbleCarousel] Mode:', mode);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('[InteractionBubbleCarousel] Animation completed');
      });
    } else {
      console.log('[InteractionBubbleCarousel] Modal closed');
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [visible, recipientName, themeColors, mode, scaleAnim, rotateAnim]);

  const handleSelectMessage = (message: string) => {
    console.log('[InteractionBubbleCarousel] Message selected:', message);
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onSelectMessage(message);
    });
  };

  const handleViewProfile = () => {
    console.log('[InteractionBubbleCarousel] View profile pressed');
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onViewProfile();
    });
  };

  const titleText = `Enviar mensaje a ${recipientName}`;

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: themeColors.cardBg,
              borderColor: themeColors.cardBorder,
              transform: [{ scale: scaleAnim }],
            },
            mode === 'night' && {
              shadowColor: themeColors.glow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 20,
              elevation: 20,
            },
          ]}
        >
            <View style={[styles.header, { borderBottomColor: themeColors.cardBorder }]}>
              <Text style={[styles.title, { fontSize: scaleFontSize(20), color: themeColors.text }]}>
                {titleText}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={themeColors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {/* View Profile Button */}
              <View style={styles.profileSection}>
                <TouchableOpacity
                  style={[
                    styles.profileButton,
                    { 
                      backgroundColor: themeColors.primary + '20',
                      borderColor: themeColors.primary + '40',
                    },
                  ]}
                  onPress={handleViewProfile}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="person.circle.fill"
                    android_material_icon_name="account_circle"
                    size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                    color={themeColors.primary}
                  />
                  <Text style={[styles.profileButtonText, { fontSize: scaleFontSize(15), color: themeColors.text }]}>
                    Ver Perfil de {recipientName}
                  </Text>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron_right"
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                    color={themeColors.primary}
                  />
                </TouchableOpacity>
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                  💃 Ligar / Atrevido
                </Text>
                {PREDEFINED_MESSAGES.flirtatious.map((msg) => (
                  <TouchableOpacity
                    key={msg.id}
                    style={[
                      styles.messageButton,
                      { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary + '30' },
                    ]}
                    onPress={() => handleSelectMessage(msg.text)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.messageEmoji}>{msg.emoji}</Text>
                    <Text style={[styles.messageText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                  🥂 Invitación
                </Text>
                {PREDEFINED_MESSAGES.invitation.map((msg) => (
                  <TouchableOpacity
                    key={msg.id}
                    style={[
                      styles.messageButton,
                      { backgroundColor: themeColors.secondary + '15', borderColor: themeColors.secondary + '30' },
                    ]}
                    onPress={() => handleSelectMessage(msg.text)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.messageEmoji}>{msg.emoji}</Text>
                    <Text style={[styles.messageText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                  😊 Rompehielos
                </Text>
                {PREDEFINED_MESSAGES.icebreaker.map((msg) => (
                  <TouchableOpacity
                    key={msg.id}
                    style={[
                      styles.messageButton,
                      { backgroundColor: themeColors.accent + '15', borderColor: themeColors.accent + '30' },
                    ]}
                    onPress={() => handleSelectMessage(msg.text)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.messageEmoji}>{msg.emoji}</Text>
                    <Text style={[styles.messageText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '700',
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  profileSection: {
    marginBottom: 16,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 2,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  profileButtonText: {
    fontWeight: '700',
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
    borderWidth: 2,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  messageEmoji: {
    fontSize: 24,
  },
  messageText: {
    fontWeight: '600',
    flex: 1,
  },
});
