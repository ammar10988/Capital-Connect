import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface AvatarProps {
  name?: string;
  url?: string | null;
  size?: number;
}

export function Avatar({ name, url, size = 40 }: AvatarProps) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const fontSize = size * 0.38;
  const style = { width: size, height: size, borderRadius: size / 2 };

  if (url) {
    return <Image source={{ uri: url }} style={[style, styles.image]} />;
  }

  return (
    <View style={[style, styles.placeholder]}>
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: Colors.elevated },
  placeholder: { backgroundColor: 'rgba(24,101,246,0.15)', justifyContent: 'center', alignItems: 'center' },
  initials: { fontWeight: '700', color: Colors.primary },
});
