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
import { formatAuthError } from '../../lib/authSecurity';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { signIn } = useAuthContext();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError('');
    try {
      await signIn(data.email, data.password);
      router.replace('/(app)');
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

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
        <Text style={styles.formTitle}>Welcome back</Text>
        <Text style={styles.formSubtitle}>Sign in to your Capital Connect account</Text>

        {error ? <Text style={styles.globalError}>{error}</Text> : null}

        {/* Email */}
        <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <View
              style={[
                styles.inputRow,
                emailFocused && styles.inputRowFocused,
              ]}
            >
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={{ paddingLeft: 14 }} />
              <TextInput
                style={styles.textInput}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          )}
        />
        {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}

        {/* Password */}
        <View style={[styles.fieldHeaderRow, { marginTop: 16 }]}>
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <View
              style={[
                styles.inputRow,
                passwordFocused && styles.inputRowFocused,
              ]}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={{ paddingLeft: 14 }} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={value}
                onChangeText={onChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ paddingRight: 14 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

        {/* Sign In Button */}
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={handleSubmit(onSubmit)}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signInBtnText}>Sign In →</Text>
          )}
        </TouchableOpacity>

        {/* Bottom Link */}
        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.bottomLink}>Create one</Text>
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
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    color: '#2563EB',
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
  signInBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  signInBtnText: {
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
});
