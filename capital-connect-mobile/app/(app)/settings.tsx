import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../context/AuthContext';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  isLast?: boolean;
}

function SettingsRow({ icon, label, onPress, destructive, isLast }: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={destructive ? '#EF4444' : '#6B7280'} style={{ marginRight: 12 }} />
      <Text style={[styles.rowLabel, destructive && { color: '#EF4444' }]}>{label}</Text>
      {!destructive && <Ionicons name="chevron-forward-outline" size={16} color="#D1D5DB" />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuthContext();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerTitle}>Settings</Text>
      <Text style={styles.headerSubtitle}>Manage your account and preferences</Text>

      {/* Main Settings Group */}
      <View style={styles.card}>
        <SettingsRow icon="person-outline" label="Profile" onPress={() => router.push('/(app)/settings/profile' as any)} />
        <SettingsRow icon="person-circle-outline" label="Account" onPress={() => router.push('/(app)/settings/account' as any)} />
        <SettingsRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/(app)/settings/notifications' as any)} />
        <SettingsRow icon="lock-closed-outline" label="Privacy" onPress={() => router.push('/(app)/settings/privacy' as any)} />
        <SettingsRow icon="color-palette-outline" label="Appearance" onPress={() => router.push('/(app)/settings/appearance' as any)} isLast />
      </View>

      {/* Logout Group */}
      <View style={[styles.card, { marginTop: 8 }]}>
        <SettingsRow icon="log-out-outline" label="Logout" onPress={handleLogout} destructive isLast />
      </View>

      <Text style={styles.version}>Capital Connect Mobile · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 40 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden' },
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  version: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 24 },
});
