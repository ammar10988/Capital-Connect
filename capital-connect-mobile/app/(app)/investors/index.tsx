import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useInvestors } from '../../../hooks/useInvestors';
import { InvestorCard } from '../../../components/investors/InvestorCard';
import { Loader } from '../../../components/ui/Loader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Colors } from '../../../constants/colors';

const SECTORS = ['All', 'AI', 'Fintech', 'Healthtech', 'SaaS', 'Cleantech', 'Edtech'];

export default function InvestorsScreen() {
  const router = useRouter();
  const { investors, loading, fetchInvestors } = useInvestors();
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');

  useEffect(() => {
    fetchInvestors(search || undefined, sector === 'All' ? undefined : sector);
  }, [sector]);

  const filtered = search
    ? investors.filter(inv =>
        inv.name.toLowerCase().includes(search.toLowerCase()) ||
        (inv.institution ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : investors;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Browse Investors</Text>
        <Text style={styles.count}>{filtered.length} investors</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, institution…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Sector filters */}
      <View style={styles.filters}>
        {SECTORS.map(s => (
          <View
            key={s}
            style={[styles.filterChip, sector === s && styles.filterChipActive]}
          >
            <Text
              style={[styles.filterText, sector === s && styles.filterTextActive]}
              onPress={() => setSector(s)}
            >
              {s}
            </Text>
          </View>
        ))}
      </View>

      {loading ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <EmptyState title="No investors found" message="Try adjusting your search or filters." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <InvestorCard
              investor={item}
              onPress={() => router.push({ pathname: '/(app)/investors/[id]', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.elevated, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  count: { fontSize: 13, color: Colors.textMuted },
  searchRow: { paddingHorizontal: 20, marginBottom: 10 },
  searchInput: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
});
