
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: 'Descubre Locales',
    description: 'Encuentra los mejores bares, restaurantes y discotecas cerca de ti',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
  },
  {
    id: 2,
    title: 'Conecta Socialmente',
    description: 'Comparte experiencias, sigue locales y conecta con amigos',
    image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400',
  },
  {
    id: 3,
    title: 'Eventos y Empleo',
    description: 'Descubre eventos exclusivos y oportunidades laborales en hostelería',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
  },
];

export default function BienvenidaScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push('/auth/login-popup');
    }
  };

  const handleSkip = () => {
    router.push('/auth/login-popup');
  };

  const currentSlide = onboardingData[currentIndex];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.gradient}
      >
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Saltar</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Image source={{ uri: currentSlide.image }} style={styles.image} />
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentSlide.title}</Text>
            <Text style={styles.description}>{currentSlide.description}</Text>
          </View>

          <View style={styles.pagination}>
            {onboardingData.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>
              {currentIndex === onboardingData.length - 1 ? 'Comenzar' : 'Siguiente'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  image: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 20,
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.headerText,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.headerText,
    width: 24,
  },
  button: {
    backgroundColor: colors.headerText,
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
