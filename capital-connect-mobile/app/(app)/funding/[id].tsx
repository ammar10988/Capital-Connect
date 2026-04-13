import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Colors } from '../../../constants/colors';
import { format } from 'date-fns';
import type { FundingRound } from '../../../types';

function formatAmount(usd: number | null): string {
  if (!usd) return '—';
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd}`;
}

export default function FundingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [round, setRound] = useState<FundingRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchRound(id);
  }, [id]);

  async function fetchRound(roundId: string) {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('funding_rounds')
        .select('*')
        .eq('id', roundId)
        .single();
      if (err) throw err;
      setRound(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load funding round');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !round) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>{error ?? 'Round not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const date = round.announced_at ? format(new Date(round.announced_at), 'MMMM d, yyyy') : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(round.company_name[0] || '?').toUpperCase()}</Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.company}>{round.company_name}</Text>
          {round.stage && <Text style={styles.stage}>{round.stage}</Text>}
        </View>
        <View style={styles.amountBadge}>
          <Text style={styles.amount}>{formatAmount(round.amount_usd)}</Text>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        {round.sector && <Text style={styles.metaChip}>{round.sector}</Text>}
        {round.country && <Text style={styles.metaChip}>{round.country}</Text>}
        {date && <Text style={styles.metaChip}>📅 {date}</Text>}
      </View>

      {round.lead_investor && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lead Investor</Text>
          <Text style={styles.cardValue}>{round.lead_investor}</Text>
        </View>
      )}

      {round.description && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.description}>{round.description}</Text>
        </View>
      )}

      {round.location && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location</Text>
          <Text style={styles.cardValue}>📍 {round.location}</Text>
        </View>
      )}

      {round.source_url && (
        <TouchableOpacity style={styles.sourceBtn} onPress={() => Linking.openURL(round.source_url)}>
          <Text style={styles.sourceBtnText}>Read Source Article →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.elevated },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  backBtn: { marginBottom: 20 },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 60, height: 60, borderRadius: 14, backgroundColor: 'rgba(24,101,246,0.12)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  heroText: { flex: 1 },
  company: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  stage: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  amountBadge: { backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  amount: { fontSize: 15, fontWeight: '800', color: Colors.success },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metaChip: { fontSize: 12, color: Colors.textSecondary, backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: Colors.border },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  cardValue: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  description: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  sourceBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  sourceBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  notFoundText: { fontSize: 16, color: Colors.textMuted },
  backLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
