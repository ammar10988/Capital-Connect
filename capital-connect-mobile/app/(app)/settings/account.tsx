import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuthContext } from '../../../context/AuthContext';
import { PASSWORD_MIN_LENGTH, validatePassword } from '../../../lib/authSecurity';
import { verifyCurrentPasswordWithGateway } from '../../../lib/authGateway';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, profile } = useAuthContext();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  async function handleUpdatePassword() {
    const passwordError = validatePassword(newPw);
    if (passwordError) {
      Alert.alert('Weak Password', passwordError);
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    if (!currentPw || !user?.email) {
      Alert.alert('Current Password Required', 'Enter your current password before choosing a new one.');
      return;
    }
    setSavingPw(true);
    try {
      await verifyCurrentPasswordWithGateway(user.email, currentPw);
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      Alert.alert('Updated', 'Your password has been changed.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update password.');
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back-outline" size={18} color="#2563EB" />
        <Text style={styles.backText}>Settings</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Account</Text>
      <Text style={styles.headerSubtitle}>Manage your account details</Text>

      {/* Email Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>EMAIL ADDRESS</Text>
        <View style={styles.emailRow}>
          <Ionicons name="mail-outline" size={18} color="#6B7280" />
          <Text style={styles.emailText}>{user?.email ?? 'Not available'}</Text>
          {user?.email_confirmed_at ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <View style={styles.unverifiedBadge}>
              <Text style={styles.unverifiedText}>Unverified</Text>
            </View>
          )}
        </View>
      </View>

      {/* Change Password */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>CHANGE PASSWORD</Text>
        <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
        <TextInput style={inputStyle('cp')} secureTextEntry placeholder="Current password" placeholderTextColor="#9CA3AF" value={currentPw} onChangeText={setCurrentPw} onFocus={() => setFocusedField('cp')} onBlur={() => setFocusedField(null)} />
        <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
        <TextInput style={inputStyle('np')} secureTextEntry placeholder={`New password (min ${PASSWORD_MIN_LENGTH} chars)`} placeholderTextColor="#9CA3AF" value={newPw} onChangeText={setNewPw} onFocus={() => setFocusedField('np')} onBlur={() => setFocusedField(null)} />
        <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
        <TextInput style={inputStyle('cnp')} secureTextEntry placeholder="Confirm new password" placeholderTextColor="#9CA3AF" value={confirmPw} onChangeText={setConfirmPw} onFocus={() => setFocusedField('cnp')} onBlur={() => setFocusedField(null)} />
        <TouchableOpacity
          style={[styles.changeBtn, savingPw && { opacity: 0.7 }]}
          onPress={handleUpdatePassword}
          disabled={savingPw}
        >
          {savingPw
            ? <ActivityIndicator color="#FFFFFF" size="small" />
            : <Text style={styles.changeBtnText}>Update Password</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={[styles.dangerCard, { marginTop: 12 }]}>
        <Text style={styles.dangerTitle}>DANGER ZONE</Text>
        <Text style={styles.dangerText}>Permanently delete your account and all associated data.</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => Alert.alert('Delete Account', 'This action cannot be undone. Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => {} },
          ])}
        >
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
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
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emailText: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  verifiedBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  verifiedText: { fontSize: 11, color: '#22C55E', fontWeight: '600' },
  unverifiedBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  unverifiedText: { fontSize: 11, color: '#D97706', fontWeight: '600' },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F8FAFC', paddingHorizontal: 12, fontSize: 14, color: '#1A1A2E' },
  inputFocused: { borderColor: '#2563EB', backgroundColor: '#FFFFFF' },
  changeBtn: { backgroundColor: '#2563EB', borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  changeBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  dangerCard: { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FEE2E2' },
  dangerTitle: { fontSize: 11, fontWeight: '700', color: '#EF4444', letterSpacing: 0.8, marginBottom: 8 },
  dangerText: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  deleteBtn: { backgroundColor: '#EF4444', borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
