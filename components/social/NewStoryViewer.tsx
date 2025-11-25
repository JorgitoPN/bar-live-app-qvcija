
// ✅ FIXED: Added missing dependencies to useEffect

useEffect(() => {
  if (!isActive) {
    progress.setValue(0);
    return;
  }

  if (isPaused) {
    animationRef.current?.stop();
    return;
  }

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

// ✅ FIXED: Added missing dependency 'markAsViewed'
useEffect(() => {
  if (visible && currentStory && user && !isOwner) {
    markAsViewed(currentStory.id);
  }
}, [visible, currentStory, user, isOwner, markAsViewed]);
