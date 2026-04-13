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
import { useStartups } from '../../hooks/useStartups';
import { StartupCard } from '../../components/startups/StartupCard';
import { Loader } from '../../components/ui/Loader';

const STAGE_FILTERS = ['All', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth'];

export default function BrowseScreen() {
  const router = useRouter();
  const { startups, loading, fetchStartups } = useStartups();
  const [search, setSearch] = useState('');
  const [activeStage, setActiveStage] = useState('All');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    fetchStartups();
  }, [fetchStartups]);

  const filtered = startups.filter(s => {
    const matchesStage = activeStage === 'All' || s.stage === activeStage;
    const matchesSearch = !search ||
      (s.company_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.bio ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.sector ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesStage && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.headerTitle}>Startup Marketplace</Text>
        <Text style={styles.headerSubtitle}>Startups actively raising capital</Text>

        {/* Search Bar */}
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, sector, or description..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stage Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={styles.pillsRow}>
            {STAGE_FILTERS.map((stage) => (
              <TouchableOpacity
                key={stage}
                style={[styles.pill, activeStage === stage && styles.pillActive]}
                onPress={() => setActiveStage(stage)}
              >
                <Text style={[styles.pillText, activeStage === stage && styles.pillTextActive]}>{stage}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          <Loader />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="rocket-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No startups found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
          </View>
        ) : (
          filtered.map((startup) => (
            <StartupCard
              key={startup.id}
              startup={startup}
              onPress={() => router.push({ pathname: '/(app)/browse/[id]' as any, params: { id: startup.id } })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  scrollArea: { flex: 1 },
  content: { padding: 16, paddingTop: 52, paddingBottom: 32 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchBarFocused: { borderColor: '#2563EB' },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  pillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pillText: { fontSize: 13, color: '#6B7280' },
  pillTextActive: { color: '#FFFFFF' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40, alignItems: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center' },
});
