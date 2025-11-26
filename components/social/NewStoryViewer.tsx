
// ... (keep imports and interfaces)

function NewStoryViewer({
  visible,
  stories,
  initialIndex,
  onClose,
  onStoryChange,
  onStoryDelete,
  activeLocalProfileId,
}: NewStoryViewerProps) {
  // ... (keep all state and hooks)

  // ✅ FIXED: Added progress to dependency array
  useEffect(() => {
    if (!isActive) {
      progress.setValue(0);
      return;
    }

    if (isPaused) {
      animationRef.current?.stop();
      return;
    }

    // Start or resume animation with GPU acceleration
    const currentValue = (progress as any)._value || 0;
    const remainingDuration = duration * (1 - currentValue);

    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: remainingDuration,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        onComplete();
      }
    });

    return () => {
      animationRef.current?.stop();
    };
  }, [isActive, isPaused, duration, onComplete, progress]);

  // ✅ FIXED: Added markAsViewed to dependency array
  useEffect(() => {
    if (visible && currentStory && user && !isOwner) {
      markAsViewed(currentStory.id);
    }
  }, [visible, currentStory, user, isOwner, markAsViewed]);

  // ... (keep rest of the component)
}

export default memo(NewStoryViewer);
