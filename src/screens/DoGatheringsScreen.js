import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, RefreshControl, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoTheme } from '../context/DoThemeContext';
import { Card, Chip } from '../components/DoAtoms';
import { getEvents, EVENT_CATEGORIES } from '../services/eventsService';


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
    <View style={[styles.skeletonCard, { backgroundColor: P.surface, borderColor: P.line }]}>
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
  return (
    <View style={styles.eventTile}>
      <Card P={P} style={styles.eventCard}>
        <View style={styles.eventBody}>
        <View style={styles.eventTagRow}>
          <View style={[styles.catTag, { backgroundColor: P.surface, borderColor: P.line, borderWidth: 1 }]}>
            <Text style={[styles.catTagText, { color: P.inkSoft }]}>{event.emoji} {event.category}</Text>
          </View>
          {event.city ? (
            <View style={[styles.catTag, { backgroundColor: P.surface, borderColor: P.line, borderWidth: 1 }]}>
              <Text style={[styles.catTagText, { color: P.inkSoft }]}>
                {event.city === 'seoul' ? '🇰🇷 Seoul' : '🇯🇵 Tokyo'}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.eventTitle, { color: P.ink }]} numberOfLines={2}>{event.title}</Text>
        {event.description ? (
          <Text style={[styles.eventVibe, { color: P.inkSoft }]} numberOfLines={3}>{event.description}</Text>
        ) : null}
        <View style={styles.eventMetaBlock}>
          <Text style={[styles.eventMeta, { color: P.inkSoft }]} numberOfLines={1}>🕊  {event.date}</Text>
          <Text style={[styles.eventMeta, { color: P.inkSoft }]} numberOfLines={2}>📍 {event.location}</Text>
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
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────
export default function DoGatheringsScreen() {
  const { P } = useDoTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const stackFilters = width < 600;

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

        {/* City + Category rows */}
        <View style={stackFilters ? styles.filterStack : styles.filterRow}>
          {/* City toggle */}
          <View style={[
            styles.pill,
            stackFilters ? styles.countryPillMobile : styles.countryPillDesktop,
            { backgroundColor: P.surface, borderColor: P.line },
          ]}>
            {CITIES.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCity(c.id)}
                style={[
                  styles.pillBtn,
                  stackFilters && styles.countryBtnMobile,
                  city === c.id && { backgroundColor: P.primary },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillBtnText, { color: city === c.id ? '#fff' : P.inkSoft }]}>
                  {c.flag} {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category selector */}
          <View style={[
            styles.categoryPill,
            stackFilters ? styles.categoryScroll : styles.categoryScrollInline,
            { backgroundColor: P.surface, borderColor: P.line },
          ]}>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}
            >
              {EVENT_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[styles.pillBtn, activeCategory === cat && { backgroundColor: P.primary }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillBtnText, { color: activeCategory === cat ? '#fff' : P.inkSoft }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

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
          <View style={styles.eventGrid}>
            {events.map(e => (
              <EventCard
                key={e.id}
                event={e}
                P={P}
                rsvp={!!rsvps[e.id]}
                onToggle={() => setRsvps(r => ({ ...r, [e.id]: !r[e.id] }))}
              />
            ))}
          </View>
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

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  filterStack: { gap: 8, marginTop: 14 },
  pill: { flexDirection: 'row', borderRadius: 999, borderWidth: 0.5, padding: 3 },
  countryPillMobile: { width: '100%' },
  countryPillDesktop: { alignSelf: 'flex-start' },
  pillBtn: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999 },
  countryBtnMobile: { flex: 1, alignItems: 'center' },
  pillBtnText: { fontSize: 13, fontWeight: '600' },
  catScroll: { gap: 0 },
  categoryPill: { borderRadius: 999, borderWidth: 0.5, padding: 3, overflow: 'hidden' },
  categoryScroll: { width: '100%' },
  categoryScrollInline: { flexGrow: 0, flexShrink: 1, maxWidth: '100%' },
  list: { paddingHorizontal: 20, paddingBottom: 110 },

  skeletonCard: {
    borderRadius: 16, borderWidth: 0.5, marginBottom: 16, overflow: 'hidden',
    minHeight: 220,
  },

  eventGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  eventTile: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 360,
    minWidth: 300,
  },
  eventCard: { minHeight: 280 },
  eventTagRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  catTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  catTagText: { fontSize: 12, fontWeight: '600' },
  eventBody: { padding: 18, minHeight: 280 },
  eventTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4, letterSpacing: -0.2 },
  eventVibe: { fontSize: 13, marginBottom: 10, lineHeight: 19 },
  eventMetaBlock: { gap: 4, marginBottom: 14, flex: 1 },
  eventMeta: { fontSize: 13, fontWeight: '500' },
  rsvpBtn: { paddingVertical: 13, borderRadius: 999, alignItems: 'center' },
  rsvpBtnTextActive: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rsvpBtnGhost: { paddingVertical: 13, borderRadius: 999, alignItems: 'center', borderWidth: 1.5 },
  rsvpBtnText: { fontSize: 15, fontWeight: '600' },
  emptyText: { textAlign: 'center', fontSize: 15, marginTop: 40, paddingHorizontal: 24, lineHeight: 22 },
});
