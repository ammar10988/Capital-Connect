import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Linking,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuthContext } from '../../../context/AuthContext';

interface FounderDetail {
  id: string;
  profile_id: string;
  company_name: string | null;
  sector: string | null;
  stage: string | null;
  arr: string | null;
  mom_growth: string | null;
  raise_amount: string | null;
  bio: string | null;
  problem_statement: string | null;
  target_market: string | null;
  website: string | null;
  linkedin_url: string | null;
  team_size: number | null;
  founded_year: number | null;
  funding_purpose: string | null;
  pitch_deck_url: string | null;
  verification_status: string;
  trust_badges: string[];
  views_count: number;
  created_at: string;
  profile: {
    first_name: string;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

function sectorColor(sector: string | null): string {
  const map: Record<string, string> = {
    'AI': '#3486e8', 'AI/ML': '#3486e8',
    'FinTech': '#10b981', 'Fintech': '#10b981',
    'HealthTech': '#ef4444', 'Healthtech': '#ef4444',
    'SaaS': '#2563EB', 'CleanTech': '#22c55e', 'Cleantech': '#22c55e',
    'EdTech': '#f59e0b', 'Edtech': '#f59e0b',
    'DeepTech': '#59cbef', 'Deeptech': '#59cbef',
    'AgriTech': '#84cc16', 'Agritech': '#84cc16',
  };
  return map[sector ?? ''] ?? '#2563EB';
}

export default function StartupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuthContext();

  const [startup, setStartup] = useState<FounderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkRowId, setBookmarkRowId] = useState<string | null>(null);
  const [introModalVisible, setIntroModalVisible] = useState(false);
  const [introMsg, setIntroMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) fetchStartup();
  }, [id]);

  async function fetchStartup() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('founder_profiles')
        .select('*, profile:profiles(first_name, last_name, avatar_url)')
        .eq('id', id)
        .single();

      if (err) throw err;
      const detail = data as unknown as FounderDetail;
      setStartup(detail);

      // Check existing bookmark
      if (user) {
        const { data: bm } = await supabase
          .from('founder_bookmarks')
          .select('id')
          .eq('investor_id', user.id)
          .eq('founder_profile_id', id)
          .maybeSingle();
        if (bm) {
          setBookmarked(true);
          setBookmarkRowId((bm as { id: string }).id);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load startup');
    } finally {
      setLoading(false);
    }
  }

  async function toggleBookmark() {
    if (!user || !id) return;
    if (bookmarked && bookmarkRowId) {
      const { error } = await supabase.from('founder_bookmarks').delete().eq('id', bookmarkRowId);
      if (!error) { setBookmarked(false); setBookmarkRowId(null); }
    } else {
      const { data, error } = await supabase
        .from('founder_bookmarks')
        .insert({ investor_id: user.id, founder_profile_id: id })
        .select('id')
        .single();
      if (!error && data) { setBookmarked(true); setBookmarkRowId((data as { id: string }).id); }
    }
  }

  async function handleSendIntro() {
    if (!user || !startup?.profile_id) return;
    setSending(true);
    try {
      const { error } = await supabase.from('founder_intro_requests').insert({
        investor_id: user.id,
        founder_id: startup.profile_id,
        message: introMsg.trim(),
        status: 'pending',
      });
      if (error) throw error;
      Alert.alert('Sent!', 'Your intro request has been sent to the founder.');
      setIntroModalVisible(false);
      setIntroMsg('');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send intro request');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error || !startup) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
        <Text style={styles.errorText}>{error ?? 'Startup not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchStartup}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sc = sectorColor(startup.sector);
  const companyName = startup.company_name ?? 'Unnamed Startup';
  const initial = companyName[0]?.toUpperCase() ?? '?';
  const founderDisplayName = startup.profile
    ? [startup.profile.first_name, startup.profile.last_name].filter(Boolean).join(' ')
    : 'Founder';
  const isInvestor = profile?.role === 'investor';
  const isVerified = startup.verification_status === 'verified' || startup.trust_badges?.includes('verified');

  return (
    <>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>{companyName}</Text>
          {isInvestor ? (
            <TouchableOpacity style={styles.bookmarkBtn} onPress={toggleBookmark}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={bookmarked ? '#2563EB' : '#6B7280'}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Company header */}
          <View style={styles.companyHeader}>
            {startup.profile?.avatar_url ? (
              <Image source={{ uri: startup.profile.avatar_url }} style={[styles.logoCircle, { borderRadius: 14 }]} />
            ) : (
              <View style={[styles.logoCircle, { backgroundColor: `${sc}20` }]}>
                <Text style={[styles.logoLetter, { color: sc }]}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.companyName}>{companyName}</Text>
              {startup.bio ? <Text style={styles.tagline} numberOfLines={2}>{startup.bio}</Text> : null}
              <View style={styles.tagsRow}>
                {startup.sector ? (
                  <View style={[styles.tag, { backgroundColor: `${sc}20` }]}>
                    <Text style={[styles.tagText, { color: sc }]}>{startup.sector}</Text>
                  </View>
                ) : null}
                {startup.stage ? (
                  <View style={styles.tagGray}>
                    <Text style={styles.tagGrayText}>{startup.stage}</Text>
                  </View>
                ) : null}
                {isVerified ? (
                  <View style={styles.tagVerified}>
                    <Ionicons name="shield-checkmark" size={10} color="#2563EB" />
                    <Text style={styles.tagVerifiedText}>Verified</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Founder row */}
          <View style={styles.founderRow}>
            <View style={styles.founderAvatar}>
              <Text style={styles.founderAvatarText}>{(founderDisplayName[0] ?? 'F').toUpperCase()}</Text>
            </View>
            <Text style={styles.founderName}>{founderDisplayName}</Text>
            {startup.linkedin_url ? (
              <TouchableOpacity style={styles.linkedinBtn} onPress={() => Linking.openURL(startup.linkedin_url!)}>
                <Ionicons name="logo-linkedin" size={14} color="#0077B5" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Metrics grid */}
          <View style={styles.metricsGrid}>
            {[
              { label: 'ARR', value: startup.arr ?? '—', color: '#10b981' },
              { label: 'MoM Growth', value: startup.mom_growth ?? '—', color: '#3486e8' },
              { label: 'Raising', value: startup.raise_amount ?? '—', color: '#2563EB' },
              { label: 'Team Size', value: startup.team_size != null ? String(startup.team_size) : '—', color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <View key={label} style={styles.metricCard}>
                <Text style={[styles.metricValue, { color }]}>{value}</Text>
                <Text style={styles.metricLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Problem */}
          {startup.problem_statement ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Problem</Text>
              <Text style={styles.sectionText}>{startup.problem_statement}</Text>
            </View>
          ) : null}

          {/* Target Market */}
          {startup.target_market ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Target Market</Text>
              <Text style={styles.sectionText}>{startup.target_market}</Text>
            </View>
          ) : null}

          {/* Use of Funds */}
          {startup.funding_purpose ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Use of Funds</Text>
              <Text style={styles.sectionText}>{startup.funding_purpose}</Text>
            </View>
          ) : null}

          {/* Details card */}
          <View style={styles.detailsCard}>
            {startup.founded_year != null ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Founded</Text>
                <Text style={styles.detailVal}>{startup.founded_year}</Text>
              </View>
            ) : null}
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Profile Views</Text>
              <Text style={styles.detailVal}>{startup.views_count}</Text>
            </View>
          </View>

          {/* Action buttons — investors only */}
          {isInvestor ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.introBtn} onPress={() => setIntroModalVisible(true)}>
                <Ionicons name="send-outline" size={15} color="#FFFFFF" />
                <Text style={styles.introBtnText}>Send Intro Request</Text>
              </TouchableOpacity>
              {startup.website ? (
                <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(startup.website!)}>
                  <Ionicons name="globe-outline" size={18} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={{ height: 48 }} />
        </ScrollView>
      </View>

      {/* Intro Modal */}
      <Modal visible={introModalVisible} transparent animationType="slide" onRequestClose={() => setIntroModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send Intro Request</Text>
            <Text style={styles.modalSubtitle}>Introduce yourself to {companyName}'s team.</Text>
            <TextInput
              style={styles.modalTextarea}
              placeholder="Hi, I'm interested in your startup because..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              value={introMsg}
              onChangeText={setIntroMsg}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setIntroModalVisible(false); setIntroMsg(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSendBtn, (!introMsg.trim() || sending) && { opacity: 0.5 }]}
                onPress={handleSendIntro}
                disabled={!introMsg.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.modalSendText}>Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 14, color: '#EF4444', marginTop: 12, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#F0F4FA' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginHorizontal: 12 },
  bookmarkBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  companyHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  logoCircle: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 22, fontWeight: '800' },
  companyName: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  tagline: { fontSize: 12, color: '#6B7280', marginBottom: 8, lineHeight: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '600' },
  tagGray: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F3F4F6' },
  tagGrayText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  tagVerified: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#EFF6FF' },
  tagVerifiedText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  founderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  founderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center' },
  founderAvatarText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  founderName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  linkedinBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#E8F4FD', alignItems: 'center', justifyContent: 'center' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metricCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  metricValue: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  metricLabel: { fontSize: 11, color: '#9CA3AF' },
  section: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  sectionText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  detailsCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailKey: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  detailVal: { fontSize: 13, color: '#1A1A2E', fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 12 },
  introBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563EB', borderRadius: 14, height: 48 },
  introBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  iconBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  modalTextarea: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 14, color: '#1A1A2E', height: 110, backgroundColor: '#F9FAFB', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  modalCancelText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  modalSendBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  modalSendText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
});
