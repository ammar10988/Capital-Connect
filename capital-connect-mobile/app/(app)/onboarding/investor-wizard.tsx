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
import { ChipSelector } from '../../../components/onboarding/ChipSelector';
import { SegmentedButtons } from '../../../components/onboarding/SegmentedButtons';
import { useAuthContext } from '../../../context/AuthContext';

const INVESTOR_TYPES = [
  { icon: 'flash-outline' as const, label: 'Angel Investor', description: 'Individual early-stage investor deploying personal capital', value: 'angel' },
  { icon: 'trending-up-outline' as const, label: 'Venture Capital', description: 'Professional fund investing in high-growth scalable startups', value: 'venture-capital' },
  { icon: 'business-outline' as const, label: 'Bank', description: 'Institutional debt funding and venture debt provider', value: 'bank' },
  { icon: 'shield-outline' as const, label: 'NBFC', description: 'Non-Banking Financial Company offering flexible financing', value: 'nbfc' },
  { icon: 'home-outline' as const, label: 'Family Office', description: 'Long-term wealth management with patient capital deployment', value: 'family-office' },
  { icon: 'briefcase-outline' as const, label: 'Corporate VC', description: 'Strategic corporate investing for innovation and partnerships', value: 'corporate-venture' },
];

const SECTORS = ['AI/ML','FinTech','HealthTech','SaaS','CleanTech','EdTech','AgriTech','DeepTech','Consumer','E-Commerce','Web3/Crypto','Cybersecurity','Logistics','HRTech','LegalTech','PropTech','SpaceTech','BioTech','Gaming','Media'];
const STAGES = ['Pre-Seed','Seed','Series A','Series B','Series C+','Growth'];
const GEOGRAPHIES = ['India','Southeast Asia','USA','Europe','Middle East','Africa','Latin America','Global','APAC'];

const STEPPER_LABELS = ['Role','Type','Profile','Focus','Details','Done'];

export default function InvestorWizardScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuthContext();
  const [step, setStep] = useState(0);
  const [investorType, setInvestorType] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', title: '', fundName: '', bankName: '',
    nbfcName: '', familyOfficeName: '', parentCompany: '', cvcName: '',
    location: '', bio: '', linkedinUrl: '', fundSize: '', portfolioCount: '',
    sectors: [] as string[], stages: [] as string[], geography: [] as string[],
    thesis: '', minTicket: '', maxTicket: '', minAmount: '', maxAmount: '',
    lendingProducts: [] as string[], fundingTypes: [] as string[],
    coInvestInterest: null as string | null, riskAppetite: null as string | null,
    riskTolerance: null as string | null, innovationFocus: [] as string[],
    partnershipTypes: [] as string[],
  });

  function goToStep(nextStep: number, direction: 'forward' | 'back') {
    const toValue = direction === 'forward' ? -300 : 300;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start(() => setStep(nextStep));
  }

  function updateForm(key: string, value: unknown) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  function toggleChip(key: string, value: string) {
    setFormData(prev => {
      const arr = prev[key as keyof typeof prev] as string[];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  }

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  async function handleFinish() {
    if (!investorType) return;
    setSaving(true);
    try {
      // Build investor_profiles data from wizard form
      const investorProfileData: Record<string, unknown> = {
        title: formData.title || null,
        bio: formData.bio || null,
        linkedin_url: formData.linkedinUrl || null,
        location: formData.location || null,
        investment_thesis: formData.thesis || null,
        sectors: formData.sectors,
        stage_preference: formData.stages,
        geography: formData.geography,
        ticket_size_min: formData.minTicket ? Number(formData.minTicket) : null,
        ticket_size_max: formData.maxTicket ? Number(formData.maxTicket) : null,
        portfolio_count: formData.portfolioCount ? Number(formData.portfolioCount) : 0,
        actively_investing: true,
      };

      if (investorType === 'venture-capital') {
        investorProfileData.fund_name = formData.fundName || null;
        investorProfileData.fund_size_usd = formData.fundSize ? Number(formData.fundSize) : null;
      } else if (investorType === 'bank') {
        investorProfileData.bank_name = formData.bankName || null;
        investorProfileData.lending_products = formData.lendingProducts;
      } else if (investorType === 'nbfc') {
        investorProfileData.nbfc_name = formData.nbfcName || null;
        investorProfileData.funding_types = formData.fundingTypes;
        investorProfileData.risk_tolerance = formData.riskTolerance || null;
      } else if (investorType === 'family-office') {
        investorProfileData.office_name = formData.familyOfficeName || null;
        investorProfileData.co_investment_interest = formData.coInvestInterest || null;
      } else if (investorType === 'corporate-venture') {
        investorProfileData.parent_company = formData.parentCompany || null;
        investorProfileData.cvc_name = formData.cvcName || null;
        investorProfileData.strategic_sectors = formData.sectors;
        investorProfileData.partnership_types = formData.partnershipTypes;
        investorProfileData.innovation_focus = formData.innovationFocus;
      }

      await completeOnboarding({
        role: 'investor',
        investorType: investorType as any,
        investorProfileData,
      });

      router.replace('/(app)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save profile. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  }

  const renderStep0 = () => (
    <View>
      <Text style={styles.stepTitle}>What type of investor are you?</Text>
      <Text style={styles.stepSubtitle}>This helps us personalize your deal flow and discovery experience.</Text>
      <View style={styles.typeGrid}>
        {INVESTOR_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[styles.typeCard, investorType === type.value && styles.typeCardSelected]}
            onPress={() => setInvestorType(type.value)}
            activeOpacity={0.8}
          >
            <View style={styles.typeIconContainer}>
              <Ionicons name={type.icon} size={18} color="#2563EB" />
            </View>
            <Text style={styles.typeLabel}>{type.label}</Text>
            <Text style={styles.typeDescription}>{type.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderProfileFields = () => {
    if (investorType === 'venture-capital') {
      return (
        <>
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
          <Text style={styles.fieldLabel}>TITLE / ROLE</Text>
          <TextInput style={inputStyle('title')} placeholder="Partner, Managing Director" placeholderTextColor="#9CA3AF" value={formData.title} onChangeText={v => updateForm('title', v)} onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField(null)} />
          <Text style={styles.fieldLabel}>FUND NAME</Text>
          <TextInput style={inputStyle('fund')} placeholder="Accel India" placeholderTextColor="#9CA3AF" value={formData.fundName} onChangeText={v => updateForm('fundName', v)} onFocus={() => setFocusedField('fund')} onBlur={() => setFocusedField(null)} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>FUND SIZE (USD)</Text>
              <TextInput style={inputStyle('fs')} placeholder="100000000" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={formData.fundSize} onChangeText={v => updateForm('fundSize', v)} onFocus={() => setFocusedField('fs')} onBlur={() => setFocusedField(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>PORTFOLIO CO.</Text>
              <TextInput style={inputStyle('pc')} placeholder="20" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={formData.portfolioCount} onChangeText={v => updateForm('portfolioCount', v)} onFocus={() => setFocusedField('pc')} onBlur={() => setFocusedField(null)} />
            </View>
          </View>
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <TextInput style={inputStyle('loc')} placeholder="Mumbai, India" placeholderTextColor="#9CA3AF" value={formData.location} onChangeText={v => updateForm('location', v)} onFocus={() => setFocusedField('loc')} onBlur={() => setFocusedField(null)} />
          <Text style={styles.fieldLabel}>SHORT BIO</Text>
          <TextInput style={[inputStyle('bio'), styles.multilineInput]} placeholder="Tell founders what makes you a great partner..." placeholderTextColor="#9CA3AF" multiline textAlignVertical="top" value={formData.bio} onChangeText={v => updateForm('bio', v)} onFocus={() => setFocusedField('bio')} onBlur={() => setFocusedField(null)} />
        </>
      );
    }
    if (investorType === 'bank') {
      return (
        <>
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
          <Text style={styles.fieldLabel}>TITLE / ROLE</Text>
          <TextInput style={inputStyle('title')} placeholder="VP, Startup Banking" placeholderTextColor="#9CA3AF" value={formData.title} onChangeText={v => updateForm('title', v)} onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField(null)} />
          <Text style={styles.fieldLabel}>BANK NAME</Text>
          <TextInput style={inputStyle('bank')} placeholder="HDFC Bank" placeholderTextColor="#9CA3AF" value={formData.bankName} onChangeText={v => updateForm('bankName', v)} onFocus={() => setFocusedField('bank')} onBlur={() => setFocusedField(null)} />
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <TextInput style={inputStyle('loc')} placeholder="Mumbai, India" placeholderTextColor="#9CA3AF" value={formData.location} onChangeText={v => updateForm('location', v)} onFocus={() => setFocusedField('loc')} onBlur={() => setFocusedField(null)} />
        </>
      );
    }
    if (investorType === 'nbfc') {
      return (
        <>
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
          <Text style={styles.fieldLabel}>NBFC NAME</Text>
          <TextInput style={inputStyle('nbfc')} placeholder="IndiaBulls" placeholderTextColor="#9CA3AF" value={formData.nbfcName} onChangeText={v => updateForm('nbfcName', v)} onFocus={() => setFocusedField('nbfc')} onBlur={() => setFocusedField(null)} />
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <TextInput style={inputStyle('loc')} placeholder="Delhi, India" placeholderTextColor="#9CA3AF" value={formData.location} onChangeText={v => updateForm('location', v)} onFocus={() => setFocusedField('loc')} onBlur={() => setFocusedField(null)} />
        </>
      );
    }
    if (investorType === 'family-office') {
      return (
        <>
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
          <Text style={styles.fieldLabel}>FAMILY OFFICE NAME</Text>
          <TextInput style={inputStyle('fo')} placeholder="Birla Family Office" placeholderTextColor="#9CA3AF" value={formData.familyOfficeName} onChangeText={v => updateForm('familyOfficeName', v)} onFocus={() => setFocusedField('fo')} onBlur={() => setFocusedField(null)} />
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <TextInput style={inputStyle('loc')} placeholder="Mumbai, India" placeholderTextColor="#9CA3AF" value={formData.location} onChangeText={v => updateForm('location', v)} onFocus={() => setFocusedField('loc')} onBlur={() => setFocusedField(null)} />
          <Text style={styles.sectionLabel}>CO-INVESTMENT INTEREST</Text>
          <SegmentedButtons options={['Yes','No','Selective']} selected={formData.coInvestInterest} onSelect={v => updateForm('coInvestInterest', v)} />
        </>
      );
    }
    if (investorType === 'corporate-venture') {
      return (
        <>
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
          <Text style={styles.fieldLabel}>PARENT COMPANY</Text>
          <TextInput style={inputStyle('pc2')} placeholder="Reliance Industries" placeholderTextColor="#9CA3AF" value={formData.parentCompany} onChangeText={v => updateForm('parentCompany', v)} onFocus={() => setFocusedField('pc2')} onBlur={() => setFocusedField(null)} />
          <Text style={styles.fieldLabel}>CVC ARM NAME</Text>
          <TextInput style={inputStyle('cvc')} placeholder="Reliance Ventures" placeholderTextColor="#9CA3AF" value={formData.cvcName} onChangeText={v => updateForm('cvcName', v)} onFocus={() => setFocusedField('cvc')} onBlur={() => setFocusedField(null)} />
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <TextInput style={inputStyle('loc')} placeholder="Mumbai, India" placeholderTextColor="#9CA3AF" value={formData.location} onChangeText={v => updateForm('location', v)} onFocus={() => setFocusedField('loc')} onBlur={() => setFocusedField(null)} />
        </>
      );
    }
    // Angel (default)
    return (
      <>
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
        <Text style={styles.fieldLabel}>TITLE / ROLE</Text>
        <TextInput style={inputStyle('title')} placeholder="Angel Investor" placeholderTextColor="#9CA3AF" value={formData.title} onChangeText={v => updateForm('title', v)} onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField(null)} />
        <Text style={styles.fieldLabel}>LOCATION</Text>
        <TextInput style={inputStyle('loc')} placeholder="Bangalore, India" placeholderTextColor="#9CA3AF" value={formData.location} onChangeText={v => updateForm('location', v)} onFocus={() => setFocusedField('loc')} onBlur={() => setFocusedField(null)} />
        <Text style={styles.fieldLabel}>SHORT BIO</Text>
        <TextInput style={[inputStyle('bio'), styles.multilineInput]} placeholder="Tell founders about yourself..." placeholderTextColor="#9CA3AF" multiline textAlignVertical="top" value={formData.bio} onChangeText={v => updateForm('bio', v)} onFocus={() => setFocusedField('bio')} onBlur={() => setFocusedField(null)} />
      </>
    );
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Your profile</Text>
      <Text style={styles.stepSubtitle}>Tell founders who you are and what you do.</Text>
      {renderProfileFields()}
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Investment focus</Text>
      <Text style={styles.stepSubtitle}>Define your thesis so we can match you with the right startups.</Text>
      <Text style={styles.sectionLabel}>SECTORS OF INTEREST</Text>
      <ChipSelector options={SECTORS} selected={formData.sectors} onToggle={v => toggleChip('sectors', v)} />
      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>STAGE PREFERENCE</Text>
      <ChipSelector options={STAGES} selected={formData.stages} onToggle={v => toggleChip('stages', v)} />
      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>GEOGRAPHY</Text>
      <ChipSelector options={GEOGRAPHIES} selected={formData.geography} onToggle={v => toggleChip('geography', v)} />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Check size & thesis</Text>
      <Text style={styles.stepSubtitle}>Tell founders what you invest and how you think.</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>MIN TICKET (USD)</Text>
          <TextInput style={inputStyle('minT')} placeholder="50000" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={formData.minTicket} onChangeText={v => updateForm('minTicket', v)} onFocus={() => setFocusedField('minT')} onBlur={() => setFocusedField(null)} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>MAX TICKET (USD)</Text>
          <TextInput style={inputStyle('maxT')} placeholder="500000" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={formData.maxTicket} onChangeText={v => updateForm('maxTicket', v)} onFocus={() => setFocusedField('maxT')} onBlur={() => setFocusedField(null)} />
        </View>
      </View>
      <Text style={styles.fieldLabel}>INVESTMENT THESIS</Text>
      <TextInput style={[inputStyle('thesis'), styles.multilineInput]} placeholder="Describe your investment thesis..." placeholderTextColor="#9CA3AF" multiline textAlignVertical="top" value={formData.thesis} onChangeText={v => updateForm('thesis', v)} onFocus={() => setFocusedField('thesis')} onBlur={() => setFocusedField(null)} />
      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>RISK APPETITE</Text>
      <SegmentedButtons options={['Conservative','Moderate','Aggressive']} selected={formData.riskAppetite} onSelect={v => updateForm('riskAppetite', v)} />
    </View>
  );

  const renderStep4 = () => (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.successCircle}>
        <Ionicons name="checkmark-outline" size={32} color="#22C55E" />
      </View>
      <Text style={styles.doneTitle}>You're all set!</Text>
      <Text style={styles.doneSubtitle}>
        Your investor profile is ready. Browse curated startup deal flow that matches your thesis.
      </Text>
      <View style={styles.statsRow}>
        {[
          { value: '500+', label: 'Curated Startups' },
          { value: '1.2K', label: 'Active Founders' },
          { value: '20+', label: 'Sectors Covered' },
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
      default: return null;
    }
  };

  const canGoForward = () => {
    if (step === 0) return investorType !== null;
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

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (step === 0) router.back();
              else goToStep(step - 1, 'back');
            }}
            disabled={saving}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          {step < 4 ? (
            <TouchableOpacity
              style={[styles.continueBtn, !canGoForward() && styles.continueBtnDisabled]}
              disabled={!canGoForward()}
              onPress={() => goToStep(step + 1, 'forward')}
            >
              <Text style={styles.continueBtnText}>Continue →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.continueBtn, saving && styles.continueBtnDisabled]}
              disabled={saving}
              onPress={handleFinish}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.continueBtnText}>Go to Dashboard →</Text>
              )}
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
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
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
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '47%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  typeCardSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  typeDescription: { fontSize: 11, color: '#9CA3AF', lineHeight: 15 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 10 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1A1A2E',
    marginBottom: 4,
  },
  inputFocused: { borderColor: '#2563EB' },
  multilineInput: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
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
  statMini: { flex: 1, backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, alignItems: 'center' },
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
