import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../context/AuthContext';
import { MoreDrawer } from '../../components/dashboard/MoreDrawer';

const FOUNDER_TABS = ['index', 'my-listing', 'browse', 'browse-investors', 'more'] as const;
const INVESTOR_TABS = ['index', 'deal-flow', 'browse', 'trending', 'more'] as const;

const TAB_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap }> = {
  'index':            { icon: 'home-outline' },
  'my-listing':       { icon: 'document-text-outline' },
  'browse':           { icon: 'search-outline' },
  'browse-investors': { icon: 'people-outline' },
  'deal-flow':        { icon: 'briefcase-outline' },
  'trending':         { icon: 'trending-up-outline' },
  'more':             { icon: 'menu-outline' },
};

function CustomTabBar({
  isFounder,
  onMorePress,
}: { isFounder: boolean; onMorePress: () => void }) {
  const router = useRouter();
  const segments = [...useSegments()];

  // segments: ['(app)', 'browse'] or ['(app)', 'browse', '[id]']
  // The active tab is always the segment immediately after '(app)'
  const rawTab = segments[1] as string | undefined;
  const activeTab = rawTab && rawTab in TAB_CONFIG ? rawTab : 'index';

  const visibleTabs = isFounder ? FOUNDER_TABS : INVESTOR_TABS;

  return (
    <View style={styles.tabBar}>
      {visibleTabs.map((name) => {
        const config = TAB_CONFIG[name];
        if (!config) return null;
        const isFocused = activeTab === name;

        const onPress = () => {
          if (name === 'more') {
            onMorePress();
            return;
          }
          router.navigate(name === 'index' ? '/(app)/' : (`/(app)/${name}` as any));
        };

        return (
          <TouchableOpacity key={name} style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
            <Ionicons name={config.icon} size={24} color={isFocused ? '#2563EB' : '#9CA3AF'} />
            {isFocused && <View style={styles.tabDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AppLayout() {
  const { profile, signOut } = useAuthContext();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  const role = profile?.role ?? null;
  const investorType = profile?.investor_type ?? null;
  const isFounder = role === 'founder';

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="my-listing" />
        <Tabs.Screen name="browse" />
        <Tabs.Screen name="browse-investors" />
        <Tabs.Screen name="deal-flow" />
        <Tabs.Screen name="trending" />
        <Tabs.Screen name="more" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="news" />
        <Tabs.Screen name="funding" />
        <Tabs.Screen name="investors" />
        <Tabs.Screen name="onboarding" />
        <Tabs.Screen name="portfolio" />
        <Tabs.Screen name="introductions" />
        <Tabs.Screen name="ask-ai" />
        <Tabs.Screen name="settings" />
        <Tabs.Screen name="co-invest" />
        <Tabs.Screen name="partnership-intros" />
        <Tabs.Screen name="events" />
      </Tabs>

      <CustomTabBar isFounder={isFounder} onMorePress={() => setShowMore(true)} />

      <MoreDrawer
        visible={showMore}
        onClose={() => setShowMore(false)}
        role={role}
        investorType={investorType}
        onNavigate={handleNavigate}
        onLogout={signOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 56,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2563EB',
    marginTop: 1,
  },
});
