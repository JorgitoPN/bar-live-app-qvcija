
// Fix line 1668:27 - Remove optionsIconSize prop, use size instead
// Around line 1668, change from:
// size={optionsIconSize}
// to:
// size={scaleIconSize(24)}

// Also ensure Material icon names are valid for Android
