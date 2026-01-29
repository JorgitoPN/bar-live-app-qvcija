
import React, { memo, useState, useEffect } from 'react';
import { Image, ImageProps, View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { memoryManager } from '@/utils/memoryManager';

interface OptimizedImageProps extends ImageProps {
  uri: string;
  width?: number;
  height?: number;
  showLoader?: boolean;
}

/**
 * ✅ ULTRA-OPTIMIZED: Image component with aggressive caching and memory management
 */
const OptimizedImage = memo(function OptimizedImage({
  uri,
  width,
  height,
  showLoader = false,
  style,
  ...props
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(showLoader);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Track image in memory manager
    memoryManager.trackImage(uri);

    // Preload image
    if (uri) {
      Image.prefetch(uri)
        .then(() => {
          setLoading(false);
          setError(false);
        })
        .catch(() => {
          setLoading(false);
          setError(true);
        });
    }

    return () => {
      // Cleanup on unmount
      memoryManager.clearImage(uri);
    };
  }, [uri]);

  if (error) {
    return (
      <View style={[styles.placeholder, style, width && { width }, height && { height }]}>
        <View style={styles.errorIcon} />
      </View>
    );
  }

  return (
    <View style={[width && { width }, height && { height }]}>
      <Image
        source={{ uri }}
        style={[style, width && { width }, height && { height }]}
        // ✅ CRITICAL: Maximum performance settings
        fadeDuration={0}
        progressiveRenderingEnabled={true}
        cache="force-cache"
        resizeMethod="resize"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        {...props}
      />
      {loading && showLoader && (
        <View style={[styles.loaderContainer, width && { width }, height && { height }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ Only re-render if URI changes
  return prevProps.uri === nextProps.uri;
});

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default OptimizedImage;
