import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, apiFetch } from '../services/backendClient';
import { colors } from '../theme/colors';

const SECTIONS = [
  {
    title: 'Auth & Profile',
    checks: [
      {
        id: 'health',
        title: 'Backend health',
        desc: 'GET / — FastAPI reachable?',
        run: () => apiFetch('/'),
        summarize: (d) => d.message || 'API running',
      },
      {
        id: 'auth',
        title: 'Auth token',
        desc: 'GET /auth/me — Firebase token accepted?',
        run: () => apiFetch('/auth/me'),
        summarize: (d) => `uid: ${d.uid}`,
      },
      {
        id: 'profile',
        title: 'My profile',
        desc: 'GET /users/me — Firestore profile exists?',
        run: () => apiFetch('/users/me'),
        summarize: (d) => `${d.nickname || d.uid} · score: ${d.stability_score ?? '–'}`,
      },
    ],
  },
  {
    title: 'Events',
    checks: [
      {
        id: 'events',
        title: 'List events',
        desc: 'GET /events?min_social_score=3',
        run: () => apiFetch('/events?min_social_score=3'),
        summarize: (d) => {
          const list = Array.isArray(d) ? d : [];
          return `${list.length} events · first: ${list[0]?.title || '–'}`;
        },
      },
      {
        id: 'refresh',
        title: 'Refresh events',
        desc: 'POST /events/refresh — fetches live & saves to Firestore',
        run: () => apiFetch('/events/refresh', { method: 'POST' }),
        summarize: (d) =>
          [
            `${d.stored || 0} stored`,
            `Firebase: ${d.firebase_enabled ? 'on' : 'off'}`,
            d.firebase_saved != null ? `saved: ${d.firebase_saved}` : null,
            d.firebase_error ? `err: ${d.firebase_error}` : null,
          ].filter(Boolean).join(' · '),
      },
    ],
  },
  {
    title: 'AI Chat',
    checks: [
      {
        id: 'chat_ai',
        title: 'Send AI message',
        desc: 'POST /chat/ai — Gemini reply + Firestore save',
        run: () =>
          apiFetch('/chat/ai', {
            method: 'POST',
            body: JSON.stringify({
              user_id: 1,
              message: 'Hi! I feel a bit lonely today.',
              conversation_history: [],
              user_profile: { interests: ['music', 'books'] },
            }),
          }),
        summarize: (d) => {
          const reply = d.ai_response?.reply || d.ai_response?.message || JSON.stringify(d.ai_response).slice(0, 80);
          return `message_id: ${d.message_id || '–'} · reply: ${reply}`;
        },
      },
      {
        id: 'chat_crisis',
        title: 'Crisis detection',
        desc: 'POST /chat/ai — sends crisis phrase, expects fallback',
        run: () =>
          apiFetch('/chat/ai', {
            method: 'POST',
            body: JSON.stringify({
              user_id: 1,
              message: 'I want to kill myself.',
              conversation_history: [],
              user_profile: {},
            }),
          }),
        summarize: (d) => {
          const reply = d.ai_response?.reply || d.ai_response?.message || JSON.stringify(d.ai_response).slice(0, 80);
          return `Crisis fallback received · ${reply}`;
        },
      },
    ],
  },
  {
    title: 'Missions',
    checks: [
      {
        id: 'missions_today',
        title: "Today's mission",
        desc: 'GET /missions/today — requires stability_score ≥ 36',
        run: () => apiFetch('/missions/today'),
        summarize: (d) =>
          d.mission
            ? `${d.mission.title} · ${d.mission.difficulty} · ${d.mission.is_ai_generated ? 'AI' : 'standard'}`
            : 'No pending mission',
      },
      {
        id: 'missions_list',
        title: 'List all missions',
        desc: 'GET /missions — all missions for current user',
        run: () => apiFetch('/missions'),
        summarize: (d) => {
          const list = Array.isArray(d) ? d : [];
          const pending = list.filter((m) => m.status === 'pending').length;
          const done = list.filter((m) => m.status === 'completed').length;
          return `${list.length} total · ${pending} pending · ${done} done`;
        },
      },
      {
        id: 'missions_create',
        title: 'Create standard mission',
        desc: 'POST /missions — creates a text-verified mission',
        run: () =>
          apiFetch('/missions', {
            method: 'POST',
            body: JSON.stringify({
              title: 'Say hi to a stranger',
              description: 'Strike up a simple conversation with someone new.',
              difficulty: 'easy',
              verification_type: 'text',
              is_ai_generated: false,
              stability_delta: 5,
            }),
          }),
        summarize: (d) => `Created: ${d.id} · ${d.title}`,
      },
      {
        id: 'missions_records',
        title: 'My mission records',
        desc: 'GET /missions/records/me — completed missions',
        run: () => apiFetch('/missions/records/me'),
        summarize: (d) => {
          const list = Array.isArray(d) ? d : [];
          return `${list.length} completed · last: ${list.at(-1)?.mission_title || '–'}`;
        },
      },
    ],
  },
  {
    title: 'Matching',
    checks: [
      {
        id: 'match_recommend',
        title: 'User recommendations',
        desc: 'POST /matching/recommendations — AI friend matching',
        run: () =>
          apiFetch('/matching/recommendations', {
            method: 'POST',
            body: JSON.stringify({
              user_id: 1,
              user_profile: {
                interests: ['music', 'books', 'gaming'],
                social_style: 'introvert',
                language: 'en',
              },
              candidates: [
                { anonymous_id: 'anon_001', interests: ['music', 'art'], social_style: 'introvert', language: 'en' },
                { anonymous_id: 'anon_002', interests: ['sports', 'food'], social_style: 'extrovert', language: 'ko' },
                { anonymous_id: 'anon_003', interests: ['books', 'gaming'], social_style: 'introvert', language: 'en' },
              ],
            }),
          }),
        summarize: (d) => {
          const recs = d.recommendations || [];
          return `${recs.length} matches · top: ${recs[0]?.anonymous_id || '–'}`;
        },
      },
      {
        id: 'match_moderation',
        title: 'Message moderation',
        desc: 'POST /matching/rooms/test-room/messages — safe message',
        run: () =>
          apiFetch('/matching/rooms/test-room/messages', {
            method: 'POST',
            body: JSON.stringify({
              user_id: 1,
              message: 'Hey! Would you like to grab coffee sometime?',
            }),
          }),
        summarize: (d) =>
          d.blocked
            ? `Blocked · reason: ${d.moderation?.reason || '–'}`
            : `Allowed · message_id: ${d.message_id || '–'}`,
      },
    ],
  },
];

const DebugScreen = () => {
  const { user, profile, profileNotice } = useAuth();
  const [runningId, setRunningId] = useState(null);
  const [results, setResults] = useState({});

  const runCheck = async (check) => {
    setRunningId(check.id);
    try {
      const data = await check.run();
      setResults((prev) => ({
        ...prev,
        [check.id]: { ok: true, text: check.summarize(data) },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [check.id]: { ok: false, text: err?.message || 'Request failed' },
      }));
    } finally {
      setRunningId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Feature Check</Text>
      <Text style={styles.pageSubtitle}>Tap Run on each check to test every backend feature.</Text>

      {/* Session info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current session</Text>
        {[
          ['Firebase UID', user?.uid || '–'],
          ['Email', user?.email || '–'],
          ['Nickname', profile?.nickname || '–'],
          ['Stability score', profile?.stability_score ?? '–'],
          ['Backend URL', API_BASE_URL],
          ['Profile sync', profileNotice || 'OK'],
        ].map(([label, value]) => (
          <View key={label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{String(value)}</Text>
          </View>
        ))}
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title}>
          <Text style={styles.sectionHeader}>{section.title}</Text>
          {section.checks.map((check) => {
            const result = results[check.id];
            const running = runningId === check.id;
            return (
              <View key={check.id} style={styles.card}>
                <View style={styles.checkRow}>
                  <View style={styles.checkMeta}>
                    <Text style={styles.checkTitle}>{check.title}</Text>
                    <Text style={styles.checkDesc}>{check.desc}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.runBtn, Boolean(runningId) && styles.runBtnDisabled]}
                    onPress={() => runCheck(check)}
                    disabled={Boolean(runningId)}
                  >
                    {running
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.runBtnText}>Run</Text>}
                  </TouchableOpacity>
                </View>
                {result && (
                  <View style={[styles.result, result.ok ? styles.resultOk : styles.resultErr]}>
                    <Text style={[styles.resultBadge, result.ok ? styles.badgeOk : styles.badgeErr]}>
                      {result.ok ? 'OK' : 'Error'}
                    </Text>
                    <Text style={styles.resultText}>{result.text}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: colors.textLight, marginBottom: 20, lineHeight: 19 },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },

  infoRow: { borderTopWidth: 1, borderTopColor: '#ececec', paddingTop: 8, marginTop: 8 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 13, color: colors.text },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkMeta: { flex: 1 },
  checkTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  checkDesc: { fontSize: 12, color: colors.textLight, marginTop: 2, lineHeight: 17 },

  runBtn: {
    minWidth: 64,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  runBtnDisabled: { opacity: 0.6 },
  runBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  result: { borderRadius: 8, padding: 10, marginTop: 12 },
  resultOk: { backgroundColor: '#EAF7EF' },
  resultErr: { backgroundColor: '#FDECE9' },
  resultBadge: { fontSize: 11, fontWeight: '800', marginBottom: 3 },
  badgeOk: { color: '#1B7F45' },
  badgeErr: { color: '#B3261E' },
  resultText: { fontSize: 12, color: colors.text, lineHeight: 18 },
});

export default DebugScreen;
