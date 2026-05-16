import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoTheme } from '../context/DoThemeContext';
import { Card, Chip } from '../components/DoAtoms';
import { getEvents, EVENT_CATEGORIES } from '../services/eventsService';

const CAT_COLORS = {
  'Language Exchange': ['#A0C5C6', '#6FA3A4', '#4D8485'],
  'Games & Hobbies':  ['#A8B8C0', '#7E94A1', '#566C7B'],
  'Food & Cafe':      ['#F2C490', '#D49A5C', '#B07A3D'],
  'Culture':          ['#C5B6D6', '#9D8CB8', '#7A6993'],
  'Tech & Learning':  ['#A8C0AA', '#7A9C7F', '#5A7D60'],
  'Outdoor & Sports': ['#A5B582', '#7A8E54', '#5C6F3B'],
};

const CITIES = [
  { id: 'seoul', label: 'Seoul', flag: '🇰🇷' },
  { id: 'tokyo', label: 'Tokyo', flag: '🇯🇵' },
];

// Module-level cache — survives re-renders and tab switches
const _cache = {};

// ─── Skeleton card ──────────────────────────────────────────────
function SkeletonPulse({ style }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]} />;
}

function SkeletonCard({ P }) {
  const bg = P.line;
  return (
    <View style={[styles.skeletonCard, { backgroundColor: P.surface, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }]}>
      <SkeletonPulse style={{ height: 130, backgroundColor: bg }} />
      <View style={{ padding: 18, gap: 10 }}>
        <SkeletonPulse style={{ height: 18, width: '70%', borderRadius: 6, backgroundColor: bg }} />
        <SkeletonPulse style={{ height: 13, width: '90%', borderRadius: 6, backgroundColor: bg }} />
        <SkeletonPulse style={{ height: 13, width: '55%', borderRadius: 6, backgroundColor: bg }} />
        <SkeletonPulse style={{ height: 44, borderRadius: 999, backgroundColor: bg, marginTop: 4 }} />
      </View>
    </View>
  );
}

// ─── Event card ─────────────────────────────────────────────────
function EventCard({ event, P, rsvp, onToggle }) {
  const imgColors = CAT_COLORS[event.category] || ['#C5B89F', '#9A8B70', '#6E5F47'];
  return (
    <Card P={P} style={{ overflow: 'hidden', marginBottom: 16 }}>
      <LinearGradient colors={imgColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.eventImg}>
        <View style={styles.catTag}>
          <Text style={[styles.catTagText, { color: P.ink }]}>{event.emoji} {event.category}</Text>
        </View>
        {event.city ? (
          <View style={[styles.catTag, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>
              {event.city === 'seoul' ? '🇰🇷 Seoul' : '🇯🇵 Tokyo'}
            </Text>
          </View>
        ) : null}
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
            <LinearGradient colors={[P.grad[0], P.grad[1]]} style={styles.rsvpBtn}>
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

// ─── Main screen ────────────────────────────────────────────────
export default function DoGatheringsScreen() {
  const { P } = useDoTheme();
  const insets = useSafeAreaInsets();

  const [city, setCity] = useState('seoul');
  const [activeCategory, setActiveCategory] = useState('All');
  const [events, setEvents] = useState(_cache[`${city}-${activeCategory}`] || []);
  const [loading, setLoading] = useState(!_cache[`${city}-${activeCategory}`]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [rsvps, setRsvps] = useState({});

  const cacheKey = `${city}-${activeCategory}`;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!_cache[cacheKey]) setLoading(true);

    setError('');
    try {
      const data = await getEvents({ city, category: activeCategory });
      _cache[cacheKey] = data;
      setEvents(data);
    } catch {
      if (!_cache[cacheKey]) {
        setError('Could not load gatherings. Check the backend is running.');
      }
      // if cache exists, keep showing stale data silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city, activeCategory, cacheKey]);

  useEffect(() => {
    // Show cached data immediately, then refresh in background
    if (_cache[cacheKey]) {
      setEvents(_cache[cacheKey]);
      setLoading(false);
      load(true); // silent background refresh
    } else {
      load(false);
    }
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.screenTitle, { color: P.ink }]}>Gatherings, gently</Text>
        <Text style={[styles.screenSub, { color: P.inkSoft }]}>Small rooms. Low pressure. Bring yourself.</Text>

        {/* City toggle */}
        <View style={[styles.cityRow, { backgroundColor: P.surface, borderColor: P.line }]}>
          {CITIES.map(c => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCity(c.id)}
              style={[styles.cityBtn, city === c.id && { backgroundColor: P.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.cityBtnText, { color: city === c.id ? '#fff' : P.inkSoft }]}>
                {c.flag} {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={P.primary}
          />
        }
      >
        {loading ? (
          // Skeleton placeholders
          [1, 2, 3].map(i => <SkeletonCard key={i} P={P} />)
        ) : error && events.length === 0 ? (
          <Text style={[styles.emptyText, { color: P.inkSoft }]}>{error}</Text>
        ) : events.length === 0 ? (
          <Text style={[styles.emptyText, { color: P.inkSoft }]}>Nothing here today. Try another tag.</Text>
        ) : (
          events.map(e => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 4 },
  screenTitle: { fontSize: 30, fontWeight: '600', letterSpacing: -0.5 },
  screenSub: { fontSize: 15, marginTop: 6, lineHeight: 22, marginBottom: 14 },

  cityRow: {
    flexDirection: 'row', borderRadius: 999, borderWidth: 0.5,
    padding: 4, alignSelf: 'flex-start',
  },
  cityBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999 },
  cityBtnText: { fontSize: 14, fontWeight: '600' },

  filterBar: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 110 },

  skeletonCard: {},

  eventImg: {
    height: 130, justifyContent: 'space-between', flexDirection: 'row',
    alignItems: 'flex-start', padding: 12,
  },
  catTag: {
    backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12,
    paddingVertical: 5, borderRadius: 999,
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
