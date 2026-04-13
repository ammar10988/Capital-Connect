import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SelectionCard } from '../../../components/onboarding/SelectionCard';

export default function RoleScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<'investor' | 'founder' | null>(null);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress Indicator */}
      <View style={styles.progressRow}>
        <View style={[styles.dash, styles.dashActive]} />
        <View style={[styles.dash, styles.dashInactive]} />
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome to Capital Connect</Text>
        <Text style={styles.cardSubtitle}>Tell us how you'll be using the platform.</Text>

        {/* Selection Cards */}
        <View style={styles.selectionRow}>
          <SelectionCard
            icon="trending-up-outline"
            label="I am an Investor"
            description="Angel, VC, Bank, NBFC, Family Office, or CVC"
            selected={selected === 'investor'}
            onPress={() => setSelected('investor')}
            accentColor="#2563EB"
            accentBg="#EFF6FF"
            accentLightBg="#EFF6FF"
          />
          <SelectionCard
            icon="rocket-outline"
            label="I am a Founder"
            description="Active startup or idea-stage entrepreneur"
            selected={selected === 'founder'}
            onPress={() => setSelected('founder')}
            accentColor="#22C55E"
            accentBg="#DCFCE7"
            accentLightBg="#F0FDF4"
          />
        </View>

        {/* Continue Button */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
            disabled={!selected}
            onPress={() => {
              if (selected === 'investor') {
                router.push('/(app)/onboarding/investor-wizard');
              } else if (selected === 'founder') {
                router.push('/(app)/onboarding/founder-wizard');
              }
            }}
          >
            <Text style={styles.continueBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FA',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 56,
    marginBottom: 40,
  },
  dash: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  dashActive: {
    backgroundColor: '#2563EB',
  },
  dashInactive: {
    backgroundColor: '#D1D5DB',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
  },
  selectionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnRow: {
    alignItems: 'flex-end',
    marginTop: 24,
  },
  continueBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#BFDBFE',
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
