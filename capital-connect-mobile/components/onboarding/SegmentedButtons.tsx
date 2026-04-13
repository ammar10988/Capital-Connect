import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  accentColor?: string;
}

export function SegmentedButtons({
  options,
  selected,
  onSelect,
  accentColor = '#2563EB',
}: Props) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.button,
              isSelected
                ? { backgroundColor: '#EFF6FF', borderColor: accentColor }
                : styles.buttonDefault,
            ]}
            onPress={() => onSelect(option)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.buttonText,
                isSelected
                  ? { color: accentColor, fontWeight: '600' }
                  : styles.buttonTextDefault,
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  buttonDefault: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  buttonText: {
    fontSize: 13,
  },
  buttonTextDefault: {
    color: '#6B7280',
    fontWeight: '500',
  },
});
