
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

/**
 * 🏎️ ORACLE RED BULL RACING 2026 SEASON LAUNCH
 * 
 * Simple, focused screen to watch the season launch live
 * - Displays the Red Bull Racing launch image
 * - Clean, minimal design
 * - Easy navigation back
 */

export default function RedBullLaunchScreen() {
  const router = useRouter();

  console.log('[RedBullLaunch] Screen loaded');

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0600EF', '#DC0000']} // Red Bull Racing colors
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            console.log('[RedBullLaunch] User tapped back button');
            router.back();
          }}
        >
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow-back" 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🏎️ Red Bull Racing</Text>
          <Text style={styles.headerSubtitle}>2026 Season Launch</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Main Launch Image - Using Unsplash placeholder */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&h=600&fit=crop' }}
            style={styles.launchImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageOverlayText}>🏎️ 2026 Season Launch</Text>
          </View>
        </View>

        {/* Event Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <IconSymbol 
              ios_icon_name="calendar" 
              android_material_icon_name="event" 
              size={28} 
              color="#DC0000" 
            />
            <Text style={styles.infoTitle}>Season Launch Event</Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="clock.fill" 
              android_material_icon_name="schedule" 
              size={20} 
              color={colors.textSecondary} 
            />
            <Text style={styles.infoText}>Watch Live</Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="location.fill" 
              android_material_icon_name="location-on" 
              size={20} 
              color={colors.textSecondary} 
            />
            <Text style={styles.infoText}>Oracle Red Bull Racing HQ</Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="star.fill" 
              android_material_icon_name="star" 
              size={20} 
              color={colors.textSecondary} 
            />
            <Text style={styles.infoText}>2026 Season Unveiling</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>About the Event</Text>
          <Text style={styles.descriptionText}>
            Join us for the official unveiling of the Oracle Red Bull Racing 2026 season. 
            Witness the reveal of the new car, meet the drivers, and get exclusive insights 
            into what promises to be an exciting season ahead.
          </Text>
        </View>

        {/* Watch Live Button */}
        <TouchableOpacity 
          style={styles.watchButton}
          onPress={() => {
            console.log('[RedBullLaunch] User tapped Watch Live button');
            // TODO: Add live stream functionality here
          }}
        >
          <LinearGradient
            colors={['#DC0000', '#0600EF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.watchButtonGradient}
          >
            <IconSymbol 
              ios_icon_name="play.circle.fill" 
              android_material_icon_name="play-circle" 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.watchButtonText}>Watch Live Stream</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  imageContainer: {
    width: '100%',
    height: height * 0.4,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  launchImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    alignItems: 'center',
  },
  imageOverlayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 14,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  descriptionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  watchButton: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#DC0000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  watchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  watchButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
