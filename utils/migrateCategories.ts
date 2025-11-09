
/**
 * Migration utility to auto-categorize existing venues
 * This should be run once to populate barlive_types for all existing venues
 */

import { supabase } from './supabase';
import { autoCategorizeLocal } from './categorizeLocal';
import { Local } from '@/types';

interface MigrationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: { id: string; error: string }[];
}

/**
 * Migrate all venues to use the new category system
 */
export async function migrateAllVenuesToCategories(): Promise<MigrationResult> {
  console.log('🚀 Iniciando migración de categorías...');
  
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Fetch all venues
    const { data: locales, error } = await supabase
      .from('locales')
      .select('id, nombre, horarios_completos, tipos_google, barlive_types, barlive_type, tipo')
      .eq('activo', true);

    if (error) {
      console.error('❌ Error fetching venues:', error);
      throw error;
    }

    if (!locales || locales.length === 0) {
      console.log('ℹ️ No venues found to migrate');
      return result;
    }

    console.log(`📊 Found ${locales.length} venues to process`);

    // Process each venue
    for (const local of locales) {
      try {
        // Skip if already has categories
        if (local.barlive_types && local.barlive_types.length > 0) {
          console.log(`⏭️ Skipping ${local.nombre} - already has categories`);
          result.skipped++;
          continue;
        }

        // Auto-categorize
        const categories = autoCategorizeLocal(
          local.horarios_completos,
          local.tipos_google
        );

        console.log(`🏷️ Categorizing ${local.nombre}:`, categories);

        // Update in database
        const { error: updateError } = await supabase
          .from('locales')
          .update({ 
            barlive_types: categories,
            barlive_type: categories[0] // Set primary category
          })
          .eq('id', local.id);

        if (updateError) {
          console.error(`❌ Error updating ${local.nombre}:`, updateError);
          result.failed++;
          result.errors.push({
            id: local.id,
            error: updateError.message,
          });
        } else {
          console.log(`✅ Successfully categorized ${local.nombre}`);
          result.success++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing ${local.nombre}:`, error);
        result.failed++;
        result.errors.push({
          id: local.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`⏭️ Skipped: ${result.skipped}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => {
        console.log(`  - ${err.id}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }

  return result;
}

/**
 * Migrate a single venue by ID
 */
export async function migrateVenueCategories(venueId: string): Promise<boolean> {
  try {
    console.log(`🏷️ Migrating venue ${venueId}...`);

    // Fetch venue
    const { data: local, error } = await supabase
      .from('locales')
      .select('id, nombre, horarios_completos, tipos_google, barlive_types')
      .eq('id', venueId)
      .single();

    if (error || !local) {
      console.error('❌ Error fetching venue:', error);
      return false;
    }

    // Auto-categorize
    const categories = autoCategorizeLocal(
      local.horarios_completos,
      local.tipos_google
    );

    console.log(`🏷️ Categories for ${local.nombre}:`, categories);

    // Update in database
    const { error: updateError } = await supabase
      .from('locales')
      .update({ 
        barlive_types: categories,
        barlive_type: categories[0]
      })
      .eq('id', venueId);

    if (updateError) {
      console.error('❌ Error updating venue:', updateError);
      return false;
    }

    console.log(`✅ Successfully categorized ${local.nombre}`);
    return true;

  } catch (error) {
    console.error('❌ Error migrating venue:', error);
    return false;
  }
}

/**
 * Get migration statistics
 */
export async function getMigrationStats(): Promise<{
  total: number;
  categorized: number;
  uncategorized: number;
  percentage: number;
}> {
  try {
    // Total active venues
    const { count: total, error: totalError } = await supabase
      .from('locales')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    if (totalError) throw totalError;

    // Venues with categories
    const { count: categorized, error: categorizedError } = await supabase
      .from('locales')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
      .not('barlive_types', 'is', null)
      .neq('barlive_types', '{}');

    if (categorizedError) throw categorizedError;

    const totalCount = total || 0;
    const categorizedCount = categorized || 0;
    const uncategorizedCount = totalCount - categorizedCount;
    const percentage = totalCount > 0 ? (categorizedCount / totalCount) * 100 : 0;

    return {
      total: totalCount,
      categorized: categorizedCount,
      uncategorized: uncategorizedCount,
      percentage: Math.round(percentage * 100) / 100,
    };

  } catch (error) {
    console.error('❌ Error getting migration stats:', error);
    return {
      total: 0,
      categorized: 0,
      uncategorized: 0,
      percentage: 0,
    };
  }
}
