import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuthContext } from '../../../context/AuthContext';
import { ChipSelector } from '../../../components/onboarding/ChipSelector';
import { sanitizeOptionalUrl, sanitizePlainText, validateMobileImageAsset } from '../../../lib/inputSecurity';

type TabType = 'public' | 'preferences';

const SECTORS = ['AI/ML', 'FinTech', 'HealthTech', 'SaaS', 'CleanTech', 'EdTech', 'AgriTech', 'DeepTech', 'Consumer'];
const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'];
const GEOGRAPHIES = ['India', 'Southeast Asia', 'USA', 'Europe', 'Middle East', 'Global', 'APAC'];

export default function ProfileScreen() {
  const { user, profile, updateProfile, signOut, refreshProfile } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabType>('public');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loadingInvestor, setLoadingInvestor] = useState(false);
  const [savingPublic, setSavingPublic] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);

  // Public profile state
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [linkedin, setLinkedin] = useState('');

  // Preferences state
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedGeo, setSelectedGeo] = useState<string[]>([]);
  const [minTicket, setMinTicket] = useState('');
  const [maxTicket, setMaxTicket] = useState('');
  const [thesis, setThesis] = useState('');

  const isFounder = profile?.role === 'founder';

  useEffect(() => {
    if (user && !isFounder) {
      loadInvestorProfile();
    }
  }, [user, isFounder]);

  // Sync avatar from profile when it updates
  useEffect(() => {
    if (profile?.avatar_url) setAvatarUri(profile.avatar_url);
  }, [profile?.avatar_url]);

  async function loadInvestorProfile() {
    if (!user) return;
    setLoadingInvestor(true);
    try {
      const { data } = await supabase
        .from('investor_profiles')
        .select('linkedin_url, sectors, stage_preference, geography, ticket_size_min, ticket_size_max, investment_thesis')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setLinkedin(data.linkedin_url ?? '');
        setSelectedSectors(data.sectors ?? []);
        setSelectedStages(data.stage_preference ?? []);
        setSelectedGeo(data.geography ?? []);
        setMinTicket(data.ticket_size_min != null ? String(data.ticket_size_min) : '');
        setMaxTicket(data.ticket_size_max != null ? String(data.ticket_size_max) : '');
        setThesis(data.investment_thesis ?? '');
      }
    } finally {
      setLoadingInvestor(false);
    }
  }

  async function handleUploadPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0] || !user) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const uri = asset.uri;
      const { extension, mimeType } = validateMobileImageAsset({
        uri,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
      });
      const ext = extension;
      const path = `${user.id}/avatar.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: mimeType });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      setAvatarUri(publicUrl);
      await refreshProfile();
      Alert.alert('Success', 'Profile photo updated successfully.');
    } catch (e: unknown) {
      Alert.alert('Upload Failed', e instanceof Error ? e.message : 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSavePublic() {
    if (!firstName.trim()) {
      Alert.alert('Required', 'First name cannot be empty.');
      return;
    }
    setSavingPublic(true);
    try {
      await updateProfile({
        first_name: sanitizePlainText(firstName, { maxLength: 80 }),
        last_name: sanitizePlainText(lastName, { maxLength: 80 }) || null,
        company: sanitizePlainText(company, { maxLength: 120 }) || null,
        bio: sanitizePlainText(bio, { maxLength: 500, multiline: true }) || null,
      });
      if (user && !isFounder) {
        await supabase.from('investor_profiles').upsert(
          {
            user_id: user.id,
            linkedin_url: sanitizeOptionalUrl(linkedin, 'LinkedIn URL') || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setSavingPublic(false);
    }
  }

  async function handleSavePreferences() {
    if (!user) return;
    setSavingPrefs(true);
    try {
      const { error } = await supabase.from('investor_profiles').upsert(
        {
          user_id: user.id,
          sectors: selectedSectors,
          stage_preference: selectedStages,
          geography: selectedGeo,
          ticket_size_min: minTicket ? Number(minTicket) : null,
          ticket_size_max: maxTicket ? Number(maxTicket) : null,
          investment_thesis: sanitizePlainText(thesis, { maxLength: 1000, multiline: true }) || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      Alert.alert('Saved', 'Investment preferences updated.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save preferences.');
    } finally {
      setSavingPrefs(false);
    }
  }

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  const pageTitle = isFounder ? 'Founder Profile' : 'Investor Profile';
  const pageSubtitle = isFounder
    ? 'Manage your startup profile'
    : 'Manage your public profile and investment preferences';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Text style={styles.headerTitle}>{pageTitle}</Text>
      <Text style={styles.headerSubtitle}>{pageSubtitle}</Text>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handleUploadPhoto} disabled={uploading} style={styles.avatarWrapper}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{(profile?.first_name?.[0] ?? '?').toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            {uploading
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            }
          </View>
        </TouchableOpacity>
        <View style={{ marginLeft: 14 }}>
          <Text style={styles.userName}>
            {profile ? `${profile.first_name} ${profile.last_name ?? ''}`.trim() : 'User'}
          </Text>
          {profile?.role ? (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profile.role}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'public' && styles.tabActive]}
          onPress={() => setActiveTab('public')}
        >
          <Text style={[styles.tabText, activeTab === 'public' && styles.tabTextActive]}>
            {isFounder ? 'Edit Profile' : 'Public Profile'}
          </Text>
        </TouchableOpacity>
        {!isFounder && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'preferences' && styles.tabActive]}
            onPress={() => setActiveTab('preferences')}
          >
            <Text style={[styles.tabText, activeTab === 'preferences' && styles.tabTextActive]}>
              Preferences
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'public' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>BASIC INFO</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>FIRST NAME</Text>
                <TextInput style={inputStyle('fn')} value={firstName} onChangeText={setFirstName} placeholderTextColor="#9CA3AF" onFocus={() => setFocusedField('fn')} onBlur={() => setFocusedField(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>LAST NAME</Text>
                <TextInput style={inputStyle('ln')} value={lastName} onChangeText={setLastName} placeholderTextColor="#9CA3AF" onFocus={() => setFocusedField('ln')} onBlur={() => setFocusedField(null)} />
              </View>
            </View>
            <Text style={styles.fieldLabel}>{isFounder ? 'COMPANY' : 'FUND / COMPANY'}</Text>
            <TextInput
              style={inputStyle('co')}
              placeholder={isFounder ? 'Your startup name' : 'Your company or fund'}
              placeholderTextColor="#9CA3AF"
              value={company}
              onChangeText={setCompany}
              onFocus={() => setFocusedField('co')}
              onBlur={() => setFocusedField(null)}
            />
            <Text style={styles.fieldLabel}>BIO</Text>
            <TextInput
              style={[inputStyle('bio'), { height: 100, paddingTop: 12, textAlignVertical: 'top' }]}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={bio}
              onChangeText={setBio}
              onFocus={() => setFocusedField('bio')}
              onBlur={() => setFocusedField(null)}
            />
            {!isFounder && (
              <>
                <Text style={styles.fieldLabel}>LINKEDIN URL</Text>
                <TextInput
                  style={inputStyle('li')}
                  placeholder="https://linkedin.com/in/..."
                  placeholderTextColor="#9CA3AF"
                  value={linkedin}
                  onChangeText={setLinkedin}
                  onFocus={() => setFocusedField('li')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, savingPublic && { opacity: 0.7 }]}
            onPress={handleSavePublic}
            disabled={savingPublic}
          >
            {savingPublic
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={styles.saveBtnText}>Save Profile</Text>
            }
          </TouchableOpacity>
        </>
      ) : (
        <>
          {loadingInvestor ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.loadingText}>Loading preferences...</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardSectionTitle}>SECTORS OF INTEREST</Text>
                <ChipSelector options={SECTORS} selected={selectedSectors} onToggle={(v) =>
                  setSelectedSectors(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
                } />
                <Text style={[styles.cardSectionTitle, { marginTop: 16 }]}>STAGE PREFERENCE</Text>
                <ChipSelector options={STAGES} selected={selectedStages} onToggle={(v) =>
                  setSelectedStages(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
                } />
                <Text style={[styles.cardSectionTitle, { marginTop: 16 }]}>GEOGRAPHY</Text>
                <ChipSelector options={GEOGRAPHIES} selected={selectedGeo} onToggle={(v) =>
                  setSelectedGeo(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
                } />
              </View>

              <View style={[styles.card, { marginTop: 12 }]}>
                <Text style={styles.cardSectionTitle}>CHECK SIZE & THESIS</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>MIN TICKET (USD)</Text>
                    <TextInput
                      style={inputStyle('minT')}
                      placeholder="50000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={minTicket}
                      onChangeText={setMinTicket}
                      onFocus={() => setFocusedField('minT')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>MAX TICKET (USD)</Text>
                    <TextInput
                      style={inputStyle('maxT')}
                      placeholder="500000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={maxTicket}
                      onChangeText={setMaxTicket}
                      onFocus={() => setFocusedField('maxT')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
                <Text style={styles.fieldLabel}>INVESTMENT THESIS</Text>
                <TextInput
                  style={[inputStyle('thesis'), { height: 100, paddingTop: 12, textAlignVertical: 'top' }]}
                  placeholder="Describe your investment thesis..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={thesis}
                  onChangeText={setThesis}
                  onFocus={() => setFocusedField('thesis')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={styles.aiHintBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
                <Text style={styles.aiHintText}>
                  Complete your investment preferences to improve AI-powered startup matching
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, savingPrefs && { opacity: 0.7 }]}
                onPress={handleSavePreferences}
                disabled={savingPrefs}
              >
                {savingPrefs
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.saveBtnText}>Save Preferences</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 40 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarWrapper: { position: 'relative' },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#2563EB' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
  userName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  roleBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginTop: 4, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: '600', color: '#2563EB', textTransform: 'capitalize' },
  signOutBtn: { marginLeft: 'auto', padding: 8 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#2563EB' },
  tabText: { fontSize: 14, color: '#6B7280' },
  tabTextActive: { color: '#2563EB', fontWeight: '600' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16 },
  cardSectionTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F8FAFC', paddingHorizontal: 12, fontSize: 14, color: '#1A1A2E' },
  inputFocused: { borderColor: '#2563EB', backgroundColor: '#FFFFFF' },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  aiHintBanner: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  aiHintText: { flex: 1, fontSize: 13, color: '#2563EB', lineHeight: 18 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 24, justifyContent: 'center' },
  loadingText: { fontSize: 14, color: '#6B7280' },
});
