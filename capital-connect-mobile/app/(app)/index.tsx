import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../context/AuthContext';
import { useStartups } from '../../hooks/useStartups';
import { useFunding } from '../../hooks/useFunding';
import { useNews } from '../../hooks/useNews';
import { supabase } from '../../lib/supabase';
import { StartupCard } from '../../components/startups/StartupCard';
import { FundingCard } from '../../components/funding/FundingCard';
import { NewsCard } from '../../components/news/NewsCard';
import { Loader } from '../../components/ui/Loader';

function getTypeBadge(role: string | null, investorType: string | null) {
  if (role === 'founder') return { label: 'Founder', bg: '#F0FDF4', text: '#22C55E' };
  switch (investorType) {
    case 'angel': return { label: 'Angel Investor', bg: '#EFF6FF', text: '#2563EB' };
    case 'venture-capital': return { label: 'VC Investor', bg: '#EFF6FF', text: '#2563EB' };
    case 'bank': return { label: 'Bank Investor', bg: '#EFF6FF', text: '#2563EB' };
    case 'nbfc': return { label: 'NBFC Investor', bg: '#EFF6FF', text: '#2563EB' };
    case 'family-office': return { label: 'Family Office Investor', bg: '#D1FAE5', text: '#22C55E' };
    case 'corporate-venture': return { label: 'CVC Investor', bg: '#FEF3C7', text: '#F59E0B' };
    default: return { label: 'Investor', bg: '#EFF6FF', text: '#2563EB' };
  }
}

function getDashboardTitle(role: string | null, investorType: string | null) {
  if (role === 'founder') return 'Startup Founder Dashboard';
  switch (investorType) {
    case 'angel': return 'Angel Investor Dashboard';
    case 'venture-capital': return 'Venture Capital Dashboard';
    case 'bank': return 'Bank Dashboard';
    case 'nbfc': return 'NBFC Dashboard';
    case 'family-office': return 'Family Office Dashboard';
    case 'corporate-venture': return 'Corporate VC Dashboard';
    default: return 'Investor Dashboard';
  }
}

interface StatCardData {
  iconBg: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
  subLink?: string;
}

function getStatCards(role: string | null, investorType: string | null, counts: { inv: number | null; fund: number | null; news: number | null }): StatCardData[] {
  if (role === 'founder') {
    return [
      { iconBg: '#DBEAFE', icon: 'eye-outline', iconColor: '#2563EB', value: '0', label: 'Profile Views' },
      { iconBg: '#D1FAE5', icon: 'bookmark-outline', iconColor: '#22C55E', value: '0', label: 'Bookmarked By' },
      { iconBg: '#DCFCE7', icon: 'chatbubble-outline', iconColor: '#22C55E', value: '0', label: 'Intro Requests' },
      { iconBg: '#FEF3C7', icon: 'download-outline', iconColor: '#F59E0B', value: '0', label: 'Deck Downloads' },
    ];
  }
  if (investorType === 'bank' || investorType === 'nbfc') {
    return [
      { iconBg: '#DBEAFE', icon: 'document-outline', iconColor: '#2563EB', value: String(counts.fund ?? 0), label: 'Total Applications' },
      { iconBg: '#FEF3C7', icon: 'time-outline', iconColor: '#F59E0B', value: '0', label: 'Under Review' },
      { iconBg: '#D1FAE5', icon: 'checkmark-circle-outline', iconColor: '#22C55E', value: '0', label: 'Approved' },
      { iconBg: '#DBEAFE', icon: 'cash-outline', iconColor: '#2563EB', value: '$0', label: 'Avg Deal Size' },
    ];
  }
  if (investorType === 'family-office') {
    return [
      { iconBg: '#D1FAE5', icon: 'business-outline', iconColor: '#22C55E', value: '0', label: 'Portfolio Companies' },
      { iconBg: '#DBEAFE', icon: 'cash-outline', iconColor: '#2563EB', value: '$0', label: 'AUM Deployed' },
      { iconBg: '#DCFCE7', icon: 'trending-up-outline', iconColor: '#22C55E', value: '0x', label: 'Avg MOIC' },
      { iconBg: '#FEF3C7', icon: 'people-outline', iconColor: '#F59E0B', value: '0', label: 'Co-Invest Opps' },
    ];
  }
  if (investorType === 'corporate-venture') {
    return [
      { iconBg: '#FEF3C7', icon: 'star-outline', iconColor: '#F59E0B', value: '0', label: 'Strategic Targets' },
      { iconBg: '#DBEAFE', icon: 'chatbubble-outline', iconColor: '#2563EB', value: '0', label: 'Partnership Proposals' },
      { iconBg: '#D1FAE5', icon: 'bar-chart-outline', iconColor: '#22C55E', value: '0%', label: 'Success Rate' },
      { iconBg: '#EFF6FF', icon: 'business-outline', iconColor: '#2563EB', value: '0', label: 'Active Deals' },
    ];
  }
  // angel / vc / default
  return [
    { iconBg: '#DBEAFE', icon: 'document-outline', iconColor: '#2563EB', value: String(counts.inv ?? 0), label: 'Approved Startups', subLink: 'on marketplace' },
    { iconBg: '#D1FAE5', icon: 'star-outline', iconColor: '#22C55E', value: '0', label: 'Discoveries For You' },
    { iconBg: '#DCFCE7', icon: 'trending-up-outline', iconColor: '#22C55E', value: String(counts.fund ?? 0), label: 'Active Raises' },
    { iconBg: '#FEF3C7', icon: 'chatbubble-outline', iconColor: '#F59E0B', value: '0', label: 'Intros Pending' },
  ];
}

function StatCard({ card }: { card: StatCardData }) {
  return (
    <View style={statStyles.card}>
      <View style={statStyles.topRow}>
        <View style={[statStyles.iconCircle, { backgroundColor: card.iconBg }]}>
          <Ionicons name={card.icon} size={18} color={card.iconColor} />
        </View>
        <Ionicons name="arrow-up-outline" size={14} color="#D1D5DB" />
      </View>
      <Text style={statStyles.value}>{card.value}</Text>
      <Text style={statStyles.label}>{card.label}</Text>
      {card.subLink && <Text style={statStyles.subLink}>{card.subLink}</Text>}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  subLink: {
    fontSize: 11,
    color: '#2563EB',
    marginTop: 2,
  },
});

const FOUNDER_EVENTS = [
  { name: 'AI for Bharat Hackathon 2026', date: '22/3/2026 · In-person' },
  { name: 'FinTech Founders & Funders Mixer — Mumbai', date: '22/3/2026 · In-person' },
  { name: 'CleanTech Investment Summit India 2026', date: '3/4/2026 · In-person' },
];

export default function DashboardScreen() {
  const { profile } = useAuthContext();
  const router = useRouter();
  const { startups, loading: startupLoading, fetchStartups } = useStartups();
  const { rounds, loading: fundLoading, fetchRounds } = useFunding();
  const { articles, loading: newsLoading, fetchNews } = useNews();

  const [startupCount, setStartupCount] = useState<number | null>(null);
  const [fundingCount, setFundingCount] = useState<number | null>(null);
  const [newsCount, setNewsCount] = useState<number | null>(null);

  useEffect(() => {
    fetchStartups();
    fetchRounds();
    fetchNews();

    Promise.all([
      supabase.from('startup_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('funding_rounds').select('*', { count: 'exact', head: true }),
      supabase.from('news_articles').select('*', { count: 'exact', head: true }),
    ]).then(([startups, fund, news]) => {
      setStartupCount(startups.count ?? 0);
      setFundingCount(fund.count ?? 0);
      setNewsCount(news.count ?? 0);
    });
  }, [fetchStartups, fetchRounds, fetchNews]);

  const role = profile?.role ?? null;
  const investorType = profile?.investor_type ?? null;
  const isFounder = role === 'founder';

  const badge = getTypeBadge(role, investorType);
  const dashTitle = getDashboardTitle(role, investorType);
  const statCards = getStatCards(role, investorType, {
    inv: startupCount,
    fund: fundingCount,
    news: newsCount,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.wordmark}>Capital Connect</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#9CA3AF"
            editable={false}
          />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {(profile?.first_name?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Type Badge */}
      <View style={styles.badgeRow}>
        <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.typeBadgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Dashboard Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.dashTitle}>{dashTitle}</Text>
        <Text style={styles.dashSubtitle}>Welcome back. Here's what's happening.</Text>
      </View>

      {/* Founder Apply Banner */}
      {isFounder && (
        <View style={styles.applyBanner}>
          <View style={styles.applyRocket}>
            <Ionicons name="rocket-outline" size={16} color="#F59E0B" />
          </View>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={styles.applyTitle}>Complete your startup application</Text>
            <Text style={styles.applySubtitle}>Submit your application to appear on the investor marketplace.</Text>
          </View>
          <TouchableOpacity style={styles.applyBtn}>
            <Text style={styles.applyBtnText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stat Cards 2x2 Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard card={statCards[0]} />
          <StatCard card={statCards[1]} />
        </View>
        <View style={styles.statsRow}>
          <StatCard card={statCards[2]} />
          <StatCard card={statCards[3]} />
        </View>
      </View>

      {/* Founder sections */}
      {isFounder ? (
        <>
          {/* Weekly Profile Views */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Weekly Profile Views</Text>
            <View style={styles.emptyStateCard}>
              <Ionicons name="bar-chart-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No views yet</Text>
            </View>
          </View>

          {/* Upcoming Events */}
          <View style={[styles.sectionCard, { marginTop: 12 }]}>
            <Text style={styles.sectionCardTitle}>Upcoming Events</Text>
            {FOUNDER_EVENTS.map((event, i) => (
              <View key={i} style={styles.eventRow}>
                <Ionicons name="calendar-outline" size={16} color="#2563EB" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventDate}>{event.date}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          {/* Startups section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Startups</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/browse')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {startupLoading ? <Loader /> : startups.slice(0, 3).map(startup => (
              <StartupCard
                key={startup.id}
                startup={startup}
                onPress={() => router.push({ pathname: '/(app)/browse/[id]' as any, params: { id: startup.id } })}
              />
            ))}
          </View>

          {/* Funding section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Funding</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/funding')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {fundLoading ? <Loader /> : rounds.slice(0, 3).map(round => (
              <FundingCard
                key={round.id}
                round={round}
                onPress={() => router.push({ pathname: '/(app)/funding/[id]', params: { id: round.id } })}
              />
            ))}
          </View>

          {/* News section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest News</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/news')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {newsLoading ? <Loader /> : articles.slice(0, 3).map(article => (
              <NewsCard key={article.id} article={article} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FA',
  },
  content: {
    paddingBottom: 32,
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#F0F4FA',
    borderRadius: 20,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A2E',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  headerIconBtn: {
    padding: 2,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  badgeRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 100,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  titleBlock: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  dashTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  dashSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  applyBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  applyRocket: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  applySubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  applyBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    height: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  eventName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  eventDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  seeAll: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
});
