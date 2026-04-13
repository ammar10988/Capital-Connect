import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NewsArticle } from '../../types';
import { format } from 'date-fns';

interface NewsCardProps {
  article: NewsArticle;
}

function getCategoryStyle(category: string): { bg: string; text: string } {
  switch (category.toLowerCase()) {
    case 'funding': return { bg: '#DBEAFE', text: '#2563EB' };
    case 'acquisition': return { bg: '#FEF3C7', text: '#F59E0B' };
    case 'ipo': return { bg: '#D1FAE5', text: '#22C55E' };
    case 'policy': return { bg: '#EDE9FE', text: '#7C3AED' };
    case 'ai/ml': return { bg: '#E0F2FE', text: '#0284C7' };
    case 'fintech': return { bg: '#ECFDF5', text: '#059669' };
    case 'healthtech': return { bg: '#FEF2F2', text: '#DC2626' };
    case 'cleantech': return { bg: '#F0FDF4', text: '#16A34A' };
    default: return { bg: '#F3F4F6', text: '#6B7280' };
  }
}

export function NewsCard({ article }: NewsCardProps) {
  const openArticle = () => {
    const link = article.url || article.source_url;
    if (link) Linking.openURL(link);
  };

  const date = article.published_at ? format(new Date(article.published_at), 'MMM d') : '';
  const catStyle = getCategoryStyle(article.category ?? '');

  return (
    <TouchableOpacity style={styles.card} onPress={openArticle} activeOpacity={0.85}>
      {/* Thumbnail */}
      {article.image_url ? (
        <Image
          source={{ uri: article.image_url }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="newspaper-outline" size={28} color="#D1D5DB" />
        </View>
      )}

      <View style={styles.body}>
        {/* Category + source row */}
        <View style={styles.topRow}>
          <View style={[styles.categoryPill, { backgroundColor: catStyle.bg }]}>
            <Text style={[styles.categoryPillText, { color: catStyle.text }]}>
              {article.category ? article.category.charAt(0).toUpperCase() + article.category.slice(1) : 'News'}
            </Text>
          </View>
          <Text style={styles.source} numberOfLines={1}>
            {article.source_name}{date ? ` · ${date}` : ''}
          </Text>
          {article.is_hot && (
            <View style={styles.hotBadge}>
              <Ionicons name="flame-outline" size={10} color="#EF4444" />
              <Text style={styles.hotText}>Hot</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>{article.title}</Text>

        {article.summary && (
          <Text style={styles.summary} numberOfLines={2}>{article.summary}</Text>
        )}

        {/* Tags */}
        {article.sector_tags && article.sector_tags.length > 0 && (
          <View style={styles.tags}>
            {article.sector_tags.slice(0, 3).map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  categoryPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryPillText: { fontSize: 10, fontWeight: '600' },
  source: { fontSize: 10, color: '#9CA3AF', flex: 1 },
  hotBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  hotText: { fontSize: 10, fontWeight: '600', color: '#EF4444' },
  title: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', lineHeight: 22, marginBottom: 6 },
  summary: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { backgroundColor: 'rgba(24,101,246,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  tagText: { fontSize: 10, fontWeight: '600', color: '#2563EB' },
});
