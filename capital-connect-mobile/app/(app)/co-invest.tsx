import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STAT_CARDS = [
  { bg: '#D1FAE5', icon: 'link-outline' as const, iconColor: '#22C55E', label: 'Total Opportunities', value: '0' },
  { bg: '#DCFCE7', icon: 'trending-up-outline' as const, iconColor: '#22C55E', label: 'Open Rounds', value: '0' },
  { bg: '#FEF3C7', icon: 'time-outline' as const, iconColor: '#F59E0B', label: 'Closing Soon', value: '0' },
  { bg: '#DBEAFE', icon: 'people-outline' as const, iconColor: '#2563EB', label: 'Expressed Interest', value: '0' },
];

const SECTOR_PILLS = ['All Sectors', 'AI/ML', 'FinTech', 'HealthTech', 'SaaS', 'CleanTech'];

export default function CoInvestScreen() {
  const [search, setSearch] = useState('');
  const [activeSector, setActiveSector] = useState('All Sectors');
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="link-outline" size={22} color="#22C55E" style={{ marginRight: 8 }} />
        <View>
          <Text style={styles.headerTitle}>Co-Invest Opportunities</Text>
          <Text style={styles.headerSubtitle}>Family office exclusive co-investment deals</Text>
        </View>
      </View>

      {/* Stat Cards 2x2 */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          {STAT_CARDS.slice(0, 2).map((card, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: card.bg }]}>
              <Ionicons name={card.icon} size={20} color={card.iconColor} />
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.statsRow}>
          {STAT_CARDS.slice(2, 4).map((card, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: card.bg }]}>
              <Ionicons name={card.icon} size={20} color={card.iconColor} />
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Search + Filter Card */}
      <View style={styles.filterCard}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search co-invest opportunities..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={styles.pillsRow}>
            {SECTOR_PILLS.map((pill) => (
              <TouchableOpacity
                key={pill}
                style={[styles.pill, activeSector === pill && styles.pillActive]}
                onPress={() => setActiveSector(pill)}
              >
                <Text style={[styles.pillText, activeSector === pill && styles.pillTextActive]}>{pill}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Empty State */}
      <View style={styles.emptyCard}>
        <Ionicons name="link-outline" size={40} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No co-invest opportunities yet</Text>
        <Text style={styles.emptySubtitle}>
          Co-investment opportunities from curated family office networks will appear here
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statsGrid: { gap: 10, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  filterCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14 },
  searchBar: { backgroundColor: '#F8FAFC', borderRadius: 10, height: 40, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  searchBarFocused: { borderColor: '#22C55E' },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  pillText: { fontSize: 12, color: '#6B7280' },
  pillTextActive: { color: '#FFFFFF' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40, alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center', lineHeight: 18 },
});
