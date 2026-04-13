import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNews } from '../../../hooks/useNews';
import { NewsCard } from '../../../components/news/NewsCard';
import { Loader } from '../../../components/ui/Loader';

const CATEGORIES = ['All', 'Funding', 'Acquisition', 'IPO', 'People', 'Policy', 'Technology', 'News', 'AI/ML', 'FinTech', 'HealthTech', 'CleanTech', 'Markets', 'General'];


export default function NewsScreen() {
  const { articles, loading, fetchNews } = useNews();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    fetchNews(category === 'All' ? undefined : category);
  }, [category]);

  const filtered = search
    ? articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
    : articles;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>News Feed</Text>
          <Text style={styles.headerSubtitle}>India startup & VC ecosystem — refreshed every 6 hours</Text>
          <Text style={styles.headerUpdated}>Updated just now</Text>
        </View>
        <TouchableOpacity onPress={() => fetchNews(category === 'All' ? undefined : category)}>
          <Ionicons name="refresh-outline" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search news..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </View>

      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={styles.pillsRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, category === cat && styles.pillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="newspaper-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No articles found</Text>
          <Text style={styles.emptySubtitle}>Try a different category</Text>
        </View>
      ) : (
        filtered.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, maxWidth: 260 },
  headerUpdated: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  searchBar: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
  searchBarFocused: { borderColor: '#2563EB' },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  pillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pillText: { fontSize: 13, color: '#6B7280' },
  pillTextActive: { color: '#FFFFFF' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6 },
});
