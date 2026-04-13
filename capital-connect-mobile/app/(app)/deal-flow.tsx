import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PIPELINE_STAGES = [
  { name: 'Sourced', color: '#6B7280' },
  { name: 'Screening', color: '#F59E0B' },
  { name: 'First Call', color: '#3B82F6' },
  { name: 'Due Diligence', color: '#8B5CF6' },
  { name: 'Term Sheet', color: '#2563EB' },
  { name: 'Closed', color: '#22C55E' },
  { name: 'Passed', color: '#EF4444' },
];

const STAT_CARDS = [
  { bg: '#DBEAFE', icon: 'business-outline' as const, label: 'Active Deals', value: '0' },
  { bg: '#D1FAE5', icon: 'checkmark-circle-outline' as const, label: 'Closed Deals', value: '0' },
  { bg: '#FEF3C7', icon: 'cash-outline' as const, label: 'Total Capital', value: '$0' },
  { bg: '#DCFCE7', icon: 'trending-up-outline' as const, label: 'Avg Probability', value: '0%' },
];

export default function DealFlowScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Deal Flow</Text>
          <Text style={styles.headerSubtitle}>0 deals in pipeline</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add Deal</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly Deal Digest Banner */}
      <View style={styles.digestBanner}>
        <View style={styles.digestIconWrap}>
          <Ionicons name="document-outline" size={20} color="#2563EB" />
        </View>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={styles.digestTitle}>Weekly Deal Digest</Text>
          <Text style={styles.digestSub}>0 active deals · 0 in due diligence · 0 at term sheet</Text>
        </View>
        <TouchableOpacity style={styles.digestBtn}>
          <Text style={styles.digestBtnText}>Send digest</Text>
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

      {/* Two chart cards side by side */}
      <View style={styles.chartsRow}>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Deal Flow Trend</Text>
          <View style={styles.chartEmpty}>
            <Ionicons name="briefcase-outline" size={32} color="#D1D5DB" />
            <Text style={styles.chartEmptyText}>Add deals to see your trend</Text>
          </View>
        </View>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Hot Sectors</Text>
          <View style={styles.chartEmpty}>
            <Ionicons name="flash-outline" size={32} color="#D1D5DB" />
            <Text style={styles.chartEmptyText}>Sector breakdown shows once you add deals</Text>
          </View>
        </View>
      </View>

      {/* Pipeline */}
      <View style={styles.pipelineHeader}>
        <Text style={styles.pipelineTitle}>Pipeline (0 deals)</Text>
        <Text style={styles.pipelineHint}>Scroll horizontally →</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
        {PIPELINE_STAGES.map((stage, i) => (
          <View key={i} style={styles.stageColumn}>
            <View style={styles.stageHeaderRow}>
              <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
              <Text style={[styles.stageName, { color: stage.color }]}>{stage.name}</Text>
              <View style={styles.stageBadge}>
                <Text style={styles.stageBadgeText}>0</Text>
              </View>
            </View>
            <View style={styles.stageEmptyCard}>
              <Text style={styles.stageEmptyText}>No deals</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addBtn: { backgroundColor: '#2563EB', borderRadius: 10, height: 38, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  digestBanner: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  digestIconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  digestTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  digestSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  digestBtn: { borderWidth: 1, borderColor: '#2563EB', borderRadius: 8, height: 32, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  digestBtnText: { fontSize: 12, color: '#2563EB' },
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
  pipelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pipelineTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  pipelineHint: { fontSize: 11, color: '#9CA3AF' },
  stageColumn: { width: 160, marginRight: 10 },
  stageHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stageDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  stageName: { fontSize: 12, fontWeight: '600', flex: 1 },
  stageBadge: { backgroundColor: '#F0F4FA', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  stageBadgeText: { fontSize: 11, color: '#6B7280' },
  stageEmptyCard: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, height: 80, alignItems: 'center', justifyContent: 'center' },
  stageEmptyText: { fontSize: 12, color: '#9CA3AF' },
});
