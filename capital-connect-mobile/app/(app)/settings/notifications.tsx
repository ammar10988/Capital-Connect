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

interface ToggleRowProps {
  label: string;
  sub?: string;
  value: boolean;
  onToggle: () => void;
  isLast?: boolean;
}

function ToggleRow({ label, sub, value, onToggle, isLast }: ToggleRowProps) {
  return (
    <View style={[styles.toggleRow, isLast && styles.toggleRowLast]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sub && <Text style={styles.toggleSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
        thumbColor={value ? '#2563EB' : '#9CA3AF'}
      />
    </View>
  );
}

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const [emailInvestors, setEmailInvestors] = useState(true);
  const [emailFunding, setEmailFunding] = useState(true);
  const [emailNews, setEmailNews] = useState(false);
  const [emailWeekly, setEmailWeekly] = useState(true);
  const [appIntros, setAppIntros] = useState(true);
  const [appUpdates, setAppUpdates] = useState(true);
  const [appDeals, setAppDeals] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back-outline" size={18} color="#2563EB" />
        <Text style={styles.backText}>Settings</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Notifications</Text>
      <Text style={styles.headerSubtitle}>Manage how you receive updates</Text>

      {/* Email Notifications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>EMAIL NOTIFICATIONS</Text>
        <ToggleRow label="New Investor Matches" sub="When new investors match your profile" value={emailInvestors} onToggle={() => setEmailInvestors(!emailInvestors)} />
        <ToggleRow label="Funding Round Alerts" sub="New funding rounds in your sectors" value={emailFunding} onToggle={() => setEmailFunding(!emailFunding)} />
        <ToggleRow label="News Digest" sub="Daily news from your followed sectors" value={emailNews} onToggle={() => setEmailNews(!emailNews)} />
        <ToggleRow label="Weekly Summary" sub="Your weekly activity summary" value={emailWeekly} onToggle={() => setEmailWeekly(!emailWeekly)} isLast />
      </View>

      {/* In-App Notifications */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>IN-APP NOTIFICATIONS</Text>
        <ToggleRow label="Intro Requests" sub="When founders send you intros" value={appIntros} onToggle={() => setAppIntros(!appIntros)} />
        <ToggleRow label="Profile Updates" sub="Changes to startups you're watching" value={appUpdates} onToggle={() => setAppUpdates(!appUpdates)} />
        <ToggleRow label="Deal Updates" sub="Updates on deals in your pipeline" value={appDeals} onToggle={() => setAppDeals(!appDeals)} isLast />
      </View>

      <TouchableOpacity style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>Save Preferences</Text>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleLabel: { fontSize: 14, color: '#1A1A2E', fontWeight: '500' },
  toggleSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
