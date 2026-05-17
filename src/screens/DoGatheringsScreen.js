import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, RefreshControl, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDoTheme } from '../context/DoThemeContext';
import { Card } from '../components/DoAtoms';
import { apiFetch } from '../services/backendClient';
import {
  getEvents, EVENT_CATEGORIES,
  joinEvent, unjoinEvent, getMyEvents, eventHasPassed,
} from '../services/eventsService';

const GATHERING_THRESHOLD = 100;


const CITIES = [
  { id: 'seoul', label: 'Seoul', flag: '🇰🇷' },
  { id: 'tokyo', label: 'Tokyo', flag: '🇯🇵' },
];

const TABS = ['Discover', 'My Events'];

// Module-level cache
const _cache = {};

// ─── Skeleton ────────────────────────────────────────────────────
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
  return (
    <View style={[styles.skeletonCard, { backgroundColor: P.surface, borderColor: P.line }]}>
      <View style={{ padding: 18, gap: 10 }}>
        <SkeletonPulse style={{ height: 18, width: '70%', borderRadius: 6, backgroundColor: P.line }} />
        <SkeletonPulse style={{ height: 13, width: '90%', borderRadius: 6, backgroundColor: P.line }} />
        <SkeletonPulse style={{ height: 13, width: '55%', borderRadius: 6, backgroundColor: P.line }} />
        <SkeletonPulse style={{ height: 44, borderRadius: 999, backgroundColor: P.line, marginTop: 4 }} />
      </View>
    </View>
  );
}

// ─── Event card ──────────────────────────────────────────────────
function EventCard({ event, P, joined, joining, onToggle }) {
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
          <TouchableOpacity onPress={onToggle} activeOpacity={0.85} disabled={joining}>
            {joined ? (
              <LinearGradient colors={[P.grad[0], P.grad[1]]} style={styles.rsvpBtn}>
                <Text style={styles.rsvpBtnTextActive}>✓ You're going</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.rsvpBtnGhost, { borderColor: P.line }]}>
                <Text style={[styles.rsvpBtnText, { color: joining ? P.inkMuted : P.ink }]}>
                  {joining ? 'Saving…' : "I'm interested"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
}

// ─── Participated event row ───────────────────────────────────────
function ParticipatedRow({ item, P, onReflect }) {
  const passed = eventHasPassed(item.event_start_at);
  const done = item.feedback_completed;

  return (
    <View style={[styles.participatedRow, { backgroundColor: P.surface, borderColor: P.line }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.participatedTitle, { color: P.ink }]} numberOfLines={2}>
          {item.event_title}
        </Text>
        <Text style={[styles.participatedCity, { color: P.inkMuted }]}>
          {item.event_city === 'seoul' ? '🇰🇷 Seoul' : item.event_city === 'tokyo' ? '🇯🇵 Tokyo' : '📍'}
          {'  '}
          {done
            ? `Reflected · +${item.feedback_delta ?? '?'} pts`
            : passed
              ? 'Event passed — reflect now'
              : 'Upcoming'}
        </Text>
      </View>
      {passed && !done && (
        <TouchableOpacity onPress={onReflect} activeOpacity={0.85}>
          <LinearGradient colors={[P.grad[0], P.grad[1]]} style={styles.reflectBtn}>
            <Text style={styles.reflectBtnText}>Reflect</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      {done && (
        <View style={[styles.doneTag, { backgroundColor: P.wash }]}>
          <Text style={[styles.doneTagText, { color: P.primary }]}>Done ✓</Text>
        </View>
      )}
    </View>
  );
}

// ─── Locked state ────────────────────────────────────────────────
function LockedScreen({ score, P, insets }) {
  const needed = GATHERING_THRESHOLD - Math.floor(score ?? 0);
  return (
    <View style={[styles.root, { backgroundColor: P.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: insets.top }]}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
      <Text style={[styles.screenTitle, { color: P.ink, textAlign: 'center', marginBottom: 8 }]}>Not yet</Text>
      <Text style={[styles.emptyText, { color: P.inkSoft, marginTop: 0 }]}>
        Gatherings unlock at {GATHERING_THRESHOLD} points.{'\n'}
        You need {needed} more point{needed !== 1 ? 's' : ''}.{'\n\n'}
        Keep chatting with Do and completing missions.
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────
export default function DoGatheringsScreen() {
  const { P } = useDoTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const stackFilters = width < 600;
  const navigation = useNavigation();

  const [canAccess, setCanAccess] = useState(null);
  const [userScore, setUserScore] = useState(0);

  useFocusEffect(useCallback(() => {
    apiFetch('/users/me/status')
      .then(data => {
        setCanAccess(data.can_access_gatherings);
        setUserScore(data.stability_score ?? 0);
      })
      .catch(() => setCanAccess(false));
  }, []));

  const [activeTab, setActiveTab] = useState('Discover');
  const [city, setCity] = useState('seoul');
  const [activeCategory, setActiveCategory] = useState('All');
  const [events, setEvents] = useState(_cache[`${city}-${activeCategory}`] || []);
  const [loading, setLoading] = useState(!_cache[`${city}-${activeCategory}`]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // joined: { [eventId]: true|false } — persisted to backend
  const [joined, setJoined] = useState({});
  const [joining, setJoining] = useState({});

  // My Events tab
  const [myEvents, setMyEvents] = useState([]);
  const [myEventsLoading, setMyEventsLoading] = useState(false);

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
      if (!_cache[cacheKey]) setError('Could not load gatherings. Check the backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city, activeCategory, cacheKey]);

  useEffect(() => {
    if (_cache[cacheKey]) {
      setEvents(_cache[cacheKey]);
      setLoading(false);
      load(true);
    } else {
      load(false);
    }
  }, [cacheKey]); // eslint-disable-line

  const loadMyEvents = useCallback(async () => {
    setMyEventsLoading(true);
    try {
      const data = await getMyEvents();
      setMyEvents(Array.isArray(data) ? data : []);
      // Sync joined state from server
      const joinedMap = {};
      (Array.isArray(data) ? data : []).forEach(p => { joinedMap[p.event_id] = true; });
      setJoined(prev => ({ ...prev, ...joinedMap }));
    } catch {
      // silently ignore
    } finally {
      setMyEventsLoading(false);
    }
  }, []);

  // Reload My Events when tab is focused
  useFocusEffect(useCallback(() => {
    loadMyEvents();
  }, [loadMyEvents]));

  const handleToggleJoin = async (event) => {
    const id = event.id;
    const isJoined = !!joined[id];
    setJoining(j => ({ ...j, [id]: true }));

    try {
      if (isJoined) {
        await unjoinEvent(id);
        setJoined(j => ({ ...j, [id]: false }));
        setMyEvents(prev => prev.filter(p => p.event_id !== id));
      } else {
        const participation = await joinEvent(event);
        setJoined(j => ({ ...j, [id]: true }));
        setMyEvents(prev => [participation, ...prev.filter(p => p.event_id !== id)]);
      }
    } catch (e) {
      // silently ignore toggle errors
    } finally {
      setJoining(j => ({ ...j, [id]: false }));
    }
  };

  const handleReflect = (participation) => {
    navigation.navigate('EventFeedback', { participation });
  };

  if (canAccess === false) {
    return <LockedScreen score={userScore} P={P} insets={insets} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: P.bg }]}>
        <Text style={[styles.screenTitle, { color: P.ink }]}>Gatherings</Text>

        {/* Tab toggle */}
        <View style={[styles.tabPill, { backgroundColor: P.surface, borderColor: P.line }]}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabBtn, activeTab === tab && { backgroundColor: P.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === tab ? '#fff' : P.inkSoft }]}>
                {tab}
                {tab === 'My Events' && myEvents.length > 0
                  ? ` (${myEvents.length})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Discover filters */}
        {activeTab === 'Discover' && (
          <View style={stackFilters ? styles.filterStack : styles.filterRow}>
            <View style={[
              styles.pill,
              stackFilters ? styles.countryPillMobile : styles.countryPillDesktop,
              { backgroundColor: P.surface, borderColor: P.line },
            ]}>
              {CITIES.map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCity(c.id)}
                  style={[styles.pillBtn, stackFilters && styles.countryBtnMobile, city === c.id && { backgroundColor: P.primary }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillBtnText, { color: city === c.id ? '#fff' : P.inkSoft }]}>
                    {c.flag} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[
              styles.categoryPill,
              stackFilters ? styles.categoryScroll : styles.categoryScrollInline,
              { backgroundColor: P.surface, borderColor: P.line },
            ]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                {EVENT_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={[styles.pillBtn, activeCategory === cat && { backgroundColor: P.primary }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillBtnText, { color: activeCategory === cat ? '#fff' : P.inkSoft }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {/* ── Discover tab ── */}
      {activeTab === 'Discover' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={P.primary} />}
        >
          {loading ? (
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
                  joined={!!joined[e.id]}
                  joining={!!joining[e.id]}
                  onToggle={() => handleToggleJoin(e)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── My Events tab ── */}
      {activeTab === 'My Events' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.myEventsList}
          refreshControl={<RefreshControl refreshing={myEventsLoading} onRefresh={loadMyEvents} tintColor={P.primary} />}
        >
          {myEventsLoading && myEvents.length === 0 ? (
            <ActivityIndicator color={P.primary} style={{ marginTop: 40 }} />
          ) : myEvents.length === 0 ? (
            <Text style={[styles.emptyText, { color: P.inkSoft }]}>
              Tap "I'm interested" on any event and it will appear here after it passes.
            </Text>
          ) : (
            myEvents.map(item => (
              <ParticipatedRow
                key={item.event_id}
                item={item}
                P={P}
                onReflect={() => handleReflect(item)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// pull in ActivityIndicator
import { ActivityIndicator } from 'react-native';

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  screenTitle: { fontSize: 30, fontWeight: '600', letterSpacing: -0.5, marginBottom: 10 },

  tabPill: {
    flexDirection: 'row', borderRadius: 999, borderWidth: 0.5,
    padding: 3, marginBottom: 12, alignSelf: 'flex-start',
  },
  tabBtn: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 999 },
  tabBtnText: { fontSize: 13, fontWeight: '600' },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterStack: { gap: 8 },
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
  eventGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  eventTile: { flexGrow: 1, flexShrink: 1, flexBasis: 360, minWidth: 300 },
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

  skeletonCard: { borderRadius: 16, borderWidth: 0.5, marginBottom: 16, overflow: 'hidden', minHeight: 220 },

  myEventsList: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110, gap: 10 },
  participatedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 0.5,
    padding: 16,
  },
  participatedTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  participatedCity: { fontSize: 12, marginTop: 2 },
  reflectBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999 },
  reflectBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  doneTag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  doneTagText: { fontSize: 12, fontWeight: '600' },

  emptyText: { textAlign: 'center', fontSize: 15, marginTop: 40, paddingHorizontal: 24, lineHeight: 22 },
});
