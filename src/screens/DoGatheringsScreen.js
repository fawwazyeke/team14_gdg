import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoTheme } from '../context/DoThemeContext';
import { DawnHorizon, Card, Chip } from '../components/DoAtoms';
import { getEvents, EVENT_CATEGORIES } from '../services/eventsService';

const CAT_COLORS = {
  'Language Exchange': ['#A0C5C6', '#6FA3A4', '#4D8485'],
  'Games & Hobbies':  ['#A8B8C0', '#7E94A1', '#566C7B'],
  'Food & Cafe':      ['#F2C490', '#D49A5C', '#B07A3D'],
  'Culture':          ['#C5B6D6', '#9D8CB8', '#7A6993'],
  'Tech & Learning':  ['#A8C0AA', '#7A9C7F', '#5A7D60'],
  'Outdoor & Sports': ['#A5B582', '#7A8E54', '#5C6F3B'],
};

function EventCard({ event, P, rsvp, onToggle }) {
  const imgColors = CAT_COLORS[event.category] || ['#C5B89F', '#9A8B70', '#6E5F47'];
  return (
    <Card P={P} style={{ overflow: 'hidden', marginBottom: 16 }}>
      <LinearGradient colors={imgColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.eventImg}>
        <View style={styles.catTag}>
          <Text style={[styles.catTagText, { color: P.ink }]}>{event.emoji} {event.category}</Text>
        </View>
      </LinearGradient>
      <View style={styles.eventBody}>
        <Text style={[styles.eventTitle, { color: P.ink }]}>{event.title}</Text>
        {event.description ? (
          <Text style={[styles.eventVibe, { color: P.inkSoft }]} numberOfLines={2}>{event.description}</Text>
        ) : null}
        <View style={{ gap: 4, marginBottom: 14 }}>
          <Text style={[styles.eventMeta, { color: P.inkSoft }]}>🕊  {event.date}</Text>
          <Text style={[styles.eventMeta, { color: P.inkSoft }]}>📍 {event.location}</Text>
        </View>
        <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
          {rsvp ? (
            <LinearGradient
              colors={[P.accent, P.accentDeep]}
              style={styles.rsvpBtn}
            >
              <Text style={styles.rsvpBtnTextActive}>✓ You're going</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.rsvpBtnGhost, { borderColor: P.line }]}>
              <Text style={[styles.rsvpBtnText, { color: P.ink }]}>I'm interested</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function DoGatheringsScreen() {
  const { P } = useDoTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [rsvps, setRsvps] = useState({});

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setError('Could not load gatherings. Start the backend and try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeCategory === 'All'
    ? events
    : events.filter(e => e.category?.toLowerCase() === activeCategory.toLowerCase());

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.screenTitle, { color: P.ink }]}>Gatherings, gently</Text>
        <Text style={[styles.screenSub, { color: P.inkSoft }]}>Small rooms. Low pressure. Bring yourself.</Text>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
        style={{ flexGrow: 0 }}
      >
        {EVENT_CATEGORIES.map(cat => (
          <Chip key={cat} P={P} active={activeCategory === cat} onPress={() => setActiveCategory(cat)}>
            {cat}
          </Chip>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={P.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={[styles.emptyText, { color: P.inkSoft }]}>{error}</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <Text style={[styles.emptyText, { color: P.inkSoft }]}>Nothing here today. Try another tag.</Text>
          ) : (
            filtered.map(e => (
              <EventCard
                key={e.id}
                event={e}
                P={P}
                rsvp={!!rsvps[e.id]}
                onToggle={() => setRsvps(r => ({ ...r, [e.id]: !r[e.id] }))}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  screenTitle: { fontSize: 30, fontWeight: '600', letterSpacing: -0.5 },
  screenSub: { fontSize: 15, marginTop: 6, lineHeight: 22 },
  filterBar: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },

  list: { paddingHorizontal: 20, paddingBottom: 110 },

  eventImg: { height: 130, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start', padding: 12 },
  catTag: {
    backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999,
  },
  catTagText: { fontSize: 12, fontWeight: '600' },
  eventBody: { padding: 18 },
  eventTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4, letterSpacing: -0.2 },
  eventVibe: { fontSize: 13, marginBottom: 10, lineHeight: 19 },
  eventMeta: { fontSize: 13, fontWeight: '500' },
  rsvpBtn: { paddingVertical: 13, borderRadius: 999, alignItems: 'center' },
  rsvpBtnTextActive: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rsvpBtnGhost: { paddingVertical: 13, borderRadius: 999, alignItems: 'center', borderWidth: 1.5 },
  rsvpBtnText: { fontSize: 15, fontWeight: '600' },

  emptyText: { textAlign: 'center', fontSize: 15, marginTop: 40, paddingHorizontal: 24, lineHeight: 22 },
});
