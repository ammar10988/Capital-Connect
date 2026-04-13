import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FEATURES = [
  {
    icon: 'flash-outline' as const,
    label: 'AI-Powered Matching',
    description: 'Intelligent deal flow powered by Gemini 1.5',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    label: 'Verified Startups',
    description: 'Every startup vetted and trust-badged',
  },
  {
    icon: 'trending-up-outline' as const,
    label: 'Real-time Intelligence',
    description: 'Live market data, news, and sector trends',
  },
];

export function FeaturePills() {
  return (
    <View>
      {FEATURES.map((feature, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name={feature.icon} size={18} color="#2563EB" />
          </View>
          <View style={styles.textColumn}>
            <Text style={styles.label}>{feature.label}</Text>
            <Text style={styles.description}>{feature.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  description: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
});
