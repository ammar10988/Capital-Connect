import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import type { ScrapedInvestor } from '../../types';

interface InvestorCardProps {
  investor: ScrapedInvestor;
  onPress: () => void;
}

export function InvestorCard({ investor, onPress }: InvestorCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <Avatar name={investor.name} size={44} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{investor.name}</Text>
            {investor.is_platform_member && (
              <View style={styles.memberBadge}>
                <Text style={styles.memberText}>✦ CC</Text>
              </View>
            )}
            {investor.verified && <Text style={{ color: Colors.success, fontSize: 14 }}>✓</Text>}
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {[investor.title, investor.institution].filter(Boolean).join(' · ')}
          </Text>
          {investor.location && (
            <Text style={styles.location}>📍 {investor.location}</Text>
          )}
        </View>
        <View style={[styles.dot, { backgroundColor: investor.actively_investing ? Colors.success : Colors.textMuted }]} />
      </View>

      {investor.sectors.length > 0 && (
        <View style={styles.badges}>
          {investor.sectors.slice(0, 3).map(s => (
            <Badge key={s} label={s} color="#E6F1FB" textColor="#185FA5" />
          ))}
          {investor.sectors.length > 3 && (
            <Badge label={`+${investor.sectors.length - 3}`} color="#E6F1FB" textColor="#185FA5" />
          )}
        </View>
      )}

      {investor.email ? (
        <Text style={styles.email}>✉ {investor.email}</Text>
      ) : (
        <Text style={styles.noEmail}>Email not available</Text>
      )}

      {(investor.check_min || investor.check_max) && (
        <View style={styles.ticketBadge}>
          <Text style={styles.ticketText}>$ {investor.check_min ?? ''} — {investor.check_max ?? ''}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  headerText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  location: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  email: { fontSize: 12, color: '#185FA5', marginBottom: 6 },
  noEmail: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', marginBottom: 6 },
  ticketBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, alignSelf: 'flex-start' },
  ticketText: { fontSize: 11, fontWeight: '700', color: '#C2410C' },
  memberBadge: { backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  memberText: { fontSize: 9, fontWeight: '700', color: '#059669' },
});
