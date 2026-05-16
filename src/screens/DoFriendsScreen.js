import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDoTheme } from '../context/DoThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/DoAtoms';
import {
  getSuggestedFriends, getFriends, getPendingRequests,
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
} from '../services/friendsService';
import DoFriendChatScreen from './DoFriendChatScreen';

function AvatarGradient({ label, P, size = 44 }) {
  return (
    <LinearGradient
      colors={[P.grad[0], P.grad[1]]}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '600' }}>
        {label.charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );
}

function SuggestedCard({ item, P, onAdd, adding }) {
  return (
    <Card P={P} style={styles.suggestedCard}>
      <AvatarGradient label={item.alias} P={P} size={52} />
      <Text style={[styles.suggestedAlias, { color: P.ink }]}>{item.alias}</Text>
      <Text style={[styles.suggestedMeta, { color: P.inkSoft }]}>
        {item.shared_interests > 0
          ? `${item.shared_interests} shared interest${item.shared_interests > 1 ? 's' : ''}`
          : 'Similar mindset'}
      </Text>
      <TouchableOpacity onPress={onAdd} disabled={adding} activeOpacity={0.85} style={{ marginTop: 12, width: '100%' }}>
        <LinearGradient
          colors={adding ? [P.line, P.line] : [P.grad[0], P.grad[1]]}
          style={styles.addBtn}
        >
          {adding
            ? <ActivityIndicator size="small" color={P.inkMuted} />
            : <Text style={styles.addBtnText}>Say hello</Text>
          }
        </LinearGradient>
      </TouchableOpacity>
    </Card>
  );
}

function PendingCard({ item, P, onAccept, onReject, busy }) {
  return (
    <View style={[styles.pendingRow, { borderBottomColor: P.line }]}>
      <AvatarGradient label={item.alias} P={P} size={42} />
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
        <AvatarGradient label={item.alias} P={P} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.friendAlias, { color: P.ink }]}>{item.alias}</Text>
          <Text style={[styles.friendMeta, { color: P.inkSoft }]}>A fellow traveler · Tap to chat</Text>
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

  const [suggested, setSuggested] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState({});
  const [busy, setBusy] = useState({});
  const [chatFriend, setChatFriend] = useState(null);
  const [sentUids, setSentUids] = useState(new Set());

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [s, f, p] = await Promise.all([
        getSuggestedFriends(),
        getFriends(),
        getPendingRequests(),
      ]);
      setSuggested(Array.isArray(s) ? s : []);
      setFriends(Array.isArray(f) ? f : []);
      setPending(Array.isArray(p) ? p : []);
    } catch (e) {
      console.warn('Friends load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async (uid) => {
    setAdding(a => ({ ...a, [uid]: true }));
    try {
      await sendFriendRequest(uid);
      setSentUids(s => new Set([...s, uid]));
    } catch (e) {
      // already sent or error — silently mark as sent
      setSentUids(s => new Set([...s, uid]));
    } finally {
      setAdding(a => ({ ...a, [uid]: false }));
    }
  };

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

  // Show chat screen inline (no stack navigator needed)
  if (chatFriend) {
    return <DoFriendChatScreen friend={chatFriend} onBack={() => setChatFriend(null)} />;
  }

  const isUnderage = profile?.age !== undefined && profile.age < 18;

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: P.ink }]}>People</Text>
        <Text style={[styles.sub, { color: P.inkSoft }]}>Anonymous connections. No real names, ever.</Text>
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
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: P.ink }]}>Suggested for you</Text>
            {suggested.length === 0 ? (
              <Text style={[styles.empty, { color: P.inkSoft }]}>
                No suggestions yet — keep building your score and they'll appear.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedRow}>
                {suggested.map(item => (
                  <SuggestedCard
                    key={item.uid}
                    item={item}
                    P={P}
                    adding={!!adding[item.uid]}
                    onAdd={sentUids.has(item.uid) ? undefined : () => handleAdd(item.uid)}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Friends */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: P.ink }]}>Your people</Text>
            {friends.length === 0 ? (
              <Text style={[styles.empty, { color: P.inkSoft }]}>
                Say hello to someone above — this is where they'll appear.
              </Text>
            ) : (
              <Card P={P} style={{ overflow: 'hidden' }}>
                {friends.map(item => (
                  <FriendRow
                    key={item.pair_key}
                    item={item}
                    P={P}
                    onChat={() => setChatFriend(item)}
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
  sub: { fontSize: 15, marginTop: 6, lineHeight: 22 },

  gateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  gateText: { textAlign: 'center', fontSize: 15, lineHeight: 23 },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, letterSpacing: -0.2 },
  empty: { fontSize: 14, lineHeight: 21 },

  suggestedRow: { gap: 12, paddingRight: 4 },
  suggestedCard: { width: 160, padding: 16, alignItems: 'center' },
  suggestedAlias: { fontSize: 14, fontWeight: '600', marginTop: 10, textAlign: 'center', letterSpacing: -0.2 },
  suggestedMeta: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  addBtn: { borderRadius: 999, paddingVertical: 9, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

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
});
