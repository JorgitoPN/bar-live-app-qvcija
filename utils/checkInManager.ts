
import { supabase } from './supabase';

export const checkInManager = {
  /**
   * Check in a user to a local with visibility settings
   */
  async checkIn(
    userId: string, 
    localId: string, 
    visibility: 'followers' | 'all_users' | 'specific_users',
    specificUserIds: string[] = [],
    sendNotifications: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[CheckInManager] 🔄 Starting check-in process for user:', userId, 'local:', localId);

      const { data: existingCheckIns, error: checkError } = await supabase
        .from('check_ins')
        .select('id, local_id')
        .eq('usuario_id', userId);

      if (checkError) {
        console.error('[CheckInManager] ❌ Error checking existing check-ins:', checkError);
        return { success: false, error: 'Error al verificar check-ins existentes' };
      }

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

      const { error: insertError } = await supabase
        .from('check_ins')
        .insert({
          usuario_id: userId,
          local_id: localId,
          visibility: visibility,
          specific_user_ids: specificUserIds,
          send_notifications: sendNotifications,
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

  /**
   * Get all users checked in to a specific local (visible to current user)
   */
  async getUsersCheckedInToLocal(localId: string, currentUserId?: string): Promise<{ users: any[]; error?: string }> {
    try {
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select(`
          usuario_id,
          visibility,
          specific_user_ids,
          usuarios!check_ins_usuario_id_fkey(id, nombre, username, avatar)
        `)
        .eq('local_id', localId);

      if (error) throw error;

      const visibleUsers: any[] = [];

      for (const checkIn of (checkIns || [])) {
        const checkInUser = checkIn.usuarios;
        if (!checkInUser) continue;

        if (checkIn.visibility === 'all_users') {
          visibleUsers.push(checkInUser);
        } else if (checkIn.visibility === 'followers' && currentUserId) {
          const { data: followData } = await supabase
            .from('seguidores')
            .select('id')
            .eq('seguidor_id', currentUserId)
            .eq('seguido_id', checkInUser.id)
            .single();

          if (followData) {
            visibleUsers.push(checkInUser);
          }
        } else if (checkIn.visibility === 'specific_users' && currentUserId) {
          if (checkIn.specific_user_ids?.includes(currentUserId)) {
            visibleUsers.push(checkInUser);
          }
        }
      }

      return { users: visibleUsers };
    } catch (error) {
      console.error('[CheckInManager] ❌ Error getting checked-in users:', error);
      return { users: [], error: 'Error al obtener usuarios' };
    }
  },
};
