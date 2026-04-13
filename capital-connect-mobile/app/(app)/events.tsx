import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useEvents, type Event } from '../../hooks/useEvents';
import { useAuthContext } from '../../context/AuthContext';
import { Loader } from '../../components/ui/Loader';

function formatEventDate(startsAt: string, endsAt: string | null): string {
  try {
    const start = new Date(startsAt);
    const dateStr = format(start, 'MMM d, yyyy');
    const timeStr = format(start, 'h:mm a');
    return `${dateStr} · ${timeStr}`;
  } catch {
    return startsAt;
  }
}

function EventCard({ event, onRsvp, onCancelRsvp }: {
  event: Event;
  onRsvp: (id: string) => Promise<void>;
  onCancelRsvp: (id: string) => Promise<void>;
}) {
  const [actionLoading, setActionLoading] = useState(false);

  async function handleRsvpToggle() {
    setActionLoading(true);
    try {
      if (event.hasRsvp) {
        await onCancelRsvp(event.id);
      } else {
        await onRsvp(event.id);
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update RSVP');
    } finally {
      setActionLoading(false);
    }
  }

  const eventTypeBadge = event.is_featured ? { bg: '#FEF3C7', text: '#F59E0B', label: 'Featured' } : null;

  return (
    <View style={styles.eventCard}>
      {/* Top Row */}
      <View style={styles.cardTopRow}>
        <View style={styles.calendarIconCircle}>
          <Ionicons name="calendar-outline" size={18} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
          <Text style={styles.eventDate}>{formatEventDate(event.starts_at, event.ends_at)}</Text>
        </View>
        {eventTypeBadge && (
          <View style={[styles.typeBadge, { backgroundColor: eventTypeBadge.bg }]}>
            <Text style={[styles.typeBadgeText, { color: eventTypeBadge.text }]}>{eventTypeBadge.label}</Text>
          </View>
        )}
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {event.location && (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color="#6B7280" />
            <Text style={styles.metaText}>{event.is_virtual ? 'Virtual' : event.location}</Text>
          </View>
        )}
        {event.host && (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={12} color="#6B7280" />
            <Text style={styles.metaText}>{event.host}</Text>
          </View>
        )}
        {event.spots_left != null && (
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color="#6B7280" />
            <Text style={styles.metaText}>{event.spots_left} spots left</Text>
          </View>
        )}
      </View>

      {/* Description */}
      {event.description && (
        <Text style={styles.description} numberOfLines={2}>{event.description}</Text>
      )}

      {/* Sectors */}
      {event.sectors.length > 0 && (
        <View style={styles.sectorTags}>
          {event.sectors.slice(0, 3).map(s => (
            <View key={s} style={styles.sectorTag}>
              <Text style={styles.sectorTagText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {event.registration_url && (
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => event.registration_url && Linking.openURL(event.registration_url)}
          >
            <Ionicons name="open-outline" size={14} color="#2563EB" />
            <Text style={styles.registerBtnText}>Register</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.rsvpBtn, event.hasRsvp && styles.rsvpBtnActive]}
          onPress={handleRsvpToggle}
          disabled={actionLoading}
        >
          <Ionicons
            name={event.hasRsvp ? 'checkmark-circle' : 'calendar-outline'}
            size={14}
            color={event.hasRsvp ? '#FFFFFF' : '#2563EB'}
          />
          <Text style={[styles.rsvpBtnText, event.hasRsvp && styles.rsvpBtnTextActive]}>
            {actionLoading ? 'Updating...' : event.hasRsvp ? 'RSVPed' : 'RSVP'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const { user } = useAuthContext();
  const { events, loading, error, fetchEvents, rsvpEvent, cancelRsvp } = useEvents(user?.id);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchEvents} />}
    >
      <Text style={styles.headerTitle}>Upcoming Events</Text>
      <Text style={styles.headerSubtitle}>India startup ecosystem events and meetups</Text>

      {loading ? (
        <Loader />
      ) : error ? (
        <View style={styles.emptyCard}>
          <Ionicons name="warning-outline" size={40} color="#EF4444" />
          <Text style={styles.emptyTitle}>Failed to load events</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchEvents}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No upcoming events</Text>
          <Text style={styles.emptySubtitle}>Check back soon for new events</Text>
        </View>
      ) : (
        events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            onRsvp={rsvpEvent}
            onCancelRsvp={cancelRsvp}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  content: { padding: 16, paddingTop: 52, paddingBottom: 32 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  calendarIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 3, flex: 1 },
  eventDate: { fontSize: 12, color: '#6B7280' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexShrink: 0 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },
  description: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 10 },
  sectorTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  sectorTag: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  sectorTagText: { fontSize: 10, color: '#2563EB' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  registerBtn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#2563EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  registerBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  rsvpBtn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#2563EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rsvpBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  rsvpBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  rsvpBtnTextActive: { color: '#FFFFFF' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
});
