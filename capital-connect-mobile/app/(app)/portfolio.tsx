import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STAT_CARDS = [
  { bg: '#DBEAFE', icon: 'cash-outline' as const, label: 'Total Invested', value: '$0' },
  { bg: '#D1FAE5', icon: 'business-outline' as const, label: 'Portfolio Companies', value: '0' },
  { bg: '#DCFCE7', icon: 'trending-up-outline' as const, label: 'Active Investments', value: '0' },
  { bg: '#FEF3C7', icon: 'bar-chart-outline' as const, label: 'Avg Check Size', value: '$0' },
];

export default function PortfolioScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Portfolio Tracker</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add Investment</Text>
        </TouchableOpacity>
      </View>

      {/* Stat Cards 2x2 */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          {STAT_CARDS.slice(0, 2).map((card, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: card.bg }]}>
              <Ionicons name={card.icon} size={20} color="#1A1A2E" />
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.statsRow}>
          {STAT_CARDS.slice(2, 4).map((card, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: card.bg }]}>
              <Ionicons name={card.icon} size={20} color="#1A1A2E" />
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Charts row */}
      <View style={styles.chartsRow}>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Investment Activity</Text>
          <View style={styles.chartEmpty}>
            <Ionicons name="bar-chart-outline" size={32} color="#D1D5DB" />
            <Text style={styles.chartEmptyText}>No activity yet</Text>
          </View>
        </View>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Sector Allocation</Text>
          <View style={styles.chartEmpty}>
            <Ionicons name="pie-chart-outline" size={32} color="#D1D5DB" />
            <Text style={styles.chartEmptyText}>Add investments to see allocation</Text>
          </View>
        </View>
      </View>

      {/* Investments List Empty State */}
      <View style={styles.emptyCard}>
        <Ionicons name="briefcase-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No investments yet</Text>
        <Text style={styles.emptySubtitle}>Click 'Add Investment' to start tracking your portfolio</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  addBtn: { backgroundColor: '#2563EB', borderRadius: 10, height: 38, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  statsGrid: { gap: 10, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  chartsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  chartCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, height: 180 },
  chartTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 10 },
  chartEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center', lineHeight: 18 },
});
