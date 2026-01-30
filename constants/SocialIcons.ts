
// ✅ UNIFIED ICON SYSTEM for Social Features v2.0
// This ensures consistent icons across all social components
// Updated to use the rounded chatbubble icon consistently

export const SOCIAL_ICONS = {
  // Post Actions
  LIKE: {
    ios: 'heart',
    iosFilled: 'heart.fill',
    android: 'favorite_border',
    androidFilled: 'favorite',
  },
  COMMENT: {
    // ✅ UPDATED: Using consistent rounded chatbubble icon
    ios: 'message',
    iosFilled: 'message.fill',
    android: 'chat_bubble_outline',
    androidFilled: 'chat_bubble',
  },
  SHARE: {
    ios: 'paperplane',
    iosFilled: 'paperplane.fill',
    android: 'send',
    androidFilled: 'send',
  },
  SAVE: {
    ios: 'bookmark',
    iosFilled: 'bookmark.fill',
    android: 'bookmark_border',
    androidFilled: 'bookmark',
  },
  MORE: {
    ios: 'ellipsis',
    android: 'more_horiz',
  },

  // Story Actions
  STORY_DELETE: {
    ios: 'trash.fill',
    android: 'delete',
  },
  STORY_VIEWS: {
    ios: 'eye.fill',
    android: 'visibility',
  },
  STORY_SEND: {
    ios: 'paperplane.fill',
    android: 'send',
  },

  // User Actions
  FOLLOW: {
    ios: 'person.badge.plus',
    android: 'person_add',
  },
  FOLLOWING: {
    ios: 'person.badge.checkmark',
    android: 'person_add_disabled',
  },
  MESSAGE: {
    ios: 'message',
    iosFilled: 'message.fill',
    android: 'mail_outline',
    androidFilled: 'mail',
  },

  // Navigation
  BACK: {
    ios: 'chevron.left',
    android: 'arrow_back',
  },
  CLOSE: {
    ios: 'xmark',
    android: 'close',
  },
  SETTINGS: {
    ios: 'gear',
    android: 'settings',
  },
} as const;

// Icon sizes
export const ICON_SIZES = {
  SMALL: 18,
  MEDIUM: 22,
  LARGE: 26,
  XLARGE: 32,
} as const;

// Icon colors (use with colors from commonStyles)
export const ICON_COLORS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  TEXT: 'text',
  TEXT_SECONDARY: 'textSecondary',
  HEADER_TEXT: 'headerText',
  DANGER: '#EF4444',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
} as const;
