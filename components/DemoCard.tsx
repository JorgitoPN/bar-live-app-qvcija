
import React from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, View, Text } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { useTheme } from "@react-navigation/native";
import { ModalDemo } from "./homeData";
import { GlassView } from "expo-glass-effect";
import { fontSizes, spacing, getLineHeight, iconSizes, borderRadius } from "@/utils/androidScaling";

interface DemoCardProps {
  item: ModalDemo;
}

export function DemoCard({ item }: DemoCardProps) {
  const theme = useTheme();

  return (
    <GlassView
      style={[
        styles.demoCard,
        { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
      ]}
      glassEffectStyle="regular"
    >
      <View style={[styles.demoIcon, { backgroundColor: item.color }]}>
        <IconSymbol 
          ios_icon_name="square.grid.3x3" 
          android_material_icon_name="apps" 
          color={theme.dark ? '#111111' : '#FFFFFF'} 
          size={iconSizes.lg} 
        />
      </View>
      <View style={styles.demoContent}>
        <Text style={[styles.demoTitle, { color: theme.colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.demoDescription, { color: theme.dark ? '#98989D' : '#666' }]}>
          {item.description}
        </Text>
      </View>
      <Link href={item.route as any} asChild>
        <Pressable>
          <View
            style={[
              styles.tryButton,
              { backgroundColor: theme.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }
            ]}
          >
            <Text style={[styles.tryButtonText, { color: theme.colors.primary }]}>
              Try It
            </Text>
          </View>
        </Pressable>
      </Link>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  demoCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoIcon: {
    width: iconSizes['2xl'],
    height: iconSizes['2xl'],
    borderRadius: iconSizes.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  demoContent: {
    flex: 1,
  },
  demoTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
    lineHeight: getLineHeight(fontSizes.lg),
  },
  demoDescription: {
    fontSize: fontSizes.sm,
    lineHeight: getLineHeight(fontSizes.sm),
  },
  tryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tryButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    lineHeight: getLineHeight(fontSizes.sm),
  },
});
