
import React, { useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, ImageStyle, StyleProp } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface OptimizedImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  placeholder?: React.ReactElement;
}

export default function OptimizedImage({
  uri,
  style,
  resizeMode = 'cover',
  placeholder,
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {loading && !error && (
        <View style={styles.loadingContainer}>
          {placeholder || <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      )}
      {!error && (
        <Image
          source={{ uri }}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
      {error && (
        <View style={styles.errorContainer}>
          <View style={styles.errorPlaceholder} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: colors.cardBorder,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBorder,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBorder,
  },
  errorPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
});
