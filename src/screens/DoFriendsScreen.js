import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDoTheme } from '../context/DoThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card, RelateAvatar } from '../components/DoAtoms';
import { apiFetch } from '../services/backendClient';
import {
  getFriends, getPendingRequests,
  acceptFriendRequest, rejectFriendRequest,
  getSuggestedFriends, sendFriendRequest,
} from '../services/friendsService';

const RELATE_THRESHOLD = 60;

const ALIAS_COLOR_MAP = {
  Red:     '#EF4444',
  Pink:    '#EC4899',
  Orange:  '#F97316',
  Amber:   '#F59E0B',
  Yellow:  '#EAB308',
  Lime:    '#84CC16',
  Green:   '#22C55E',
  Teal:    '#14B8A6',
  Cyan:    '#06B6D4',
  Blue:    '#3B82F6',
  Indigo:  '#6366F1',
  Violet:  '#8B5CF6',
  Purple:  '#A855F7',
  Rose:    '#F43F5E',
  Coral:   '#FF6B6B',
  Gold:    '#D97706',
  Sage:    '#6B8F6B',
  Slate:   '#64748B',
  Crimson: '#DC2626',
  Cobalt:  '#1D4ED8',
};

function tintFor(item) {
  const alias = item?.alias || '';
  const colorWord = alias.split(' ')[0];
  return ALIAS_COLOR_MAP[colorWord] || '#6366F1';
}

function AnonymousGlyph({ item, P, size = 44, kind = 'notes' }) {
  return <RelateAvatar size={size} P={P} kind={kind} tint={tintFor(item)} />;
}

function LockedScreen({ score, P, insets }) {
  const needed = RELATE_THRESHOLD - Math.floor(score ?? 0);
  return (
    <View style={[styles.root, { backgroundColor: P.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: insets.top }]}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
      <Text style={[styles.title, { color: P.ink, textAlign: 'center', marginBottom: 8 }]}>Not yet</Text>
      <Text style={[styles.empty, { color: P.inkSoft, textAlign: 'center', lineHeight: 22 }]}>
        Relate unlocks at {RELATE_THRESHOLD} points.{'\n'}
        You need {needed} more point{needed !== 1 ? 's' : ''}.{'\n\n'}
        Keep chatting with Do and completing missions.
      </Text>
    </View>
  );
}

function SuggestedCard({ item, P, onConnect, busy, sent }) {
  return (
    <View style={[styles.pendingRow, { borderBottomColor: P.line }]}>
      <AnonymousGlyph item={item} P={P} size={44} kind="notes" />
      <View style={{ flex: 1 }}>
        <Text style={[styles.pendingAlias, { color: P.ink }]}>{item.alias}</Text>
        <Text style={[styles.pendingMeta, { color: P.inkSoft }]}>
          {sent ? 'Request sent' : item.shared_interests > 0 ? `${item.shared_interests} shared interest${item.shared_interests > 1 ? 's' : ''}` : 'On a similar journey'}
        </Text>
      </View>
      {sent ? (
        <View style={[styles.rejectBtn, { borderColor: P.line }]}>
          <Text style={[styles.rejectText, { color: P.inkMuted }]}>Pending</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={onConnect} disabled={busy} activeOpacity={0.85}>
          <LinearGradient colors={[P.grad[0], P.grad[1]]} style={styles.acceptBtn}>
            <Text style={styles.acceptText}>{busy ? '…' : 'Connect'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PendingCard({ item, P, onAccept, onReject, busy }) {
  return (
    <View style={[styles.pendingRow, { borderBottomColor: P.line }]}>
      <AnonymousGlyph item={item} P={P} size={44} kind="notes" />
      <View style={{ flex: 1 }}>
        <Text style={[styles.pendingAlias, { color: P.ink }]}>{item.alias}</Text>
        <Text style={[styles.pendingMeta, { color: P.inkSoft }]}>wants to connect</Text>
      </View>
      <View style={styles.pendingBtns}>
        <TouchableOpacity
          onPress={onReject}
          disabled={busy}
          style={[styles.rejectBtn, { borderColor: P.line }]}
        >
          <Text style={[styles.rejectText, { color: P.inkSoft }]}>Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAccept} disabled={busy} activeOpacity={0.85}>
          <LinearGradient colors={[P.grad[0], P.grad[1]]} style={styles.acceptBtn}>
            <Text style={styles.acceptText}>Accept</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FriendRow({ item, P, onChat }) {
  return (
    <TouchableOpacity onPress={onChat} activeOpacity={0.8}>
      <View style={[styles.friendRow, { borderBottomColor: P.line }]}>
        <View style={{ position: 'relative' }}>
          <AnonymousGlyph item={item} P={P} size={48} kind="notes" />
          <View style={[styles.onlineDot, { backgroundColor: P.accent, borderColor: P.surface }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.friendAlias, { color: P.ink }]}>{item.alias}</Text>
          <Text style={[styles.friendMeta, { color: P.inkSoft }]} numberOfLines={1}>
            Quiet conversation · Tap to open
          </Text>
        </View>
        <Text style={[styles.chatArrow, { color: P.primary }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DoFriendsScreen() {
  const { P } = useDoTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [canAccess, setCanAccess] = useState(null);
  const [userScore, setUserScore] = useState(0);

  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState({});
  const [sentRequests, setSentRequests] = useState({});

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [f, p, s] = await Promise.all([
        getFriends(),
        getPendingRequests(),
        getSuggestedFriends(),
      ]);
      setFriends(Array.isArray(f) ? f : []);
      setPending(Array.isArray(p) ? p : []);
      setSuggested(Array.isArray(s) ? s : []);
    } catch (e) {
      console.warn('Friends load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    apiFetch('/users/me/status')
      .then(data => {
        setCanAccess(data.can_recommend_users);
        setUserScore(data.stability_score ?? 0);
        if (data.can_recommend_users) load();
      })
      .catch(() => { setCanAccess(false); setLoading(false); });
  }, [load]));

  const handleAccept = async (fromUid, pairKey) => {
    setBusy(b => ({ ...b, [pairKey]: true }));
    try {
      await acceptFriendRequest(fromUid);
      await load();
    } finally {
      setBusy(b => ({ ...b, [pairKey]: false }));
    }
  };

  const handleReject = async (fromUid, pairKey) => {
    setBusy(b => ({ ...b, [pairKey]: true }));
    try {
      await rejectFriendRequest(fromUid);
      setPending(p => p.filter(r => r.pair_key !== pairKey));
    } finally {
      setBusy(b => ({ ...b, [pairKey]: false }));
    }
  };

  const handleConnect = async (targetUid) => {
    setBusy(b => ({ ...b, [targetUid]: true }));
    try {
      await sendFriendRequest(targetUid);
      setSentRequests(s => ({ ...s, [targetUid]: true }));
    } catch (e) {
      console.warn('Connect error:', e.message);
    } finally {
      setBusy(b => ({ ...b, [targetUid]: false }));
    }
  };

  const isUnderage = profile?.age !== undefined && profile.age < 18;

  if (canAccess === false) {
    return <LockedScreen score={userScore} P={P} insets={insets} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: P.ink }]}>Relate</Text>
      </View>

      {isUnderage ? (
        <View style={styles.gateWrap}>
          <Text style={[styles.gateText, { color: P.inkSoft }]}>
            Connecting with others is available for users 18 and older.
          </Text>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={P.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={P.primary} />}
        >
          {/* Pending requests */}
          {pending.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: P.ink }]}>Waiting on you</Text>
              <Card P={P} style={{ overflow: 'hidden' }}>
                {pending.map((item, i) => (
                  <PendingCard
                    key={item.pair_key}
                    item={item}
                    P={P}
                    busy={!!busy[item.pair_key]}
                    onAccept={() => handleAccept(item.from_uid, item.pair_key)}
                    onReject={() => handleReject(item.from_uid, item.pair_key)}
                  />
                ))}
              </Card>
            </View>
          )}

          {/* Suggested */}
          {suggested.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: P.ink }]}>Suggested for you</Text>
              <Card P={P} style={{ overflow: 'hidden' }}>
                {suggested.map(item => (
                  <SuggestedCard
                    key={item.uid}
                    item={item}
                    P={P}
                    busy={!!busy[item.uid]}
                    sent={!!sentRequests[item.uid]}
                    onConnect={() => handleConnect(item.uid)}
                  />
                ))}
              </Card>
            </View>
          )}

          {/* Friends */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: P.ink }]}>Ongoing</Text>
              <Text style={[styles.threadCount, { color: P.inkMuted }]}>{friends.length} threads</Text>
            </View>
            {friends.length === 0 ? (
              <Text style={[styles.empty, { color: P.inkSoft }]}>
                Your gentle threads will live here.
              </Text>
            ) : (
              <Card P={P} style={{ overflow: 'hidden' }}>
                {friends.map(item => (
                  <FriendRow
                    key={item.pair_key}
                    item={item}
                    P={P}
                    onChat={() => navigation.navigate('FriendChat', { friend: item })}
                  />
                ))}
              </Card>
            )}
          </View>
        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 30, fontWeight: '600', letterSpacing: -0.5 },

  gateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  gateText: { textAlign: 'center', fontSize: 15, lineHeight: 23 },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, letterSpacing: -0.2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  threadCount: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { fontSize: 14, lineHeight: 21 },

  pendingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  pendingAlias: { fontSize: 15, fontWeight: '600' },
  pendingMeta: { fontSize: 12, marginTop: 2 },
  pendingBtns: { flexDirection: 'row', gap: 8 },
  rejectBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  rejectText: { fontSize: 13, fontWeight: '500' },
  acceptBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999 },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  friendAlias: { fontSize: 15, fontWeight: '600' },
  friendMeta: { fontSize: 12, marginTop: 2 },
  chatArrow: { fontSize: 18, fontWeight: '600' },
  onlineDot: {
    position: 'absolute', right: -1, bottom: 2,
    width: 11, height: 11, borderRadius: 6, borderWidth: 2,
  },

});
