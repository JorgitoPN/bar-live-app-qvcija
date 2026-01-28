
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

interface ReviewsModalProps {
  visible: boolean;
  localId: string;
  onClose: () => void;
  onReviewAdded?: () => void;
}

/**
 * ✅ ANDROID VERSION - Redirects to full page instead of modal
 * 
 * On Android, modals don't display correctly, so we navigate to a full page instead.
 */
export default function ReviewsModal({
  visible,
  localId,
  onClose,
  onReviewAdded,
}: ReviewsModalProps) {
  const router = useRouter();

  React.useEffect(() => {
    if (visible && localId) {
      console.log('[ReviewsModal Android] 🔄 Redirecting to full page');
      router.push({
        pathname: '/detalle/reviews',
        params: { localId },
      });
      onClose();
    }
  }, [visible, localId, router, onClose]);

  return <View />;
}
