import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  multiSelect?: boolean;
  accentColor?: string;
}

export function ChipSelector({
  options,
  selected,
  onToggle,
  multiSelect = true,
  accentColor = '#2563EB',
}: Props) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.chip,
              isSelected ? { backgroundColor: '#EFF6FF', borderColor: accentColor } : styles.chipDefault,
            ]}
            onPress={() => onToggle(option)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                isSelected ? { color: accentColor, fontWeight: '600' } : styles.chipTextDefault,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  chipDefault: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  chipText: {
    fontSize: 13,
  },
  chipTextDefault: {
    color: '#6B7280',
  },
});
