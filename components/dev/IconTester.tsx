
/**
 * Icon Tester Component
 * 
 * Development tool to test and validate icon names.
 * Use this component to ensure icons render correctly before using them in production.
 * 
 * Usage:
 * import IconTester from '@/components/dev/IconTester';
 * <IconTester iconName="home" />
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { IconSymbol } from '../IconSymbol';
import { validateAndSuggest, searchIcons, getCommonIcons } from '@/utils/iconValidator';
import { colors } from '@/styles/commonStyles';

interface IconTesterProps {
  initialIcon?: string;
}

export default function IconTester({ initialIcon = 'home' }: IconTesterProps) {
  const [iconName, setIconName] = useState(initialIcon);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [validation, setValidation] = useState(validateAndSuggest(initialIcon));

  const handleIconChange = (text: string) => {
    setIconName(text);
    setValidation(validateAndSuggest(text));
    
    if (text.length > 2) {
      setSearchResults(searchIcons(text, 10));
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectIcon = (icon: string) => {
    setIconName(icon);
    setValidation(validateAndSuggest(icon));
    setSearchResults([]);
  };

  const commonIcons = getCommonIcons();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Icon Tester</Text>
        <Text style={styles.subtitle}>Test Material Icons for Android/Web</Text>
      </View>

      {/* Current Icon Display */}
      <View style={styles.iconDisplay}>
        <IconSymbol
          android_material_icon_name={iconName}
          size={64}
          color={validation.isValid ? colors.success : colors.error}
        />
        <Text style={styles.iconName}>{iconName}</Text>
        <Text style={[
          styles.validationText,
          { color: validation.isValid ? colors.success : colors.error }
        ]}>
          {validation.message}
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.label}>Icon Name:</Text>
        <TextInput
          style={styles.input}
          value={iconName}
          onChangeText={handleIconChange}
          placeholder="Enter icon name..."
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.label}>Search Results:</Text>
          <View style={styles.iconGrid}>
            {searchResults.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={styles.iconItem}
                onPress={() => handleSelectIcon(icon)}
              >
                <IconSymbol
                  android_material_icon_name={icon}
                  size={32}
                  color={colors.text}
                />
                <Text style={styles.iconItemText} numberOfLines={1}>
                  {icon}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Suggestions */}
      {!validation.isValid && validation.suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.label}>Suggestions:</Text>
          <View style={styles.iconGrid}>
            {validation.suggestions.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={styles.iconItem}
                onPress={() => handleSelectIcon(icon)}
              >
                <IconSymbol
                  android_material_icon_name={icon}
                  size={32}
                  color={colors.text}
                />
                <Text style={styles.iconItemText} numberOfLines={1}>
                  {icon}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Common Icons */}
      <View style={styles.commonIconsContainer}>
        <Text style={styles.label}>Common Icons:</Text>
        {Object.entries(commonIcons).map(([category, icons]) => (
          <View key={category} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.iconGrid}>
              {icons.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={styles.iconItem}
                  onPress={() => handleSelectIcon(icon)}
                >
                  <IconSymbol
                    android_material_icon_name={icon}
                    size={32}
                    color={colors.text}
                  />
                  <Text style={styles.iconItemText} numberOfLines={1}>
                    {icon}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  iconDisplay: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.card,
    margin: 20,
    borderRadius: 12,
  },
  iconName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  validationText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  suggestionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconItem: {
    width: 80,
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconItemText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  commonIconsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
});
