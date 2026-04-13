import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  role: string | null;
  investorType: string | null;
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  color?: string;
  textColor?: string;
  onPress?: () => void;
  isDivider?: boolean;
}

export function MoreDrawer({ visible, onClose, role, investorType, onNavigate, onLogout }: Props) {
  const isInvestor = role === 'investor';
  const isFounder = role === 'founder';
  const isFamilyOffice = investorType === 'family-office';
  const isCorporateVC = investorType === 'corporate-venture';

  const investorItems: MenuItem[] = [
    { icon: 'rocket-outline', label: 'Browse Startups', route: '/(app)/browse' },
    { icon: 'newspaper-outline', label: 'News Feed', route: '/(app)/news' },
    { icon: 'trending-up-outline', label: 'Trending', route: '/(app)/trending' },
    { icon: 'bar-chart-outline', label: 'Funding Tracker', route: '/(app)/funding' },
    isCorporateVC
      ? { icon: 'people-outline', label: 'Partnership Intros', route: '/(app)/partnership-intros' }
      : { icon: 'chatbubble-outline', label: 'Introductions', route: '/(app)/introductions' },
    ...(isFamilyOffice
      ? [{ icon: 'link-outline' as const, label: 'Co-Invest', route: '/(app)/co-invest', color: '#22C55E', textColor: '#22C55E' }]
      : []),
    { icon: 'briefcase-outline', label: 'Portfolio', route: '/(app)/portfolio' },
    { icon: 'person-outline', label: 'My Profile', route: '/(app)/profile' },
    { icon: 'sparkles-outline', label: 'Ask AI', route: '/(app)/ask-ai' },
    { icon: 'settings-outline', label: 'Settings', route: '/(app)/settings' },
  ];

  const founderItems: MenuItem[] = [
    { icon: 'people-outline', label: 'Browse Investors', route: '/(app)/browse-investors' },
    { icon: 'chatbubble-outline', label: 'Introductions', route: '/(app)/introductions' },
    { icon: 'newspaper-outline', label: 'News Feed', route: '/(app)/news' },
    { icon: 'trending-up-outline', label: 'Trending', route: '/(app)/trending' },
    { icon: 'bar-chart-outline', label: 'Funding Tracker', route: '/(app)/funding' },
    { icon: 'calendar-outline', label: 'Events', route: '/(app)/events' },
    { icon: 'person-outline', label: 'My Profile', route: '/(app)/profile' },
    { icon: 'sparkles-outline', label: 'Ask AI', route: '/(app)/ask-ai' },
    { icon: 'settings-outline', label: 'Settings', route: '/(app)/settings' },
  ];

  const items = isFounder ? founderItems : investorItems;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          onClose();
          onLogout();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>More</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                onClose();
                if (item.route) onNavigate(item.route);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.color ?? '#6B7280'}
                style={{ marginRight: 14 }}
              />
              <Text style={[styles.menuLabel, item.textColor ? { color: item.textColor } : {}]}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward-outline" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Logout */}
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 14 }} />
            <Text style={[styles.menuLabel, { color: '#EF4444', flex: 1 }]}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  menuItem: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuLabel: {
    fontSize: 14,
    color: '#1A1A2E',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
});
