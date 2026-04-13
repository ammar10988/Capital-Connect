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
import { useInvestors } from '../../hooks/useInvestors';
import { Loader } from '../../components/ui/Loader';

export default function BrowseInvestorsScreen() {
  const router = useRouter();
  const { investors, loading, error, fetchInvestors } = useInvestors();
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    fetchInvestors();
  }, [fetchInvestors]);

  const filtered = search
    ? investors.filter(inv =>
        inv.name.toLowerCase().includes(search.toLowerCase()) ||
        (inv.institution ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : investors;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Text style={styles.headerTitle}>Browse Investors</Text>
      <Text style={styles.headerSubtitle}>Connect with investors aligned to your startup</Text>

      {/* Stat Cards 3-column */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={20} color="#2563EB" />
          <Text style={styles.statValue}>{investors.length > 0 ? investors.length : '1571'}</Text>
          <Text style={styles.statLabel}>Total Investors</Text>
          <Text style={styles.statSub}>In our investor network</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-up-outline" size={20} color="#22C55E" />
          <Text style={styles.statValue}>24</Text>
          <Text style={styles.statLabel}>Sectors Covered</Text>
          <Text style={styles.statSub}>Across all investment focus areas</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="location-outline" size={20} color="#F59E0B" />
          <Text style={styles.statValue}>13</Text>
          <Text style={styles.statLabel}>Locations</Text>
          <Text style={styles.statSub}>Cities and regions represented</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or firm..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </View>

      {/* Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={styles.filterRow}>
          {['All Sectors ▼', 'All Stages ▼', 'All Locations ▼'].map((filter) => (
            <TouchableOpacity key={filter} style={styles.filterPill}>
              <Text style={styles.filterPillText}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <Loader />
      ) : error ? (
        <View style={styles.emptyCard}>
          <Ionicons name="warning-outline" size={40} color="#EF4444" />
          <Text style={styles.emptyTitle}>Failed to load investors</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No investors found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your search</Text>
        </View>
      ) : (
        filtered.map((inv) => {
          const initials = inv.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <View key={inv.id} style={styles.investorCard}>
              {/* Top Row */}
              <View style={styles.cardTopRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.investorName}>{inv.name}</Text>
                  <Text style={styles.ccBadge}>✦ Capital Connect</Text>
                </View>
                <View style={styles.activeIndicator}>
                  <Text style={styles.activeText}>● Active</Text>
                </View>
              </View>

              {/* Email */}
              <Text style={styles.emailText}>{inv.email ?? 'Email not available'}</Text>

              {/* Location */}
              {inv.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color="#6B7280" />
                  <Text style={styles.locationText}>{inv.location}</Text>
                </View>
              )}

              {/* Sectors */}
              {inv.sectors.length > 0 && (
                <View style={styles.sectorTags}>
                  {inv.sectors.slice(0, 3).map((s, i) => (
                    <View key={i} style={styles.sectorTag}>
                      <Text style={styles.sectorTagText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Ticket */}
              {(inv.check_min || inv.check_max) && (
                <Text style={styles.ticketText}>
                  ${inv.check_min ?? '—'} — ${inv.check_max ?? '—'}
                </Text>
              )}

              {/* Action Row */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.viewProfileBtn}
                  onPress={() => router.push(`/(app)/investors/${inv.id}` as any)}
                >
                  <Text style={styles.viewProfileText}>View Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.introBtn}
                  onPress={() => router.push(`/(app)/investors/${inv.id}` as any)}
                >
                  <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.introBtnText}>Intro</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 32 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 2 },
  statSub: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 1 },
  searchBar: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
  searchBarFocused: { borderColor: '#22C55E' },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  filterPillText: { fontSize: 13, color: '#6B7280' },
  investorCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  investorName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  ccBadge: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  activeIndicator: {},
  activeText: { fontSize: 12, color: '#22C55E', fontWeight: '500' },
  emailText: { fontSize: 12, color: '#9CA3AF', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  locationText: { fontSize: 12, color: '#6B7280' },
  sectorTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  sectorTag: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  sectorTagText: { fontSize: 10, color: '#2563EB' },
  ticketText: { fontSize: 12, fontWeight: '600', color: '#F59E0B', marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  viewProfileBtn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  viewProfileText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  introBtn: { flex: 1, height: 36, borderRadius: 8, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  introBtnText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40, alignItems: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6 },
});
