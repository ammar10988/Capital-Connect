import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../context/AuthContext';
import { useIntroductions, type IntroRequest } from '../../hooks/useIntroductions';

const TABS = ['Pending', 'Accepted', 'All'] as const;
type Tab = typeof TABS[number];

function counterpartyName(intro: IntroRequest, role: 'investor' | 'founder'): string {
  const p = role === 'investor' ? intro.founder : intro.investor;
  if (!p) return 'Unknown';
  return [p.first_name, p.last_name].filter(Boolean).join(' ');
}

function counterpartyCompany(intro: IntroRequest, role: 'investor' | 'founder'): string | null {
  const p = role === 'investor' ? intro.founder : intro.investor;
  return p?.company ?? null;
}

function statusColor(status: string): string {
  if (status === 'accepted') return '#22C55E';
  if (status === 'declined') return '#EF4444';
  return '#F59E0B';
}

function statusBg(status: string): string {
  if (status === 'accepted') return '#DCFCE7';
  if (status === 'declined') return '#FEE2E2';
  return '#FEF3C7';
}

export default function IntroductionsScreen() {
  const { user, profile } = useAuthContext();
  const role = profile?.role ?? null;
  const { intros, loading, error, fetchIntros, updateStatus } = useIntroductions(user?.id, role);
  const [activeTab, setActiveTab] = useState<Tab>('Pending');

  useEffect(() => {
    fetchIntros();
  }, [fetchIntros]);

  const filtered = intros.filter(i => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return i.status === 'pending';
    if (activeTab === 'Accepted') return i.status === 'accepted';
    return true;
  });

  const total = intros.length;
  const pending = intros.filter(i => i.status === 'pending').length;
  const accepted = intros.filter(i => i.status === 'accepted').length;
  const responseRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  async function handleRespond(intro: IntroRequest, status: 'accepted' | 'declined') {
    const label = status === 'accepted' ? 'Accept' : 'Decline';
    Alert.alert(
      `${label} Request`,
      `Are you sure you want to ${label.toLowerCase()} this intro?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: status === 'declined' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateStatus(intro.id, status);
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update status');
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Intro Requests</Text>
        <TouchableOpacity onPress={fetchIntros} disabled={loading}>
          <Ionicons name="refresh-outline" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Stat Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loading ? '—' : total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{loading ? '—' : pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#22C55E' }]}>{loading ? '—' : accepted}</Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loading ? '—' : `${responseRate}%`}</Text>
            <Text style={styles.statLabel}>Response Rate</Text>
          </View>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
          <Text style={styles.emptyTitle}>Failed to load</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchIntros}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="chatbubble-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No introductions found</Text>
          <Text style={styles.emptySubtitle}>
            {role === 'investor'
              ? 'Browse startups and send intro requests to get started'
              : 'Investors will send you intro requests here'}
          </Text>
        </View>
      ) : (
        filtered.map((intro) => (
          <View key={intro.id} style={styles.introCard}>
            {/* Card header */}
            <View style={styles.introHeader}>
              <View style={styles.introAvatar}>
                <Text style={styles.introAvatarText}>
                  {(counterpartyName(intro, role ?? 'investor')[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.introName}>{counterpartyName(intro, role ?? 'investor')}</Text>
                {counterpartyCompany(intro, role ?? 'investor') ? (
                  <Text style={styles.introCompany}>{counterpartyCompany(intro, role ?? 'investor')}</Text>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusBg(intro.status) }]}>
                <Text style={[styles.statusText, { color: statusColor(intro.status) }]}>
                  {intro.status.charAt(0).toUpperCase() + intro.status.slice(1)}
                </Text>
              </View>
            </View>

            {/* Message */}
            {intro.message ? (
              <Text style={styles.introMessage} numberOfLines={3}>{intro.message}</Text>
            ) : null}

            {/* Date */}
            <Text style={styles.introDate}>
              {new Date(intro.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>

            {/* Accept / Decline buttons for founders with pending requests */}
            {role === 'founder' && intro.status === 'pending' ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleRespond(intro, 'accepted')}
                >
                  <Ionicons name="checkmark-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => handleRespond(intro, 'declined')}
                >
                  <Ionicons name="close-outline" size={15} color="#EF4444" />
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  statsGrid: { gap: 10, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  tabBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  tabBtnText: { fontSize: 13, color: '#6B7280' },
  tabBtnTextActive: { color: '#FFFFFF', fontWeight: '600' },
  centered: { paddingVertical: 40, alignItems: 'center' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40, alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  introCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  introHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  introAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  introAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  introName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  introCompany: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  introMessage: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
  introDate: { fontSize: 11, color: '#9CA3AF' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#22C55E', borderRadius: 10, height: 38,
  },
  acceptBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#FEF2F2', borderRadius: 10, height: 38,
    borderWidth: 1, borderColor: '#FECACA',
  },
  declineBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
});
