import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthContext } from '../../../context/AuthContext';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Colors } from '../../../constants/colors';
import type { ScrapedInvestor } from '../../../types';

export default function InvestorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuthContext();
  const [investor, setInvestor] = useState<ScrapedInvestor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [introSent, setIntroSent] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [introMsg, setIntroMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchInvestor(id);
    if (user) checkIntroStatus(id);
  }, [id, user]);

  async function checkIntroStatus(investorId: string) {
    if (!user) return;
    const rawId = investorId.startsWith('platform_')
      ? investorId.replace('platform_', '')
      : investorId;

    const { data: intros } = await supabase
      .from('introductions')
      .select('id')
      .eq('founder_id', user.id)
      .eq('investor_id', rawId)
      .limit(1);

    if (intros && intros.length > 0) {
      setIntroSent(true);
    }
  }

  async function fetchInvestor(investorId: string) {
    setLoading(true);
    setError(null);
    try {
      const isPlatform = investorId.startsWith('platform_');
      if (isPlatform) {
        const actualId = investorId.replace('platform_', '');
        const { data, error: err } = await supabase
          .from('investor_profiles')
          .select('id, user_id, title, location, sectors, stage_preference, ticket_size_min, ticket_size_max, investment_thesis, linkedin_url, website_url, actively_investing, is_verified, response_rate, portfolio_count, created_at, fund_name, bank_name, profile:profiles(first_name, last_name, company)')
          .eq('id', actualId)
          .single();
        if (err) throw err;
        if (data) {
          const p = (data as any).profile;
          const name = p ? `${p.first_name} ${p.last_name ?? ''}`.trim() : 'Capital Connect Investor';
          setInvestor({
            id: investorId,
            name,
            institution: data.fund_name || data.bank_name || p?.company || null,
            title: data.title,
            location: data.location,
            sectors: data.sectors ?? [],
            stages: data.stage_preference ?? [],
            check_min: data.ticket_size_min ? String(data.ticket_size_min) : null,
            check_max: data.ticket_size_max ? String(data.ticket_size_max) : null,
            investment_thesis: data.investment_thesis,
            portfolio_count: data.portfolio_count,
            verified: data.is_verified ?? false,
            response_rate: data.response_rate,
            actively_investing: data.actively_investing ?? true,
            email: null,
            website: data.website_url,
            linkedin_url: data.linkedin_url,
            is_new: false,
            date_added: data.created_at,
            is_platform_member: true,
          });
        }
      } else {
        const { data, error: err } = await supabase
          .from('scraped_investors')
          .select('*')
          .eq('id', investorId)
          .single();
        if (err) throw err;
        if (data) {
          setInvestor({
            ...data,
            sectors: data.sectors ?? [],
            stages: data.stages ?? [],
            portfolio_count: data.portfolio_count ?? null,
            is_platform_member: false,
          });
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load investor');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendIntro() {
    if (!user || !investor) return;
    if (!introMsg.trim()) {
      Alert.alert('Message Required', 'Please write a message for your intro request.');
      return;
    }
    setSending(true);
    try {
      const { error: fnError } = await supabase.functions.invoke('send-intro', {
        body: { investor_id: id, message: introMsg.trim() },
      });
      if (fnError) throw fnError;
      setIntroSent(true);
      setShowIntroModal(false);
      setIntroMsg('');
      Alert.alert('Success', 'Your intro request has been sent.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send intro request. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !investor) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>{error ?? 'Investor not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFounder = profile?.role === 'founder';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <Avatar name={investor.name} size={72} />
          <View style={styles.heroText}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{investor.name}</Text>
              {investor.is_platform_member && (
                <View style={styles.memberBadge}>
                  <Text style={styles.memberText}>✦ Capital Connect</Text>
                </View>
              )}
            </View>
            {investor.title && <Text style={styles.title}>{investor.title}</Text>}
            {investor.institution && <Text style={styles.institution}>{investor.institution}</Text>}
            {investor.location && (
              <View style={styles.locationRow}>
                <Text style={styles.location}>{investor.location}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: investor.actively_investing ? Colors.success : Colors.textMuted }]} />
          <Text style={styles.statusText}>{investor.actively_investing ? 'Actively investing' : 'Not actively investing'}</Text>
          {investor.verified && <Text style={styles.verified}>Verified</Text>}
        </View>

        {/* Request Intro Button (for founders) */}
        {isFounder && (
          <TouchableOpacity
            style={[styles.introBtn, introSent && styles.introBtnDone]}
            onPress={() => !introSent && setShowIntroModal(true)}
            disabled={introSent}
          >
            <Text style={styles.introBtnText}>
              {introSent ? 'Intro Requested' : 'Request Intro'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Investment thesis */}
        {investor.investment_thesis && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Investment Thesis</Text>
            <Text style={styles.thesis}>{investor.investment_thesis}</Text>
          </View>
        )}

        {/* Sectors */}
        {investor.sectors.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sectors</Text>
            <View style={styles.badges}>
              {investor.sectors.map(s => (
                <Badge key={s} label={s} color="#E6F1FB" textColor="#185FA5" />
              ))}
            </View>
          </View>
        )}

        {/* Stages */}
        {investor.stages.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Stage Preference</Text>
            <View style={styles.badges}>
              {investor.stages.map(s => (
                <Badge key={s} label={s} color="#FFF3E0" textColor="#C2410C" />
              ))}
            </View>
          </View>
        )}

        {/* Ticket size */}
        {(investor.check_min || investor.check_max) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ticket Size</Text>
            <Text style={styles.ticketText}>
              ${investor.check_min ?? '—'} — ${investor.check_max ?? '—'}
            </Text>
          </View>
        )}

        {/* Portfolio */}
        {investor.portfolio_count != null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Portfolio</Text>
            <Text style={styles.metaValue}>{investor.portfolio_count} companies</Text>
          </View>
        )}

        {/* Contact */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact</Text>
          {investor.email && (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${investor.email}`)}>
              <Text style={styles.link}>Email: {investor.email}</Text>
            </TouchableOpacity>
          )}
          {investor.linkedin_url && (
            <TouchableOpacity onPress={() => Linking.openURL(investor.linkedin_url!)}>
              <Text style={styles.link}>LinkedIn</Text>
            </TouchableOpacity>
          )}
          {investor.website && (
            <TouchableOpacity onPress={() => Linking.openURL(investor.website!)}>
              <Text style={styles.link}>Website</Text>
            </TouchableOpacity>
          )}
          {!investor.email && !investor.linkedin_url && !investor.website && (
            <Text style={styles.noContact}>No contact info available</Text>
          )}
        </View>
      </ScrollView>

      {/* Intro Modal */}
      <Modal visible={showIntroModal} transparent animationType="slide" onRequestClose={() => setShowIntroModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Request Intro to {investor.name}</Text>
            <Text style={styles.modalSubtitle}>Write a brief message about why you'd like to connect.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Hi, I'm the founder of [startup]. I'd love to connect because..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={introMsg}
              onChangeText={text => setIntroMsg(text.slice(0, 500))}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{introMsg.length}/500</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowIntroModal(false); setIntroMsg(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, (!introMsg.trim() || sending) && { opacity: 0.5 }]}
                onPress={handleSendIntro}
                disabled={!introMsg.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={styles.sendBtnText}>Send Request</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.elevated },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  backBtn: { marginBottom: 20 },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  hero: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  heroText: { flex: 1 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  memberBadge: { backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  memberText: { fontSize: 10, fontWeight: '700', color: '#059669' },
  title: { fontSize: 13, color: Colors.textSecondary },
  institution: { fontSize: 13, color: Colors.textMuted },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  location: { fontSize: 12, color: Colors.textMuted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, color: Colors.textSecondary },
  verified: { fontSize: 12, color: Colors.success, fontWeight: '700', marginLeft: 8 },
  introBtn: { backgroundColor: '#2563EB', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  introBtnDone: { backgroundColor: '#6B7280' },
  introBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  thesis: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ticketText: { fontSize: 15, fontWeight: '700', color: '#C2410C' },
  metaValue: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  link: { fontSize: 14, color: Colors.primary, fontWeight: '600', marginBottom: 8 },
  noContact: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  notFoundText: { fontSize: 16, color: Colors.textMuted },
  backLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  modalInput: { height: 120, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F8FAFC', padding: 12, fontSize: 14, color: '#1A1A2E' },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  sendBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
});
