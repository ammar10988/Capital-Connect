import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFunding } from '../../../hooks/useFunding';
import { Loader } from '../../../components/ui/Loader';

const STAGES = ['All', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'];
const TIME_FILTERS = ['All Time', 'This Week', 'This Month'];

function getRoundPillStyle(round: string | null): { bg: string; text: string } {
  const r = (round ?? '').toLowerCase();
  if (r.includes('pre')) return { bg: '#F3F4F6', text: '#6B7280' };
  if (r.includes('seed')) return { bg: '#DBEAFE', text: '#2563EB' };
  if (r.includes('series a')) return { bg: '#D1FAE5', text: '#22C55E' };
  if (r.includes('series b')) return { bg: '#FEF3C7', text: '#F59E0B' };
  if (r.includes('series c') || r.includes('growth')) return { bg: '#EDE9FE', text: '#7C3AED' };
  return { bg: '#F3F4F6', text: '#6B7280' };
}

function formatAmount(amount: number | null): string {
  if (!amount) return '—';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function FundingScreen() {
  const router = useRouter();
  const { rounds, loading, fetchRounds } = useFunding();
  const [stage, setStage] = useState('All');
  const [timeFilter, setTimeFilter] = useState('All Time');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    fetchRounds(stage === 'All' ? undefined : stage);
  }, [stage]);

  const filtered = search
    ? rounds.filter(r => r.company_name.toLowerCase().includes(search.toLowerCase()))
    : rounds;

  const totalCapital = rounds.reduce((sum, r) => sum + (r.amount_usd ?? 0), 0);
  const largestRound = Math.max(...rounds.map(r => r.amount_usd ?? 0), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Text style={styles.headerTitle}>Funding Tracker</Text>
      <Text style={styles.headerSubtitle}>Real-time funding rounds across the startup ecosystem</Text>

      {/* Stat Cards 2x2 */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="trending-up-outline" size={18} color="#22C55E" />
            <Text style={styles.statValue}>{rounds.length}</Text>
            <Text style={styles.statLabel}>Total Rounds Tracked</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="cash-outline" size={18} color="#2563EB" />
            <Text style={styles.statValue}>{formatAmount(totalCapital)}</Text>
            <Text style={styles.statLabel}>Total Capital Raised</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="calendar-outline" size={18} color="#F59E0B" />
            <Text style={styles.statValue}>{rounds.slice(0, 7).length}</Text>
            <Text style={styles.statLabel}>This Week's Rounds</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="flash-outline" size={18} color="#22C55E" />
            <Text style={styles.statValue}>{formatAmount(largestRound)}</Text>
            <Text style={styles.statLabel}>Largest Round</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by company..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </View>

      {/* Stage Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={styles.pillsRow}>
          {STAGES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, stage === s && styles.pillActive]}
              onPress={() => setStage(s)}
            >
              <Text style={[styles.pillText, stage === s && styles.pillTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Time Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={styles.pillsRow}>
          {TIME_FILTERS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.pill, timeFilter === t && styles.pillActiveDark]}
              onPress={() => setTimeFilter(t)}
            >
              <Text style={[styles.pillText, timeFilter === t && styles.pillTextActiveDark]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <Loader />
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Funding Rounds</Text>
            <View style={styles.resultsBadge}>
              <Text style={styles.resultsBadgeText}>{filtered.length} results</Text>
            </View>
          </View>

          {/* Column Headers */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.colHeaderRow}>
                {['COMPANY', 'ROUND', 'AMOUNT', 'SECTOR', 'DATE'].map((col) => (
                  <Text key={col} style={[styles.colHeader, { width: col === 'COMPANY' ? 140 : col === 'AMOUNT' ? 80 : 90 }]}>{col}</Text>
                ))}
              </View>

              {filtered.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No funding rounds found</Text>
                </View>
              ) : (
                filtered.slice(0, 30).map((round, i) => {
                  const pillStyle = getRoundPillStyle(round.round_type);
                  return (
                    <View key={round.id} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                      <Text style={[styles.tableCell, styles.companyCell, { width: 140 }]} numberOfLines={1}>{round.company_name}</Text>
                      <View style={{ width: 90, alignItems: 'flex-start' }}>
                        {round.round_type ? (
                          <View style={[styles.roundPill, { backgroundColor: pillStyle.bg }]}>
                            <Text style={[styles.roundPillText, { color: pillStyle.text }]} numberOfLines={1}>{round.round_type}</Text>
                          </View>
                        ) : <Text style={styles.tableCell}>—</Text>}
                      </View>
                      <Text style={[styles.tableCell, { color: '#22C55E', fontWeight: '600', width: 80 }]}>{formatAmount(round.amount_usd)}</Text>
                      <Text style={[styles.tableCell, { width: 90 }]} numberOfLines={1}>{round.sector ?? '—'}</Text>
                      <Text style={[styles.tableCell, { width: 90, color: '#6B7280' }]} numberOfLines={1}>
                        {round.announced_at ? new Date(round.announced_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 32 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  statsGrid: { gap: 10, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  searchBar: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
  searchBarFocused: { borderColor: '#2563EB' },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pillActiveDark: { backgroundColor: '#1A1A2E', borderColor: '#1A1A2E' },
  pillText: { fontSize: 12, color: '#6B7280' },
  pillTextActive: { color: '#FFFFFF' },
  pillTextActiveDark: { color: '#FFFFFF' },
  tableCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  tableTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  resultsBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  resultsBadgeText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  colHeaderRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 4 },
  colHeader: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.6 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#FAFAFA', borderRadius: 6 },
  tableCell: { fontSize: 13, color: '#1A1A2E' },
  companyCell: { fontWeight: '600' },
  roundPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, maxWidth: 85 },
  roundPillText: { fontSize: 11, fontWeight: '600' },
  emptyRow: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});
