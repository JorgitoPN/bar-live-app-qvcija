
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { generateUsernameSuggestions } from '@/utils/usernameGenerator';

interface UsernameSuggestionsProps {
  name: string;
  onSelectUsername: (username: string) => void;
  currentUsername?: string;
}

export function UsernameSuggestions({
  name,
  onSelectUsername,
  currentUsername,
}: UsernameSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSuggestions() {
      if (name.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await generateUsernameSuggestions(name, 5);
        setSuggestions(results);
      } catch (error) {
        console.error('[UsernameSuggestions] Error loading suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(loadSuggestions, 500);
    return () => clearTimeout(timeout);
  }, [name]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.loadingText}>Generando sugerencias...</Text>
      </View>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol
          ios_icon_name="sparkles"
          android_material_icon_name="auto_awesome"
          size={16}
          color={colors.primary}
        />
        <Text style={styles.headerText}>Sugerencias de nombre de usuario:</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionsContainer}
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.suggestionChip,
              currentUsername === suggestion && styles.suggestionChipActive,
            ]}
            onPress={() => onSelectUsername(suggestion)}
          >
            <Text
              style={[
                styles.suggestionText,
                currentUsername === suggestion && styles.suggestionTextActive,
              ]}
            >
              @{suggestion}
            </Text>
            {currentUsername === suggestion && (
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={16}
                color="#fff"
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  suggestionsContainer: {
    paddingHorizontal: 4,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  suggestionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  suggestionTextActive: {
    color: '#fff',
    marginRight: 6,
  },
});
