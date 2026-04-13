import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
}

export function EmptyState({ title = 'Nothing here', message = 'Try adjusting your filters.', icon = '📭' }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6, textAlign: 'center' },
  message: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
