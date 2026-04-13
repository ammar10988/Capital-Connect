import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { requestPasswordResetWithGateway } from '../../lib/authGateway';
import { formatAuthError } from '../../lib/authSecurity';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError('');
    try {
      await requestPasswordResetWithGateway(
        data.email,
        process.env.EXPO_PUBLIC_AUTH_RESET_REDIRECT_URL ?? 'http://localhost:5173/auth/reset-password',
      );
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
        <Text style={styles.successIcon}>📬</Text>
        <Text style={styles.successTitle}>Check your inbox</Text>
        <Text style={styles.successText}>We've sent a password reset link to your email.</Text>
        <Button title="Back to Sign In" onPress={() => router.replace('/(auth)/login')} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

        {error ? <Text style={styles.globalError}>{error}</Text> : null}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
              error={errors.email?.message}
            />
          )}
        />

        <Button title="Send Reset Link" onPress={handleSubmit(onSubmit)} loading={submitting} style={{ marginTop: 16 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface, padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 32 },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 32 },
  globalError: { color: Colors.danger, fontSize: 13, marginBottom: 16, padding: 12, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10 },
  successContainer: { flex: 1, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIcon: { fontSize: 56, marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  successText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});
