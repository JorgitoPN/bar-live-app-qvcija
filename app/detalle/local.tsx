
/**
 * ✅ LOCAL DETAILS PAGE - REMOVED (NOW USING MODAL ONLY)
 * 
 * This page has been removed as per user request.
 * The local details are now shown exclusively through the LocalDetailsModal component.
 * 
 * To view local details, use:
 * - LocalDetailsModal component from components/detalle/LocalDetailsModal.tsx
 * - Or navigate directly to the modal via router
 */

import { Redirect } from 'expo-router';

export default function DetalleLocalScreen() {
  // Redirect to home if someone tries to access this page directly
  return <Redirect href="/(tabs)/(home)" />;
}
