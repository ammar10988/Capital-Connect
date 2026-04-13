import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthContext } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user, profile, updateProfile, refreshProfile } = useAuthContext();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

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
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!user) return;

    setUploading(true);
    try {
      const uri = asset.uri;
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });

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

  async function handleSave() {
    if (!firstName.trim()) {
      Alert.alert('Required', 'First name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        company: company.trim() || null,
        bio: bio.trim() || null,
      });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back-outline" size={18} color="#2563EB" />
        <Text style={styles.backText}>Settings</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Profile</Text>
      <Text style={styles.headerSubtitle}>Manage your public profile</Text>

      {/* Avatar Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>PROFILE PHOTO</Text>
        <View style={styles.avatarRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{(profile?.first_name?.[0] ?? '?').toUpperCase()}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadPhoto} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={16} color="#2563EB" />
                <Text style={styles.uploadText}>Upload Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Basic Info */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>BASIC INFO</Text>
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
        <Text style={styles.fieldLabel}>FUND / COMPANY</Text>
        <TextInput style={inputStyle('co')} placeholder="Your company or fund" placeholderTextColor="#9CA3AF" value={company} onChangeText={setCompany} onFocus={() => setFocusedField('co')} onBlur={() => setFocusedField(null)} />
        <Text style={styles.fieldLabel}>BIO</Text>
        <TextInput style={[inputStyle('bio'), { height: 100, paddingTop: 12, textAlignVertical: 'top' }]} placeholder="Tell us about yourself..." placeholderTextColor="#9CA3AF" multiline value={bio} onChangeText={setBio} onFocus={() => setFocusedField('bio')} onBlur={() => setFocusedField(null)} />
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#FFFFFF" size="small" />
          : <Text style={styles.saveBtnText}>Save Profile</Text>
        }
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
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 60, height: 60, borderRadius: 30 },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#2563EB' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#2563EB', minWidth: 120, justifyContent: 'center' },
  uploadText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F8FAFC', paddingHorizontal: 12, fontSize: 14, color: '#1A1A2E' },
  inputFocused: { borderColor: '#2563EB', backgroundColor: '#FFFFFF' },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
