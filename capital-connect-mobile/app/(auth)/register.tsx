import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../context/AuthContext';
import { FeaturePills } from '../../components/onboarding/FeaturePills';
import { PASSWORD_MIN_LENGTH, formatAuthError, validatePassword } from '../../lib/authSecurity';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).superRefine((data, ctx) => {
  const passwordError = validatePassword(data.password);
  if (passwordError) {
    ctx.addIssue({
      code: 'custom',
      path: ['password'],
      message: passwordError,
    });
  }

  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: "Passwords don't match",
    });
  }
});
type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { signUp } = useAuthContext();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError('');
    try {
      await signUp(data.email, data.password, data.firstName, data.lastName);
      setDone(true);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✉️</Text>
        <Text style={styles.successTitle}>Check your email</Text>
        <Text style={styles.successText}>
          We've sent you a confirmation link. Click it to activate your account, then sign in.
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.backBtnText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLogo}>⚡</Text>
          <Text style={styles.heroBrand}>Capital Connect</Text>
          <Text style={styles.heroHeadline}>Where Capital Meets Innovation</Text>
          <Text style={styles.heroSubtitle}>
            AI-powered deal flow and startup discovery platform
          </Text>
        </View>

        {/* Feature Pills */}
        <View style={{ marginBottom: 36 }}>
          <FeaturePills />
        </View>

        {/* Form Section */}
        <Text style={styles.formTitle}>Create account</Text>
        <Text style={styles.formSubtitle}>
          Join thousands of investors and founders on Capital Connect
        </Text>

        {error ? <Text style={styles.globalError}>{error}</Text> : null}

        {/* First + Last Name Row */}
        <View style={styles.nameRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>FIRST NAME</Text>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputRow, focusedField === 'firstName' && styles.inputRowFocused]}>
                  <Ionicons name="person-outline" size={18} color="#9CA3AF" style={{ paddingLeft: 14 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="John"
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}
            />
            {errors.firstName && <Text style={styles.fieldError}>{errors.firstName.message}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>LAST NAME</Text>
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputRow, focusedField === 'lastName' && styles.inputRowFocused]}>
                  <Ionicons name="person-outline" size={18} color="#9CA3AF" style={{ paddingLeft: 14 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Doe"
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}
            />
            {errors.lastName && <Text style={styles.fieldError}>{errors.lastName.message}</Text>}
          </View>
        </View>

        {/* Email */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>EMAIL ADDRESS</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <View style={[styles.inputRow, focusedField === 'email' && styles.inputRowFocused]}>
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={{ paddingLeft: 14 }} />
              <TextInput
                style={styles.textInput}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          )}
        />
        {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}

        {/* Password */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>PASSWORD</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <View style={[styles.inputRow, focusedField === 'password' && styles.inputRowFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={{ paddingLeft: 14 }} />
              <TextInput
                style={styles.textInput}
                placeholder={`Min. ${PASSWORD_MIN_LENGTH} characters`}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={value}
                onChangeText={onChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingRight: 14 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

        {/* Confirm Password */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>CONFIRM PASSWORD</Text>
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <View style={[styles.inputRow, focusedField === 'confirmPassword' && styles.inputRowFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={{ paddingLeft: 14 }} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirmPassword}
                value={value}
                onChangeText={onChange}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ paddingRight: 14 }}>
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>}

        {/* Create Account Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleSubmit(onSubmit)}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createBtnText}>Create Account →</Text>
          )}
        </TouchableOpacity>

        {/* Bottom Link */}
        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.bottomLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    marginBottom: 32,
  },
  heroLogo: {
    fontSize: 40,
  },
  heroBrand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroHeadline: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 24,
  },
  globalError: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputRow: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputRowFocused: {
    borderColor: '#2563EB',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1A1A2E',
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  createBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  bottomText: {
    fontSize: 13,
    color: '#6B7280',
  },
  bottomLink: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#F0F4FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    fontSize: 56,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
