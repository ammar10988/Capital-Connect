import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const [publicProfile, setPublicProfile] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back-outline" size={18} color="#2563EB" />
        <Text style={styles.backText}>Settings</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Privacy</Text>
      <Text style={styles.headerSubtitle}>Control who sees your information</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>PRIVACY SETTINGS</Text>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Public Profile</Text>
            <Text style={styles.toggleSub}>Allow investors to discover your profile</Text>
          </View>
          <Switch value={publicProfile} onValueChange={setPublicProfile} trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }} thumbColor={publicProfile ? '#2563EB' : '#9CA3AF'} />
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Show Email Address</Text>
            <Text style={styles.toggleSub}>Display your email on your public profile</Text>
          </View>
          <Switch value={showEmail} onValueChange={setShowEmail} trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }} thumbColor={showEmail ? '#2563EB' : '#9CA3AF'} />
        </View>

        <View style={[styles.toggleRow, styles.toggleRowLast]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Analytics & Improvements</Text>
            <Text style={styles.toggleSub}>Help improve the platform with usage data</Text>
          </View>
          <Switch value={analyticsEnabled} onValueChange={setAnalyticsEnabled} trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }} thumbColor={analyticsEnabled ? '#2563EB' : '#9CA3AF'} />
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { fontSize: 15, color: '#2563EB', marginLeft: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleLabel: { fontSize: 14, color: '#1A1A2E', fontWeight: '500' },
  toggleSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
