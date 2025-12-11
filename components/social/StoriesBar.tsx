
import React from 'react';
import InstagramStoriesBar from './InstagramStoriesBar';
import type { Historia } from '@/types';

interface StoriesBarProps {
  historias: Historia[];
  onHistoriaPress: (historia: Historia) => void;
  onCrearHistoria?: () => void;
  userAvatar?: string;
  userName?: string;
  onStoriesUpdate?: (historias: Historia[]) => void;
  showCreateButton?: boolean;
}

/**
 * ✅ STORIES BAR - Wrapper component for Instagram-style stories
 * 
 * This component serves as a simple wrapper around InstagramStoriesBar
 * to maintain backward compatibility while using the latest implementation.
 * 
 * Features:
 * - ✅ Uses InstagramStoriesBar under the hood
 * - ✅ LARGER AVATARS (110px) for better visibility
 * - ✅ Maintains consistent API across the app
 * - ✅ Real-time story updates
 * - ✅ Instagram-style story borders
 */
export default function StoriesBar(props: StoriesBarProps) {
  return <InstagramStoriesBar {...props} />;
}
