import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import type { FundingRound } from '../../types';
import { format } from 'date-fns';

interface FundingCardProps {
  round: FundingRound;
  onPress: () => void;
}

function formatAmount(usd: number | null): string {
  if (!usd) return '—';
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd}`;
}

export function FundingCard({ round, onPress }: FundingCardProps) {
  const date = round.announced_at ? format(new Date(round.announced_at), 'MMM d, yyyy') : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(round.company_name[0] || '?').toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.company} numberOfLines={1}>{round.company_name}</Text>
          <Text style={styles.meta}>{[round.stage, round.sector, date].filter(Boolean).join(' · ')}</Text>
        </View>
        <View style={styles.amountBadge}>
          <Text style={styles.amount}>{formatAmount(round.amount_usd)}</Text>
        </View>
      </View>
      {round.lead_investor && (
        <Text style={styles.investor}>Lead: {round.lead_investor}</Text>
      )}
      {round.description && (
        <Text style={styles.description} numberOfLines={2}>{round.description}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(24,101,246,0.12)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  info: { flex: 1 },
  company: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  amountBadge: { backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  amount: { fontSize: 13, fontWeight: '700', color: Colors.success },
  investor: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  description: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
});
