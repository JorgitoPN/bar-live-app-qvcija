
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

interface CommentsModalProps {
  visible: boolean;
  postId: string;
  postAuthorId?: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}

/**
 * ✅ ANDROID VERSION - Redirects to full page instead of modal
 * 
 * On Android, modals don't display correctly, so we navigate to a full page instead.
 * This component intercepts the modal and redirects to /social/comentar
 */
export default function CommentsModal({
  visible,
  postId,
  postAuthorId,
  onClose,
  onCommentAdded,
}: CommentsModalProps) {
  const router = useRouter();

  React.useEffect(() => {
    if (visible && postId) {
      console.log('[CommentsModal Android] 🔄 Redirecting to full page');
      // Navigate to full page
      router.push({
        pathname: '/social/comentar',
        params: { 
          postId,
          postAuthorId: postAuthorId || '',
        },
      });
      // Close modal immediately
      onClose();
    }
  }, [visible, postId, postAuthorId, router, onClose]);

  // Return empty view - navigation happens in useEffect
  return <View />;
}
