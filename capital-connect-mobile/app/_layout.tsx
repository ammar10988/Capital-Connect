import { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuthContext } from '../context/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Loader } from '../components/ui/Loader';
import { View } from 'react-native';

function RootLayoutNav() {
  const { user, profile, loading } = useAuthContext();
  const segments = [...useSegments()];
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for the navigator to be mounted before redirecting
    if (!navigationState?.key) return;
    // Wait for auth state to initialize
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(app)' && segments[1] === 'onboarding';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(app)');
    } else if (user && profile && !profile.onboarding_completed && !inOnboarding) {
      router.replace('/(app)/onboarding/role');
    }
  }, [user, profile, loading, segments, navigationState?.key]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <Loader />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ErrorBoundary>
  );
}
