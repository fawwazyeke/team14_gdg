import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoTheme } from '../context/DoThemeContext';
import { Card } from '../components/DoAtoms';
import { getDailyMissions, completeMission } from '../services/missionsService';

const CAT_EMOJI = { social: '✉️', physical: '☀️', explore: '🍵' };
const CAT_LABELS = { social: 'Social', physical: 'Body', explore: 'Explore' };
const CAT_TINT = {
  social: '#E3ECE3',
  physical: null,
  explore: '#F0E5DD',
};

function MissionCard({ mission, done, P, onComplete }) {
  const emoji = CAT_EMOJI[mission.category] || '🌱';
  const catLabel = CAT_LABELS[mission.category] || 'Mission';
  const tint = CAT_TINT[mission.category] || P.wash;
  const accent = mission.category === 'social'
    ? P.accentDeep
    : mission.category === 'explore'
      ? P.primaryDeep
      : P.primaryDeep;

  if (done) {
    return (
      <View style={[styles.missionDone, { backgroundColor: P.surfaceQuiet, borderColor: P.line }]}>
        <View style={[styles.checkCircle, { backgroundColor: P.accent }]}>
          <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.doneCat, { color: P.inkMuted }]}>{catLabel} · done</Text>
          <Text style={[styles.doneTitle, { color: P.inkSoft }]}>{mission.title}</Text>
        </View>
      </View>
    );
  }

  return (
    <Card P={P} style={{ overflow: 'hidden' }}>
      {/* tinted band */}
      <LinearGradient
        colors={[tint, P.surface]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.cardBand}
      >
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
        <Text style={[styles.catLabel, { color: accent }]}>{catLabel.toUpperCase()}</Text>
      </LinearGradient>
      <View style={styles.cardBody}>
        <Text style={[styles.missionTitle, { color: P.ink }]}>{mission.title}</Text>
        <Text style={[styles.missionDesc, { color: P.inkSoft }]}>{mission.description}</Text>
        <TouchableOpacity onPress={() => onComplete(mission)} activeOpacity={0.85}>
          <LinearGradient
            colors={[P.grad[0], P.grad[1]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.didItBtn}
          >
            <Text style={styles.didItText}>I did it</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function DoMissionsScreen() {
  const { P } = useDoTheme();
  const insets = useSafeAreaInsets();
  const [missions, setMissions] = useState([]);
  const [completed, setCompleted] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(null);
  const [verifyText, setVerifyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getDailyMissions()
      .then(setMissions)
      .catch(err => {
        const msg = err?.message || '';
        setError(msg.includes('403') || msg.includes('locked')
          ? 'Missions unlock at stability score 36. Complete the survey first.'
          : 'Could not load missions. Make sure the backend is running.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleComplete = (mission) => {
    if (mission.verificationType === 'text') {
      setVerifyText('');
      setVerifying(mission);
    } else {
      submitDone(mission, {});
    }
  };

  const submitDone = async (mission, payload) => {
    setSubmitting(true);
    try {
      const result = await completeMission(mission.id, payload);
      setCompleted(prev => ({ ...prev, [mission.id]: result.total_delta || mission.xp }));
      setVerifying(null);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not complete mission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={[styles.screenTitle, { color: P.ink }]}>Today's bridges</Text>
          <Text style={[styles.screenSub, { color: P.inkSoft }]}>Small steps towards connection.</Text>
        </View>

        {/* Verification box */}
        {verifying && (
          <View style={[styles.verifyBox, { backgroundColor: P.surface, borderColor: P.primary }]}>
            <Text style={[styles.verifyLabel, { color: P.ink }]}>How did it go? Describe what you did:</Text>
            <TextInput
              value={verifyText}
              onChangeText={setVerifyText}
              placeholder="Write a few words…"
              placeholderTextColor={P.inkMuted}
              multiline
              style={[styles.verifyInput, { color: P.ink, borderColor: P.line }]}
            />
            <View style={styles.verifyActions}>
              <TouchableOpacity
                onPress={() => setVerifying(null)}
                style={[styles.cancelBtn, { borderColor: P.line }]}
              >
                <Text style={{ color: P.inkSoft, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => submitDone(verifying, { text: verifyText.trim() })}
                disabled={!verifyText.trim() || submitting}
                activeOpacity={0.85}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={verifyText.trim() ? [P.grad[0], P.grad[1]] : [P.surfaceQuiet, P.surfaceQuiet]}
                  style={styles.submitBtn}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: verifyText.trim() ? '#fff' : P.inkMuted, fontWeight: '700' }}>Submit</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Mission list */}
        <View style={styles.missionList}>
          {loading ? (
            <ActivityIndicator size="large" color={P.primary} style={{ marginTop: 40 }} />
          ) : error ? (
            <Text style={[styles.emptyText, { color: P.inkSoft }]}>{error}</Text>
          ) : missions.length === 0 ? (
            <Text style={[styles.emptyText, { color: P.inkSoft }]}>No pending missions. Check back later!</Text>
          ) : (
            missions.map((m, i) => (
              <MissionCard
                key={m.id}
                mission={m}
                done={!!completed[m.id]}
                P={P}
                onComplete={handleComplete}
              />
            ))
          )}
        </View>

        <Text style={[styles.footnote, { color: P.inkMuted }]}>
          New bridges tomorrow morning · or whenever you're ready
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  screenTitle: { fontSize: 30, fontWeight: '600', letterSpacing: -0.5 },
  screenSub: { fontSize: 15, marginTop: 6, lineHeight: 22 },

  missionList: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  cardBand: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  catLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cardBody: { padding: 16, paddingTop: 0 },
  missionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6, letterSpacing: -0.2 },
  missionDesc: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  didItBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, alignSelf: 'flex-start' },
  didItText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  missionDone: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 22, borderWidth: 0.5, borderStyle: 'dashed', opacity: 0.85,
  },
  checkCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  doneCat: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  doneTitle: { fontSize: 15, textDecorationLine: 'line-through' },

  verifyBox: { margin: 16, borderRadius: 22, padding: 16, borderWidth: 1.5 },
  verifyLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  verifyInput: {
    borderWidth: 1.5, borderRadius: 10, padding: 12,
    fontSize: 14, minHeight: 72, textAlignVertical: 'top',
  },
  verifyActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1.5, alignItems: 'center' },
  submitBtn: { paddingVertical: 13, borderRadius: 999, alignItems: 'center' },

  emptyText: { textAlign: 'center', fontSize: 15, marginTop: 40, paddingHorizontal: 24, lineHeight: 22 },
  footnote: { textAlign: 'center', fontSize: 13, margin: 16, lineHeight: 20 },
});
