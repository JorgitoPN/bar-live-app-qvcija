
import { supabase } from './supabase';
import { Alert } from 'react-native';

export const checkInManager = {
  /**
   * Check in a user to a local, automatically checking out from any previous local
   */
  async checkIn(userId: string, localId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[CheckInManager] 🔄 Starting check-in process for user:', userId, 'local:', localId);

      // Step 1: Check if user is already checked in to ANY local
      const { data: existingCheckIns, error: checkError } = await supabase
        .from('check_ins')
        .select('id, local_id')
        .eq('usuario_id', userId);

      if (checkError) {
        console.error('[CheckInManager] ❌ Error checking existing check-ins:', checkError);
        return { success: false, error: 'Error al verificar check-ins existentes' };
      }

      // Step 2: If user is checked in elsewhere, check them out first
      if (existingCheckIns && existingCheckIns.length > 0) {
        console.log('[CheckInManager] 🔄 User has existing check-ins, removing them...');
        
        const { error: deleteError } = await supabase
          .from('check_ins')
          .delete()
          .eq('usuario_id', userId);

        if (deleteError) {
          console.error('[CheckInManager] ❌ Error removing previous check-ins:', deleteError);
          return { success: false, error: 'Error al cerrar sesión anterior' };
        }

        console.log('[CheckInManager] ✅ Previous check-ins removed');
      }

      // Step 3: Create new check-in
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert({
          usuario_id: userId,
          local_id: localId,
        });

      if (insertError) {
        console.error('[CheckInManager] ❌ Error creating check-in:', insertError);
        return { success: false, error: 'No se pudo hacer check-in' };
      }

      console.log('[CheckInManager] ✅ Check-in successful');
      return { success: true };
    } catch (error) {
      console.error('[CheckInManager] ❌ Unexpected error:', error);
      return { success: false, error: 'Error inesperado al hacer check-in' };
    }
  },

  /**
   * Check out a user from a specific local
   */
  async checkOut(userId: string, localId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[CheckInManager] 🔄 Checking out user:', userId, 'from local:', localId);

      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('usuario_id', userId)
        .eq('local_id', localId);

      if (error) {
        console.error('[CheckInManager] ❌ Error checking out:', error);
        return { success: false, error: 'No se pudo hacer check-out' };
      }

      console.log('[CheckInManager] ✅ Check-out successful');
      return { success: true };
    } catch (error) {
      console.error('[CheckInManager] ❌ Unexpected error:', error);
      return { success: false, error: 'Error inesperado al hacer check-out' };
    }
  },

  /**
   * Check out all users from a specific local (when local closes)
   */
  async checkOutAllUsersFromLocal(localId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[CheckInManager] 🔄 Checking out all users from local:', localId);

      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('local_id', localId);

      if (error) {
        console.error('[CheckInManager] ❌ Error checking out all users:', error);
        return { success: false, error: 'No se pudo cerrar la sala virtual' };
      }

      console.log('[CheckInManager] ✅ All users checked out from local');
      return { success: true };
    } catch (error) {
      console.error('[CheckInManager] ❌ Unexpected error:', error);
      return { success: false, error: 'Error inesperado al cerrar la sala virtual' };
    }
  },

  /**
   * Get current check-in status for a user
   */
  async getCurrentCheckIn(userId: string): Promise<{ localId: string | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('local_id')
        .eq('usuario_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[CheckInManager] ❌ Error getting current check-in:', error);
        return { localId: null, error: 'Error al obtener check-in actual' };
      }

      return { localId: data?.local_id || null };
    } catch (error) {
      console.error('[CheckInManager] ❌ Unexpected error:', error);
      return { localId: null, error: 'Error inesperado' };
    }
  },
};
