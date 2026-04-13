import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export function Input({ label, error, secureToggle, secureTextEntry, style, ...rest }: InputProps) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={hidden}
          autoCapitalize="none"
          {...rest}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setHidden(h => !h)} style={styles.toggle}>
            <Text style={styles.toggleText}>{hidden ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.elevated, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14,
  },
  inputError: { borderColor: Colors.danger },
  input: { flex: 1, height: 48, fontSize: 15, color: Colors.textPrimary },
  error: { fontSize: 12, color: Colors.danger, marginTop: 4 },
  toggle: { paddingLeft: 10 },
  toggleText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
