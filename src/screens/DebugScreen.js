import React, { useMemo, useState } from 'react';
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

const CHECKS = [
  {
    id: 'health',
    title: 'Backend health',
    description: 'Checks that FastAPI is reachable.',
    run: () => apiFetch('/'),
  },
  {
    id: 'auth',
    title: 'Auth token',
    description: 'Verifies the current Firebase ID token with FastAPI.',
    run: () => apiFetch('/auth/me'),
  },
  {
    id: 'events',
    title: 'Read events',
    description: 'Loads social events from the backend cache.',
    run: () => apiFetch('/events?min_social_score=3'),
  },
  {
    id: 'refresh',
    title: 'Refresh events',
    description: 'Fetches live events and saves them to Firestore when backend credentials exist.',
    run: () => apiFetch('/events/refresh', { method: 'POST' }),
  },
];

const DebugScreen = () => {
  const { user, profile, profileNotice } = useAuth();
  const [runningId, setRunningId] = useState(null);
  const [results, setResults] = useState({});

  const accountRows = useMemo(
    () => [
      ['Firebase user', user?.uid || 'Missing'],
      ['Email', user?.email || 'No email'],
      ['Nickname', profile?.nickname || 'Missing'],
      ['Backend URL', API_BASE_URL],
      ['Profile sync', profileNotice || 'No warning'],
    ],
    [profile, profileNotice, user]
  );

  const runCheck = async (check) => {
    setRunningId(check.id);
    try {
      const data = await check.run();
      setResults((current) => ({
        ...current,
        [check.id]: {
          ok: true,
          data: summarizeResult(check.id, data),
        },
      }));
    } catch (error) {
      setResults((current) => ({
        ...current,
        [check.id]: {
          ok: false,
          data: error?.message || 'Request failed',
        },
      }));
    } finally {
      setRunningId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Feature Check</Text>
      <Text style={styles.subtitle}>Use this screen during demos to confirm login, backend, events, and Firebase saving.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current session</Text>
        {accountRows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>

      {CHECKS.map((check) => {
        const result = results[check.id];
        const running = runningId === check.id;

        return (
          <View key={check.id} style={styles.card}>
            <View style={styles.checkHeader}>
              <View style={styles.checkText}>
                <Text style={styles.cardTitle}>{check.title}</Text>
                <Text style={styles.description}>{check.description}</Text>
              </View>
              <TouchableOpacity
                style={[styles.button, running && styles.buttonDisabled]}
                onPress={() => runCheck(check)}
                disabled={Boolean(runningId)}
              >
                {running ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Run</Text>}
              </TouchableOpacity>
            </View>

            {result ? (
              <View style={[styles.result, result.ok ? styles.resultOk : styles.resultBad]}>
                <Text style={[styles.resultLabel, result.ok ? styles.resultLabelOk : styles.resultLabelBad]}>
                  {result.ok ? 'OK' : 'Error'}
                </Text>
                <Text style={styles.resultText}>{result.data}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
};

function summarizeResult(id, data) {
  if (id === 'health') {
    return `${data.message || 'API is running'}${data.db ? ` · ${data.db}` : ''}`;
  }

  if (id === 'auth') {
    return `Verified uid: ${data.uid}`;
  }

  if (id === 'events') {
    const events = Array.isArray(data) ? data : [];
    const firstTitle = events[0]?.title ? ` · First: ${events[0].title}` : '';
    return `${events.length} events loaded${firstTitle}`;
  }

  if (id === 'refresh') {
    return [
      `${data.stored || 0} events stored in backend cache`,
      `Firebase: ${data.firebase_enabled ? 'enabled' : 'disabled'}`,
      `Saved: ${data.firebase_saved || 0}`,
      data.firebase_error ? `Error: ${data.firebase_error}` : null,
    ].filter(Boolean).join(' · ');
  }

  return JSON.stringify(data);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textLight,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: '#ececec',
    paddingTop: 10,
    marginTop: 10,
  },
  label: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkText: {
    flex: 1,
  },
  description: {
    color: colors.textLight,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  button: {
    minWidth: 72,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },
  result: {
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  resultOk: {
    backgroundColor: '#EAF7EF',
  },
  resultBad: {
    backgroundColor: '#FDECE9',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultLabelOk: {
    color: '#1B7F45',
  },
  resultLabelBad: {
    color: '#B3261E',
  },
  resultText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default DebugScreen;
