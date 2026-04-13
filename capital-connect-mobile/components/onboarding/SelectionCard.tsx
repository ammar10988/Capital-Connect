import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  accentColor?: string;
  accentBg?: string;
  accentLightBg?: string;
}

export function SelectionCard({
  icon,
  label,
  description,
  selected,
  onPress,
  accentColor = '#2563EB',
  accentBg = '#EFF6FF',
  accentLightBg = '#EFF6FF',
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected
          ? { backgroundColor: accentLightBg, borderColor: accentColor, borderWidth: 2 }
          : styles.cardDefault,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.iconContainer,
          selected ? { backgroundColor: accentBg } : styles.iconContainerDefault,
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={selected ? accentColor : '#9CA3AF'}
        />
      </View>
      <Text style={[styles.label, selected ? { color: accentColor } : styles.labelDefault]}>
        {label}
      </Text>
      <Text style={styles.description}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  cardDefault: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconContainerDefault: {
    backgroundColor: '#F3F4F6',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelDefault: {
    color: '#1A1A2E',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
  },
});
