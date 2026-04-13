import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../context/AuthContext';

const SECTORS = ['AI/ML','FinTech','HealthTech','SaaS','CleanTech','EdTech','AgriTech','DeepTech','Consumer','E-Commerce','Web3','Logistics','BioTech'];
const STAGES = ['Pre-Seed','Seed','Series A','Series B','Series B+','Growth'];

interface ListingForm {
  company_name: string;
  tagline: string;
  website: string;
  sector: string;
  stage: string;
  description: string;
  arr_usd: string;
  growth_rate_pct: string;
  funding_ask_usd: string;
  team_size: string;
  founded_year: string;
  use_of_funds: string;
}

const emptyForm: ListingForm = {
  company_name: '', tagline: '', website: '', sector: '', stage: '',
  description: '', arr_usd: '', growth_rate_pct: '', funding_ask_usd: '',
  team_size: '', founded_year: '', use_of_funds: '',
};

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    draft:        { label: 'Draft',        color: '#6B7280', bg: '#F3F4F6' },
    submitted:    { label: 'Under Review', color: '#F59E0B', bg: '#FEF3C7' },
    under_review: { label: 'Under Review', color: '#F59E0B', bg: '#FEF3C7' },
    approved:     { label: 'Live',         color: '#22C55E', bg: '#DCFCE7' },
    rejected:     { label: 'Rejected',     color: '#EF4444', bg: '#FEE2E2' },
  };
  return map[status] ?? { label: status, color: '#6B7280', bg: '#F3F4F6' };
}

export default function MyListingScreen() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string>('draft');
  const [form, setForm] = useState<ListingForm>(emptyForm);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user) fetchListing();
  }, [user]);

  async function fetchListing() {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('startup_applications')
        .select('id, company_name, tagline, website, sector, stage, description, arr_usd, growth_rate_pct, funding_ask_usd, team_size, founded_year, use_of_funds, status')
        .eq('founder_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setApplicationId(data.id);
        setApplicationStatus(data.status ?? 'draft');
        setForm({
          company_name:     data.company_name ?? '',
          tagline:          data.tagline ?? '',
          website:          data.website ?? '',
          sector:           data.sector ?? '',
          stage:            data.stage ?? '',
          description:      data.description ?? '',
          arr_usd:          data.arr_usd != null ? String(data.arr_usd) : '',
          growth_rate_pct:  data.growth_rate_pct != null ? String(data.growth_rate_pct) : '',
          funding_ask_usd:  data.funding_ask_usd != null ? String(data.funding_ask_usd) : '',
          team_size:        data.team_size != null ? String(data.team_size) : '',
          founded_year:     data.founded_year != null ? String(data.founded_year) : '',
          use_of_funds:     data.use_of_funds ?? '',
        });
        setShowForm(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function update(key: keyof ListingForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  async function handleSave(submitForReview = false) {
    if (!user) return;
    if (!form.company_name.trim()) {
      Alert.alert('Required', 'Company name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        founder_id:       user.id,
        company_name:     form.company_name.trim(),
        tagline:          form.tagline.trim() || null,
        website:          form.website.trim() || null,
        sector:           form.sector || null,
        stage:            form.stage || null,
        description:      form.description.trim() || null,
        arr_usd:          form.arr_usd ? Number(form.arr_usd) : null,
        growth_rate_pct:  form.growth_rate_pct ? Number(form.growth_rate_pct) : null,
        funding_ask_usd:  form.funding_ask_usd ? Number(form.funding_ask_usd) : null,
        team_size:        form.team_size ? Number(form.team_size) : null,
        founded_year:     form.founded_year ? Number(form.founded_year) : null,
        use_of_funds:     form.use_of_funds.trim() || null,
        status:           submitForReview ? 'submitted' : (applicationStatus === 'draft' ? 'draft' : applicationStatus),
        updated_at:       new Date().toISOString(),
        ...(submitForReview ? { submitted_at: new Date().toISOString() } : {}),
      };

      if (applicationId) {
        const { error } = await supabase
          .from('startup_applications')
          .update(payload)
          .eq('id', applicationId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('startup_applications')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setApplicationId((data as { id: string }).id);
      }

      if (submitForReview) {
        setApplicationStatus('submitted');
        Alert.alert('Submitted!', 'Your application has been submitted for review. We\'ll notify you once it\'s approved.');
      } else {
        Alert.alert('Saved', 'Your listing has been saved as a draft.');
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save listing.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  const status = statusLabel(applicationStatus);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerTitle}>My Listing</Text>
      <Text style={styles.headerSubtitle}>Your startup's profile on the investor marketplace</Text>

      {/* Status badge */}
      {showForm && (
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          {applicationStatus === 'approved' && (
            <Text style={styles.liveNote}>Visible to investors on the marketplace</Text>
          )}
        </View>
      )}

      {/* No listing empty state */}
      {!showForm ? (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No listing yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your startup listing to connect with investors.
          </Text>
          <TouchableOpacity style={styles.applyBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.applyBtnText}>Create Listing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Company Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>COMPANY INFO</Text>
            <Text style={styles.fieldLabel}>COMPANY NAME *</Text>
            <TextInput style={inputStyle('cn')} value={form.company_name} onChangeText={v => update('company_name', v)} placeholder="Acme Inc." placeholderTextColor="#9CA3AF" onFocus={() => setFocusedField('cn')} onBlur={() => setFocusedField(null)} />
            <Text style={styles.fieldLabel}>TAGLINE</Text>
            <TextInput style={inputStyle('tl')} value={form.tagline} onChangeText={v => update('tagline', v)} placeholder="One sentence pitch" placeholderTextColor="#9CA3AF" onFocus={() => setFocusedField('tl')} onBlur={() => setFocusedField(null)} />
            <Text style={styles.fieldLabel}>WEBSITE</Text>
            <TextInput style={inputStyle('ws')} value={form.website} onChangeText={v => update('website', v)} placeholder="https://yoursite.com" placeholderTextColor="#9CA3AF" keyboardType="url" autoCapitalize="none" onFocus={() => setFocusedField('ws')} onBlur={() => setFocusedField(null)} />
          </View>

          {/* Category */}
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.cardTitle}>CATEGORY</Text>
            <Text style={styles.fieldLabel}>SECTOR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {SECTORS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, form.sector === s && styles.chipActive]}
                    onPress={() => update('sector', form.sector === s ? '' : s)}
                  >
                    <Text style={[styles.chipText, form.sector === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>STAGE</Text>
            <View style={styles.stageGrid}>
              {STAGES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.stageBtn, form.stage === s && styles.stageBtnActive]}
                  onPress={() => update('stage', form.stage === s ? '' : s)}
                >
                  <Text style={[styles.stageBtnText, form.stage === s && styles.stageBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Traction */}
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.cardTitle}>TRACTION</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>ARR (USD)</Text>
                <TextInput style={inputStyle('arr')} value={form.arr_usd} onChangeText={v => update('arr_usd', v)} placeholder="120000" placeholderTextColor="#9CA3AF" keyboardType="numeric" onFocus={() => setFocusedField('arr')} onBlur={() => setFocusedField(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>MOM GROWTH %</Text>
                <TextInput style={inputStyle('gr')} value={form.growth_rate_pct} onChangeText={v => update('growth_rate_pct', v)} placeholder="15" placeholderTextColor="#9CA3AF" keyboardType="numeric" onFocus={() => setFocusedField('gr')} onBlur={() => setFocusedField(null)} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>TEAM SIZE</Text>
                <TextInput style={inputStyle('ts')} value={form.team_size} onChangeText={v => update('team_size', v)} placeholder="8" placeholderTextColor="#9CA3AF" keyboardType="numeric" onFocus={() => setFocusedField('ts')} onBlur={() => setFocusedField(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>FOUNDED YEAR</Text>
                <TextInput style={inputStyle('fy')} value={form.founded_year} onChangeText={v => update('founded_year', v)} placeholder="2022" placeholderTextColor="#9CA3AF" keyboardType="numeric" onFocus={() => setFocusedField('fy')} onBlur={() => setFocusedField(null)} />
              </View>
            </View>
            <Text style={styles.fieldLabel}>FUNDING ASK (USD)</Text>
            <TextInput style={inputStyle('fa')} value={form.funding_ask_usd} onChangeText={v => update('funding_ask_usd', v)} placeholder="1000000" placeholderTextColor="#9CA3AF" keyboardType="numeric" onFocus={() => setFocusedField('fa')} onBlur={() => setFocusedField(null)} />
          </View>

          {/* Description */}
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.cardTitle}>ABOUT YOUR STARTUP</Text>
            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput style={[inputStyle('desc'), { height: 100, paddingTop: 12, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => update('description', v)} placeholder="What does your startup do?" placeholderTextColor="#9CA3AF" multiline onFocus={() => setFocusedField('desc')} onBlur={() => setFocusedField(null)} />
            <Text style={styles.fieldLabel}>USE OF FUNDS</Text>
            <TextInput style={[inputStyle('uof'), { height: 80, paddingTop: 12, textAlignVertical: 'top' }]} value={form.use_of_funds} onChangeText={v => update('use_of_funds', v)} placeholder="How will you use the investment?" placeholderTextColor="#9CA3AF" multiline onFocus={() => setFocusedField('uof')} onBlur={() => setFocusedField(null)} />
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.saveDraftBtn, saving && { opacity: 0.7 }]}
              onPress={() => handleSave(false)}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#2563EB" size="small" />
                : <Text style={styles.saveDraftText}>Save Draft</Text>
              }
            </TouchableOpacity>
            {applicationStatus === 'draft' && (
              <TouchableOpacity
                style={[styles.submitBtn, saving && { opacity: 0.7 }]}
                onPress={() => handleSave(true)}
                disabled={saving}
              >
                <Text style={styles.submitBtnText}>Submit for Review</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Info cards */}
      {!showForm && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>What happens after listing?</Text>
          {[
            { icon: 'eye-outline' as const, title: 'Investors discover you', sub: 'Your startup becomes visible to 1500+ verified investors' },
            { icon: 'chatbubble-outline' as const, title: 'Receive intro requests', sub: 'Interested investors send you introduction requests directly' },
            { icon: 'trending-up-outline' as const, title: 'Track your traction', sub: 'Monitor profile views, bookmarks and deck downloads' },
          ].map((item, i) => (
            <View key={i} style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons name={item.icon} size={18} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>{item.title}</Text>
                <Text style={styles.infoSub}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  liveNote: { fontSize: 12, color: '#6B7280' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 32, alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  applyBtn: { backgroundColor: '#22C55E', borderRadius: 12, height: 48, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', marginTop: 20, width: '100%' },
  applyBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F8FAFC', paddingHorizontal: 12, fontSize: 14, color: '#1A1A2E', marginBottom: 4 },
  inputFocused: { borderColor: '#22C55E', backgroundColor: '#FFFFFF' },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#DCFCE7', borderColor: '#22C55E' },
  chipText: { fontSize: 12, color: '#6B7280' },
  chipTextActive: { color: '#22C55E', fontWeight: '600' },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stageBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  stageBtnActive: { backgroundColor: '#DCFCE7', borderColor: '#22C55E' },
  stageBtnText: { fontSize: 13, color: '#6B7280' },
  stageBtnTextActive: { color: '#22C55E', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  saveDraftBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  saveDraftText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  submitBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  infoSection: { marginTop: 4 },
  infoSectionTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginBottom: 12 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  infoSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
