
/**
 * Icon Validator Utility
 * 
 * This utility helps identify and fix problematic icon names throughout the app.
 * Use this during development to ensure all icons are valid Material Icons.
 */

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Get all valid Material Icons
const VALID_ICONS = Object.keys(MaterialIcons.glyphMap);

/**
 * Check if an icon name is valid in MaterialIcons
 */
export function isValidIcon(iconName: string): boolean {
  return VALID_ICONS.includes(iconName);
}

/**
 * Find similar valid icon names for a given invalid icon
 */
export function findSimilarIcons(iconName: string, limit: number = 5): string[] {
  const lowerName = iconName.toLowerCase();
  const similar: string[] = [];

  for (const validIcon of VALID_ICONS) {
    if (similar.length >= limit) break;
    
    const lowerValid = validIcon.toLowerCase();
    
    // Exact match
    if (lowerValid === lowerName) {
      return [validIcon];
    }
    
    // Contains match
    if (lowerValid.includes(lowerName) || lowerName.includes(lowerValid)) {
      similar.push(validIcon);
    }
  }

  return similar;
}

/**
 * Validate an icon and suggest alternatives if invalid
 */
export function validateAndSuggest(iconName: string): {
  isValid: boolean;
  suggestions: string[];
  message: string;
} {
  if (isValidIcon(iconName)) {
    return {
      isValid: true,
      suggestions: [],
      message: `✅ "${iconName}" is a valid Material Icon`,
    };
  }

  const suggestions = findSimilarIcons(iconName);
  
  return {
    isValid: false,
    suggestions,
    message: suggestions.length > 0
      ? `❌ "${iconName}" is invalid. Did you mean: ${suggestions.join(', ')}?`
      : `❌ "${iconName}" is invalid. No similar icons found.`,
  };
}

/**
 * Get a list of commonly used valid icons
 */
export function getCommonIcons(): Record<string, string[]> {
  return {
    navigation: ['home', 'search', 'menu', 'arrow-back', 'arrow-forward', 'close'],
    actions: ['add', 'remove', 'edit', 'delete', 'save', 'share', 'refresh'],
    social: ['favorite', 'favorite-border', 'thumb-up', 'people', 'person', 'group'],
    communication: ['phone', 'email', 'message', 'chat', 'notifications', 'send'],
    media: ['image', 'photo', 'camera-alt', 'videocam', 'play-arrow', 'pause'],
    location: ['location-on', 'place', 'map', 'directions', 'navigation'],
    time: ['schedule', 'access-time', 'event', 'today', 'alarm'],
    settings: ['settings', 'tune', 'visibility', 'lock', 'security'],
    status: ['star', 'check', 'error', 'warning', 'info', 'help'],
  };
}

/**
 * Log all invalid icons found in a list of icon names
 */
export function auditIcons(iconNames: string[]): {
  valid: string[];
  invalid: Array<{ name: string; suggestions: string[] }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ name: string; suggestions: string[] }> = [];

  for (const iconName of iconNames) {
    if (isValidIcon(iconName)) {
      valid.push(iconName);
    } else {
      invalid.push({
        name: iconName,
        suggestions: findSimilarIcons(iconName),
      });
    }
  }

  return { valid, invalid };
}

/**
 * Print a report of icon validation results
 */
export function printIconReport(iconNames: string[]): void {
  const { valid, invalid } = auditIcons(iconNames);

  console.log('\n📊 Icon Validation Report');
  console.log('========================\n');
  console.log(`✅ Valid icons: ${valid.length}`);
  console.log(`❌ Invalid icons: ${invalid.length}\n`);

  if (invalid.length > 0) {
    console.log('Invalid Icons and Suggestions:');
    console.log('------------------------------');
    invalid.forEach(({ name, suggestions }) => {
      console.log(`\n❌ "${name}"`);
      if (suggestions.length > 0) {
        console.log(`   Suggestions: ${suggestions.join(', ')}`);
      } else {
        console.log('   No similar icons found');
      }
    });
  }

  console.log('\n========================\n');
}

/**
 * Get the total count of available Material Icons
 */
export function getTotalIconCount(): number {
  return VALID_ICONS.length;
}

/**
 * Search for icons by keyword
 */
export function searchIcons(keyword: string, limit: number = 20): string[] {
  const lowerKeyword = keyword.toLowerCase();
  const results: string[] = [];

  for (const icon of VALID_ICONS) {
    if (results.length >= limit) break;
    if (icon.toLowerCase().includes(lowerKeyword)) {
      results.push(icon);
    }
  }

  return results;
}
