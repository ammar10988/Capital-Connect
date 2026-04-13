import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// This screen is never shown — the "more" tab opens a drawer modal instead.
// The tab listener in _layout.tsx prevents navigation to this screen.
export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>More</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA', alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, color: '#9CA3AF' },
});
