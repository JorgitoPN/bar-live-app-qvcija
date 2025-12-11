
import React from 'react';
import InstagramStoriesBarV11 from './InstagramStoriesBarV11';
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
 * This component serves as a simple wrapper around InstagramStoriesBarV11
 * to maintain backward compatibility while using the latest V11 implementation.
 * 
 * Features:
 * - ✅ Uses InstagramStoriesBarV11 under the hood
 * - ✅ LARGER AVATARS (110px) for better visibility
 * - ✅ Maintains consistent API across the app
 * - ✅ Real-time story updates
 * - ✅ Instagram-style story borders
 */
export default function StoriesBar(props: StoriesBarProps) {
  return <InstagramStoriesBarV11 {...props} />;
}
