import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProgressStepper } from '../../../components/onboarding/ProgressStepper';
import { SelectionCard } from '../../../components/onboarding/SelectionCard';
import { useAuthContext } from '../../../context/AuthContext';

const STEPPER_LABELS = ['Role','Type','Profile','Company','Traction','Fundraise','Done'];
const SECTORS = ['AI/ML','FinTech','HealthTech','SaaS','CleanTech','EdTech','AgriTech','DeepTech','Consumer','E-Commerce','Web3/Crypto','Logistics','BioTech'];
const STAGES = ['Pre-Seed','Seed','Series A','Series B','Series B+','Growth'];

export default function FounderWizardScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuthContext();
  const [step, setStep] = useState(0);
  const [founderType, setFounderType] = useState<'active' | 'idea' | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [formData, setFormData] = useState({
    firstName: '', lastName: '',
    companyName: '', sector: '', arr: '', momGrowth: '', fundingAsk: '',
  });

  async function handleFinish() {
    setSaving(true);
    try {
      await completeOnboarding({
        role: 'founder',
        founderType: founderType ?? 'active',
        founderProfileData: {
          founder_type: founderType ?? 'active',
          company_name: formData.companyName || null,
          sector: formData.sector || null,
          stage: selectedStage || null,
          arr: formData.arr ? Number(formData.arr) : null,
          mom_growth: formData.momGrowth ? Number(formData.momGrowth) : null,
          raise_amount: formData.fundingAsk ? Number(formData.fundingAsk) : null,
        },
      });
      router.replace('/(app)');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  function goToStep(nextStep: number, direction: 'forward' | 'back') {
    const toValue = direction === 'forward' ? -300 : 300;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start(() => setStep(nextStep));
  }

  function updateForm(key: string, value: string) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  const renderStep0 = () => (
    <View>
      <Text style={styles.stepTitle}>What stage are you at?</Text>
      <Text style={styles.stepSubtitle}>This shapes your dashboard and the investors we connect you with.</Text>
      <View style={styles.selectionRow}>
        <SelectionCard
          icon="rocket-outline"
          label="Active Startup"
          description="Registered company actively seeking investment"
          selected={founderType === 'active'}
          onPress={() => setFounderType('active')}
          accentColor="#22C55E"
          accentBg="#DCFCE7"
          accentLightBg="#F0FDF4"
        />
        <SelectionCard
          icon="bulb-outline"
          label="Idea Stage"
          description="Early concept seeking mentors, co-founders, or pre-seed"
          selected={founderType === 'idea'}
          onPress={() => setFounderType('idea')}
        />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Your profile</Text>
      <Text style={styles.stepSubtitle}>Let investors know who they're talking to.</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>FIRST NAME</Text>
          <TextInput style={inputStyle('fn')} placeholder="Jane" placeholderTextColor="#9CA3AF" value={formData.firstName} onChangeText={v => updateForm('firstName', v)} onFocus={() => setFocusedField('fn')} onBlur={() => setFocusedField(null)} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>LAST NAME</Text>
          <TextInput style={inputStyle('ln')} placeholder="Doe" placeholderTextColor="#9CA3AF" value={formData.lastName} onChangeText={v => updateForm('lastName', v)} onFocus={() => setFocusedField('ln')} onBlur={() => setFocusedField(null)} />
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>About your startup</Text>
      <Text style={styles.stepSubtitle}>Tell us about your company.</Text>
      <Text style={styles.fieldLabel}>COMPANY NAME</Text>
      <TextInput style={inputStyle('co')} placeholder="Acme Inc." placeholderTextColor="#9CA3AF" value={formData.companyName} onChangeText={v => updateForm('companyName', v)} onFocus={() => setFocusedField('co')} onBlur={() => setFocusedField(null)} />
      <Text style={[styles.fieldLabel, { marginTop: 16 }]}>SECTOR</Text>
      <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', height: 52 }]}>
        <Text style={{ flex: 1, color: formData.sector ? '#1A1A2E' : '#9CA3AF', fontSize: 14 }}>
          {formData.sector || 'Select sector'}
        </Text>
        <Ionicons name="chevron-down-outline" size={18} color="#9CA3AF" />
      </View>
      <Text style={[styles.fieldLabel, { marginTop: 16, marginBottom: 10 }]}>STAGE</Text>
      <View style={styles.stageGrid}>
        {STAGES.map((stage) => (
          <TouchableOpacity
            key={stage}
            style={[
              styles.stageBtn,
              selectedStage === stage && styles.stageBtnSelected,
            ]}
            onPress={() => setSelectedStage(stage)}
          >
            <Text style={[styles.stageBtnText, selectedStage === stage && styles.stageBtnTextSelected]}>
              {stage}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Traction metrics</Text>
      <Text style={styles.stepSubtitle}>Share your current metrics to attract aligned investors.</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>ARR (USD)</Text>
          <Text style={styles.fieldHelper}>Annual Recurring Revenue</Text>
          <TextInput style={inputStyle('arr')} placeholder="12000" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={formData.arr} onChangeText={v => updateForm('arr', v)} onFocus={() => setFocusedField('arr')} onBlur={() => setFocusedField(null)} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>MOM GROWTH %</Text>
          <Text style={styles.fieldHelper}>Month-over-month growth</Text>
          <TextInput style={inputStyle('mg')} placeholder="14" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={formData.momGrowth} onChangeText={v => updateForm('momGrowth', v)} onFocus={() => setFocusedField('mg')} onBlur={() => setFocusedField(null)} />
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>Fundraising</Text>
      <Text style={styles.stepSubtitle}>How much are you raising and what's the round?</Text>
      <Text style={styles.fieldLabel}>FUNDING ASK (USD)</Text>
      <TextInput
        style={[inputStyle('fa'), { marginBottom: 16 }]}
        placeholder="1000000"
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
        value={formData.fundingAsk}
        onChangeText={v => updateForm('fundingAsk', v)}
        onFocus={() => setFocusedField('fa')}
        onBlur={() => setFocusedField(null)}
      />
      <View style={styles.noteBanner}>
        <Text style={styles.noteLabel}>Note</Text>
        <Text style={styles.noteText}>
          To appear on the investor marketplace, you'll need to complete a full startup application after onboarding. Your profile will be reviewed and approved before going live.
        </Text>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.successCircle}>
        <Ionicons name="rocket-outline" size={32} color="#22C55E" />
      </View>
      <Text style={styles.doneTitle}>You're ready!</Text>
      <Text style={styles.doneSubtitle}>
        Your founder profile is set up. Connect with aligned investors and grow your startup.
      </Text>
      <View style={styles.statsRow}>
        {[
          { value: '200+', label: 'Active Investors' },
          { value: '48h', label: 'Avg. Response Time' },
          { value: '1K+', label: 'Successful Intros' },
        ].map((stat, i) => (
          <View key={i} style={styles.statMini}>
            <Text style={styles.statMiniValue}>{stat.value}</Text>
            <Text style={styles.statMiniLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  const canGoForward = () => {
    if (step === 0) return founderType !== null;
    return true;
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.stepperContainer}>
          <ProgressStepper steps={STEPPER_LABELS} currentStep={step + 1} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.card, { transform: [{ translateX: slideAnim }] }]}>
            {renderStepContent()}
          </Animated.View>
        </ScrollView>

        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (step === 0) router.back();
              else goToStep(step - 1, 'back');
            }}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          {step < 5 ? (
            <TouchableOpacity
              style={[styles.continueBtn, !canGoForward() && styles.continueBtnDisabled]}
              disabled={!canGoForward()}
              onPress={() => goToStep(step + 1, 'forward')}
            >
              <Text style={styles.continueBtnText}>Continue →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: '#22C55E' }, saving && { opacity: 0.7 }]}
              onPress={handleFinish}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.continueBtnText}>Go to Dashboard →</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  stepperContainer: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  stepSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 24 },
  selectionRow: { flexDirection: 'row', gap: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5, marginBottom: 6 },
  fieldHelper: { fontSize: 11, color: '#9CA3AF', marginBottom: 6, marginTop: -2 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1A1A2E',
    marginBottom: 16,
  },
  inputFocused: { borderColor: '#22C55E' },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  stageBtn: {
    width: '30%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBtnSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  stageBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  stageBtnTextSelected: { color: '#22C55E', fontWeight: '600' },
  noteBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    marginBottom: 24,
  },
  noteLabel: { fontSize: 13, fontWeight: '600', color: '#F59E0B', marginBottom: 6 },
  noteText: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 16,
  },
  doneTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', textAlign: 'center', marginBottom: 10 },
  doneSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  statMini: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statMiniValue: { fontSize: 18, fontWeight: '700', color: '#22C55E' },
  statMiniLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F0F4FA',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  continueBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  continueBtnDisabled: { backgroundColor: '#BFDBFE' },
  continueBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
