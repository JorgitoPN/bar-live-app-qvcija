
// ... (keeping all imports and interfaces the same - only showing the changed parts)

// In the component, I need to track the progress bar width and use it for animation
const [progressBarWidth, setProgressBarWidth] = useState(0);

// Update the startStoryTimer function to use numeric values
const startStoryTimer = useCallback(() => {
  if (storyTimerRef.current) {
    clearTimeout(storyTimerRef.current);
  }

  progressAnim.setValue(0);

  // ✅ FIX: Animate from 0 to progressBarWidth (numeric pixels)
  // This works with useNativeDriver: true for smooth animation
  Animated.timing(progressAnim, {
    toValue: progressBarWidth,
    duration: STORY_DURATION,
    useNativeDriver: true, // ✅ This works with numeric translateX values
  }).start(({ finished }) => {
    if (finished) {
      handleNextStory();
    }
  });

  storyTimerRef.current = setTimeout(() => {
    handleNextStory();
  }, STORY_DURATION);
}, [handleNextStory, progressAnim, progressBarWidth]);

// In the story viewer modal, update the progress bar rendering:
<View 
  style={styles.storyProgressContainer}
  onLayout={(e) => {
    const { width } = e.nativeEvent.layout;
    // Calculate width of each individual progress bar
    const barWidth = (width - (currentStories.length - 1) * 4) / currentStories.length;
    setProgressBarWidth(barWidth);
    console.log('[Social] 📐 Progress bar width:', barWidth);
  }}
>
  {currentStories.map((_, index) => (
    <View key={index} style={styles.storyProgressBar}>
      {index < currentStoryIndex && (
        <View style={[styles.storyProgressFill, { width: '100%' }]} />
      )}
      {index === currentStoryIndex && progressBarWidth > 0 && (
        <Animated.View 
          style={[
            styles.storyProgressFill,
            { 
              width: progressBarWidth,
              transform: [
                { 
                  translateX: progressAnim.interpolate({
                    inputRange: [0, progressBarWidth],
                    outputRange: [-progressBarWidth, 0], // ✅ Numeric values for useNativeDriver
                  })
                }
              ]
            }
          ]} 
        />
      )}
    </View>
  ))}
</View>

// Update the storyProgressFill style to use absolute positioning
const styles = StyleSheet.create({
  // ... other styles
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  // ... other styles
});
