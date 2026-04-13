import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import type { FounderProfile } from '../../hooks/useStartups';

interface StartupCardProps {
  startup: FounderProfile;
  onPress: () => void;
}

function founderName(fp: FounderProfile): string {
  if (!fp.profile) return 'Founder';
  return [fp.profile.first_name, fp.profile.last_name].filter(Boolean).join(' ');
}

function sectorColor(sector: string | null): string {
  const map: Record<string, string> = {
    'AI': '#3486e8', 'AI/ML': '#3486e8',
    'FinTech': '#10b981', 'Fintech': '#10b981',
    'HealthTech': '#ef4444', 'Healthtech': '#ef4444',
    'SaaS': '#2563EB',
    'CleanTech': '#22c55e', 'Cleantech': '#22c55e',
    'EdTech': '#f59e0b', 'Edtech': '#f59e0b',
    'DeepTech': '#59cbef', 'Deeptech': '#59cbef',
    'AgriTech': '#84cc16', 'Agritech': '#84cc16',
  };
  return map[sector ?? ''] ?? '#2563EB';
}

export function StartupCard({ startup, onPress }: StartupCardProps) {
  const companyName = startup.company_name ?? 'Unnamed Startup';
  const initial = companyName[0]?.toUpperCase() ?? '?';
  const sc = sectorColor(startup.sector);
  const isVerified = startup.verification_status === 'verified' || startup.trust_badges?.includes('verified');
  const name = founderName(startup);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.topRow}>
        {startup.profile?.avatar_url ? (
          <Image source={{ uri: startup.profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: `${sc}20` }]}>
            <Text style={[styles.avatarText, { color: sc }]}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.nameRow}>
            <Text style={styles.companyName} numberOfLines={1}>{companyName}</Text>
            {isVerified && (
              <View style={styles.trustBadge}>
                <Text style={styles.trustText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.founderName} numberOfLines={1}>{name}</Text>
        </View>
        {startup.sector && (
          <View style={[styles.sectorTag, { backgroundColor: `${sc}15` }]}>
            <Text style={[styles.sectorTagText, { color: sc }]}>{startup.sector}</Text>
          </View>
        )}
      </View>

      {startup.bio && (
        <Text style={styles.bio} numberOfLines={2}>{startup.bio}</Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Stage</Text>
          <Text style={styles.statValue}>{startup.stage ?? '—'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Raising</Text>
          <Text style={styles.statValue}>{startup.raise_amount ?? '—'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>ARR</Text>
          <Text style={styles.statValue}>{startup.arr ?? '—'}</Text>
        </View>
      </View>

      {startup.mom_growth && (
        <View style={styles.bottomRow}>
          <View style={styles.growthChip}>
            <Ionicons name="trending-up-outline" size={12} color={Colors.success} />
            <Text style={styles.growthText}>{startup.mom_growth} MoM</Text>
          </View>
          {startup.team_size != null && (
            <View style={styles.teamChip}>
              <Ionicons name="people-outline" size={12} color="#6B7280" />
              <Text style={styles.teamText}>{startup.team_size} team</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  companyName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  founderName: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  trustBadge: { backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  trustText: { fontSize: 9, fontWeight: '700', color: '#059669' },
  sectorTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  sectorTagText: { fontSize: 11, fontWeight: '600' },
  bio: { fontSize: 12, color: Colors.textMuted, marginTop: 8, lineHeight: 18 },
  statsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, marginTop: 12, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: Colors.textMuted },
  statValue: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.border },
  bottomRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  growthChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  growthText: { fontSize: 11, fontWeight: '600', color: Colors.success },
  teamChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  teamText: { fontSize: 11, color: '#6B7280' },
});
