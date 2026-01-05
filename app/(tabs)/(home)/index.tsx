
import React from "react";
import { FlatList, StyleSheet, View, Platform } from "react-native";
import { useTheme } from "@react-navigation/native";
import { modalDemos } from "@/components/homeData";
import { DemoCard } from "@/components/DemoCard";
import { scaleFontSize } from "@/utils/androidScaling";

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={modalDemos}
        renderItem={({ item }) => <DemoCard item={item} />}
        keyExtractor={(item) => item.route}
        contentContainerStyle={styles.listContainer}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingTop: Platform.OS === 'android' ? 40 : 48,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'android' ? 90 : 100,
  },
});
