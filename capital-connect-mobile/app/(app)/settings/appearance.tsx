import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AppearanceSettingsScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [fontSize, setFontSize] = useState<'small' | 'large'>('small');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back-outline" size={18} color="#2563EB" />
        <Text style={styles.backText}>Settings</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Appearance</Text>
      <Text style={styles.headerSubtitle}>Customize how the app looks</Text>

      {/* Theme */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>THEME</Text>
        <View style={styles.btnRow}>
          {(['light', 'dark', 'system'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.themeBtn, theme === t && styles.themeBtnActive]}
              onPress={() => setTheme(t)}
            >
              <Ionicons
                name={t === 'light' ? 'sunny-outline' : t === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                size={18}
                color={theme === t ? '#2563EB' : '#6B7280'}
              />
              <Text style={[styles.themeBtnText, theme === t && styles.themeBtnTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Font Size */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>FONT SIZE</Text>
        <View style={[styles.btnRow, { gap: 12 }]}>
          {(['small', 'large'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.themeBtn, { flex: 1 }, fontSize === f && styles.themeBtnActive]}
              onPress={() => setFontSize(f)}
            >
              <Text style={[styles.themeBtnText, fontSize === f && styles.themeBtnTextActive]}>
                {f === 'small' ? 'Standard' : 'Large'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Language */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>LANGUAGE</Text>
        <TouchableOpacity style={styles.langRow}>
          <Ionicons name="globe-outline" size={20} color="#6B7280" />
          <Text style={styles.langText}>English (India)</Text>
          <Ionicons name="chevron-forward-outline" size={16} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>Save Appearance</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { fontSize: 15, color: '#2563EB', marginLeft: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 10 },
  themeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 4,
  },
  themeBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  themeBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  themeBtnTextActive: { color: '#2563EB', fontWeight: '600' },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langText: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
