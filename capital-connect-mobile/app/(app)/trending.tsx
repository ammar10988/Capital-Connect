import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTrending, type PublicStartup } from '../../hooks/useTrending';
import { Loader } from '../../components/ui/Loader';

const SECTOR_CHIPS = ['All', 'AI', 'SaaS', 'Fintech', 'Healthtech', 'Deeptech', 'EV', 'Cleantech', 'Climate', 'Edtech', 'Agritech', 'Ecommerce', 'Logistics', 'Biotech', 'Blockchain'];

function formatAmount(usd: number | null | undefined): string {
  if (!usd) return '';
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${Math.round(usd / 1_000_000)}M`;
  return `$${Math.round(usd / 1_000)}K`;
}

function daysAgo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

function getSignalColor(signal: string | null): { bg: string; text: string } {
  if (signal === 'Hot Deal') return { bg: '#FFF3E0', text: '#E65100' };
  if (signal === 'Strong Growth') return { bg: '#E8F5E9', text: '#2E7D32' };
  return { bg: '#E6F1FB', text: '#185FA5' };
}

function StartupRow({ startup }: { startup: PublicStartup }) {
  const signal = getSignalColor(startup.trend_signal);
  const metaItems = [
    startup.city,
    startup.funding_amount ? `Raising ${startup.funding_amount}` : null,
    startup.investor_name ? `Led by ${startup.investor_name}` : null,
    startup.source_name ? `via ${startup.source_name}` : null,
    daysAgo(startup.announced_date),
  ].filter(Boolean) as string[];

  return (
    <TouchableOpacity
      style={styles.startupRow}
      onPress={() => startup.source_url && Linking.openURL(startup.source_url)}
      activeOpacity={0.85}
    >
      <Text style={[styles.rank, { color: (startup.rank ?? 99) <= 3 ? '#185FA5' : '#9CA3AF' }]}>
        #{startup.rank ?? '–'}
      </Text>
      <View style={styles.startupInfo}>
        <View style={styles.startupNameRow}>
          <Text style={styles.startupName}>{startup.company_name}</Text>
          {startup.sector && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{startup.sector}</Text>
            </View>
          )}
          {startup.stage && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{startup.stage}</Text>
            </View>
          )}
          {startup.trend_signal && (
            <View style={[styles.signalBadge, { backgroundColor: signal.bg }]}>
              <Text style={[styles.signalText, { color: signal.text }]}>{startup.trend_signal}</Text>
            </View>
          )}
        </View>
        {startup.description ? (
          <Text style={styles.startupDesc} numberOfLines={2}>{startup.description}</Text>
        ) : null}
        {metaItems.length > 0 && (
          <Text style={styles.meta} numberOfLines={1}>{metaItems.join(' · ')}</Text>
        )}
        {startup.source_url && (
          <Text style={styles.readLink}>Read article</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function TrendingScreen() {
  const { startups, loading, error, fetchTrending, getSectorStats } = useTrending();
  const [activeTab, setActiveTab] = useState<'startups' | 'sectors'>('startups');
  const [activeSector, setActiveSector] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const PAGE_SIZE = 6;

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const totalFunded = startups.length;
  const totalRaisingUsd = startups.reduce((sum, s) => sum + (s.funding_amount_usd ?? 0), 0);
  const hotDeals = startups.filter(s => s.is_hot).length;
  const sectorStats = getSectorStats(startups);
  const hotSectorsCount = sectorStats.length;
  const topSector = sectorStats[0]?.name ?? '';

  const insightText = topSector && totalFunded > 0
    ? `${topSector} leads this week with ${sectorStats[0]?.count} startups. ${hotDeals} of ${totalFunded} are hot deals.`
    : 'Fetching latest startup intelligence from Indian startup news...';

  const filteredStartups = startups
    .filter(s => activeSector === 'All' || s.sector === activeSector)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  const visibleStartups = showAll ? filteredStartups : filteredStartups.slice(0, PAGE_SIZE);

  const statCards = [
    { icon: 'trending-up-outline' as const, iconColor: '#185FA5', value: String(totalFunded), label: 'Recently Funded', sub: 'from public news · last 7 days' },
    { icon: 'cash-outline' as const, iconColor: '#22C55E', value: formatAmount(totalRaisingUsd) || '–', label: 'Total Raising', sub: 'across all sectors' },
    { icon: 'flash-outline' as const, iconColor: '#7C3AED', value: String(hotSectorsCount), label: 'Hot Sectors', sub: topSector ? `${topSector} leading` : 'loading...' },
    { icon: 'flame-outline' as const, iconColor: '#EF4444', value: String(hotDeals), label: 'Hot Deals', sub: 'Series A+ stage' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTrending} />}
    >
      <Text style={styles.headerTitle}>Trending</Text>
      <Text style={styles.headerSubtitle}>Real-time intelligence from the Indian startup ecosystem</Text>

      {/* Stat Cards 2x2 */}
      {loading ? (
        <Loader />
      ) : (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              {statCards.slice(0, 2).map((card, i) => (
                <View key={i} style={styles.statCard}>
                  <View style={styles.statIconRow}>
                    <View style={styles.statIconCircle}>
                      <Ionicons name={card.icon} size={16} color={card.iconColor} />
                    </View>
                  </View>
                  <Text style={styles.statValue}>{card.value}</Text>
                  <Text style={styles.statLabel}>{card.label}</Text>
                  <Text style={styles.statSub}>{card.sub}</Text>
                </View>
              ))}
            </View>
            <View style={styles.statsRow}>
              {statCards.slice(2, 4).map((card, i) => (
                <View key={i} style={styles.statCard}>
                  <View style={styles.statIconRow}>
                    <View style={styles.statIconCircle}>
                      <Ionicons name={card.icon} size={16} color={card.iconColor} />
                    </View>
                  </View>
                  <Text style={styles.statValue}>{card.value}</Text>
                  <Text style={styles.statLabel}>{card.label}</Text>
                  <Text style={styles.statSub}>{card.sub}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Weekly Insight */}
          <View style={styles.insightBanner}>
            <View style={styles.insightHeader}>
              <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
              <Text style={styles.insightLabel}>WEEKLY INSIGHT</Text>
            </View>
            <Text style={styles.insightText}>{insightText}</Text>
          </View>
        </>
      )}

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        {(['startups', 'sectors'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'startups' ? 'Trending Startups' : 'Sector Intelligence'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'startups' && (
        <>
          {/* Sector Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={styles.chipsRow}>
              {SECTOR_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={[styles.chip, activeSector === chip && styles.chipActive]}
                  onPress={() => { setActiveSector(chip); setShowAll(false); }}
                >
                  <Text style={[styles.chipText, activeSector === chip && styles.chipTextActive]}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {error ? (
            <View style={styles.emptyCard}>
              <Ionicons name="warning-outline" size={40} color="#EF4444" />
              <Text style={styles.emptyTitle}>Failed to load data</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchTrending}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredStartups.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="trending-up-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {activeSector === 'All' ? 'No trending data yet' : `No ${activeSector} startups this week`}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeSector === 'All' ? 'Check back soon — scraper runs daily at 6 AM IST' : 'Try a different sector'}
              </Text>
            </View>
          ) : (
            <>
              {visibleStartups.map(startup => (
                <StartupRow key={startup.id} startup={startup} />
              ))}
              {!showAll && filteredStartups.length > PAGE_SIZE && (
                <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAll(true)}>
                  <Text style={styles.showMoreText}>View all {filteredStartups.length} startups</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'sectors' && (
        <>
          <Text style={styles.sectorNote}>Based on last 7 days of funding news</Text>
          {sectorStats.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="bar-chart-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No sector data available yet</Text>
              <Text style={styles.emptySubtitle}>Populates automatically once the scraper runs</Text>
            </View>
          ) : (
            sectorStats.map((sector, i) => {
              const maxCount = sectorStats[0]?.count ?? 1;
              const barWidth = Math.round((sector.count / maxCount) * 100);
              return (
                <View key={sector.name} style={styles.sectorCard}>
                  <View style={styles.sectorCardHeader}>
                    <Text style={styles.sectorName}>{sector.name}</Text>
                    <View style={styles.sectorCountBadge}>
                      <Text style={styles.sectorCountText}>{sector.count} startup{sector.count !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  <Text style={styles.sectorTotal}>{formatAmount(sector.totalUsd) || '–'}</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${barWidth}%` }]} />
                  </View>
                  <Text style={styles.sectorCompanies}>{sector.topCompanies.join(' · ')}</Text>
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 32 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  statsGrid: { gap: 10, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIconRow: { marginBottom: 8 },
  statIconCircle: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#EBF2FB', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  insightBanner: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  insightLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 },
  insightText: { fontSize: 13, color: '#475569', lineHeight: 20 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#185FA5' },
  tabText: { fontSize: 14, color: '#9CA3AF' },
  tabTextActive: { color: '#185FA5', fontWeight: '600' },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: '#185FA5', borderColor: '#185FA5' },
  chipText: { fontSize: 13, color: '#6B7280' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '500' },
  startupRow: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16, marginBottom: 8, flexDirection: 'row', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  rank: { fontSize: 11, fontWeight: '600', width: 28, flexShrink: 0, paddingTop: 2 },
  startupInfo: { flex: 1 },
  startupNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 6 },
  startupName: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  badge: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: '#6B7280' },
  signalBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  signalText: { fontSize: 10, fontWeight: '600' },
  startupDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 6 },
  meta: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  readLink: { fontSize: 12, color: '#185FA5', fontWeight: '500' },
  showMoreBtn: { borderWidth: 1, borderColor: '#B5D4F4', borderRadius: 8, backgroundColor: '#E6F1FB', padding: 10, alignItems: 'center', marginTop: 4 },
  showMoreText: { fontSize: 13, color: '#185FA5', fontWeight: '500' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40, alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginTop: 12, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#185FA5', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  sectorNote: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 12 },
  sectorCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  sectorCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectorName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  sectorCountBadge: { backgroundColor: '#E6F1FB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  sectorCountText: { fontSize: 10, color: '#185FA5', fontWeight: '500' },
  sectorTotal: { fontSize: 20, fontWeight: '600', color: '#185FA5', marginBottom: 8 },
  progressBg: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, marginBottom: 8 },
  progressFill: { height: 4, backgroundColor: '#185FA5', borderRadius: 2 },
  sectorCompanies: { fontSize: 11, color: '#9CA3AF' },
});
