import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  host: string | null;
  audience: string | null;
  sectors: string[];
  location: string | null;
  is_virtual: boolean;
  meeting_url: string | null;
  starts_at: string;
  ends_at: string | null;
  time_label: string | null;
  total_spots: number | null;
  spots_left: number | null;
  registration_url: string | null;
  is_featured: boolean;
  created_at: string;
  hasRsvp?: boolean;
}

export function useEvents(userId: string | undefined) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, rsvpRes] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .order('starts_at', { ascending: true }),
        userId
          ? supabase
              .from('event_rsvps')
              .select('event_id')
              .eq('user_id', userId)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (eventsRes.error) throw eventsRes.error;

      const rsvpData = (rsvpRes as { data: { event_id: string }[] | null }).data ?? [];
      const rsvpSet = new Set<string>(rsvpData.map(r => r.event_id));

      const enriched: Event[] = (eventsRes.data ?? []).map(e => ({
        ...e,
        sectors: e.sectors ?? [],
        hasRsvp: rsvpSet.has(e.id),
      }));

      setEvents(enriched);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const rsvpEvent = useCallback(async (eventId: string) => {
    if (!userId) throw new Error('Not logged in');
    const { error } = await supabase
      .from('event_rsvps')
      .insert({ event_id: eventId, user_id: userId });
    if (error) throw error;
    setEvents(prev =>
      prev.map(e => e.id === eventId ? { ...e, hasRsvp: true, spots_left: e.spots_left != null ? e.spots_left - 1 : null } : e)
    );
  }, [userId]);

  const cancelRsvp = useCallback(async (eventId: string) => {
    if (!userId) throw new Error('Not logged in');
    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);
    if (error) throw error;
    setEvents(prev =>
      prev.map(e => e.id === eventId ? { ...e, hasRsvp: false, spots_left: e.spots_left != null ? e.spots_left + 1 : null } : e)
    );
  }, [userId]);

  return { events, loading, error, fetchEvents, rsvpEvent, cancelRsvp };
}
