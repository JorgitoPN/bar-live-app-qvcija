
/**
 * Event Cleanup Utilities
 * 
 * This module provides utilities for cleaning up expired events
 * from the BarLive app and database.
 */

import { supabase } from './supabase';

/**
 * Check if an event has expired based on its end date/time
 */
export function isEventExpired(
  fecha: string,
  hora: string,
  fecha_fin?: string | null,
  hora_fin?: string | null
): boolean {
  const now = new Date();
  
  // Parse event end date/time
  let eventEndDate: Date;
  if (fecha_fin && hora_fin) {
    eventEndDate = new Date(`${fecha_fin}T${hora_fin}`);
  } else {
    // If no end date, use the event date as the end date
    eventEndDate = new Date(`${fecha}T23:59:59`);
  }
  
  // Event is expired if current time is past the end time
  return now > eventEndDate;
}

/**
 * Delete expired events from the database
 * This calls the Supabase Edge Function to perform the cleanup
 */
export async function cleanupExpiredEvents(): Promise<{
  success: boolean;
  deleted: number;
  marked_inactive: number;
  error?: string;
}> {
  try {
    console.log('[EventCleanup] Starting cleanup of expired events...');
    
    // Get the Supabase project URL
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call the Edge Function
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/cleanup-expired-events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[EventCleanup] Cleanup result:', result);
    
    return {
      success: result.success,
      deleted: result.deleted || 0,
      marked_inactive: result.marked_inactive || 0,
    };
  } catch (error) {
    console.error('[EventCleanup] Error cleaning up expired events:', error);
    return {
      success: false,
      deleted: 0,
      marked_inactive: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a single expired event by ID
 */
export async function deleteExpiredEvent(eventId: string): Promise<boolean> {
  try {
    console.log('[EventCleanup] Deleting expired event:', eventId);
    
    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', eventId);
    
    if (error) {
      console.error('[EventCleanup] Error deleting event:', error);
      return false;
    }
    
    console.log('[EventCleanup] Event deleted successfully');
    return true;
  } catch (error) {
    console.error('[EventCleanup] Error:', error);
    return false;
  }
}

/**
 * Mark a single event as inactive
 */
export async function markEventInactive(eventId: string): Promise<boolean> {
  try {
    console.log('[EventCleanup] Marking event as inactive:', eventId);
    
    const { error } = await supabase
      .from('eventos')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', eventId);
    
    if (error) {
      console.error('[EventCleanup] Error marking event inactive:', error);
      return false;
    }
    
    console.log('[EventCleanup] Event marked inactive successfully');
    return true;
  } catch (error) {
    console.error('[EventCleanup] Error:', error);
    return false;
  }
}

/**
 * Get count of expired events
 */
export async function getExpiredEventsCount(): Promise<number> {
  try {
    const now = new Date().toISOString();
    
    const { count, error } = await supabase
      .from('eventos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
      .or(`fecha_fin.lt.${now.split('T')[0]},and(fecha_fin.is.null,fecha.lt.${now.split('T')[0]})`);
    
    if (error) {
      console.error('[EventCleanup] Error counting expired events:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('[EventCleanup] Error:', error);
    return 0;
  }
}

/**
 * Filter out expired events from an array
 */
export function filterExpiredEvents<T extends {
  fecha: string;
  hora: string;
  fecha_fin?: string | null;
  hora_fin?: string | null;
}>(events: T[]): T[] {
  return events.filter(event => 
    !isEventExpired(event.fecha, event.hora, event.fecha_fin, event.hora_fin)
  );
}
