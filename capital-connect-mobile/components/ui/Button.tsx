import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }: ButtonProps) {
  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'outline' && styles.outline,
    variant === 'ghost' && styles.ghost,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    variant === 'outline' && styles.textOutline,
    variant === 'ghost' && styles.textGhost,
    isDisabled && styles.textDisabled,
  ];

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} disabled={isDisabled} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.primary} size="small" />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.elevated },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  text: { fontSize: 15, fontWeight: '600', color: Colors.white },
  textOutline: { color: Colors.primary },
  textGhost: { color: Colors.primary },
  textDisabled: { color: Colors.textMuted },
});
