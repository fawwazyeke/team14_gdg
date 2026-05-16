import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import DailyMissionCard from '../components/DailyMissionCard';
import { getDailyMissions, completeMission } from '../services/missionsService';

const MissionsScreen = () => {
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
      .catch((err) => {
        const msg = err?.message || '';
        if (msg.includes('403') || msg.includes('locked')) {
          setError('Missions unlock at stability score 36. Complete the onboarding survey to earn points.');
        } else {
          setError('Could not load missions. Make sure the backend is running.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleComplete = (mission) => {
    if (mission.verificationType === 'text') {
      setVerifyText('');
      setVerifying(mission);
    } else {
      submitComplete(mission, {});
    }
  };

  const submitComplete = async (mission, payload) => {
    setSubmitting(true);
    try {
      const result = await completeMission(mission.id, payload);
      setCompleted(prev => ({
        ...prev,
        [mission.id]: { delta: result.total_delta, newScore: result.stability_score },
      }));
      setVerifying(null);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not complete mission.');
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = Object.keys(completed).length;
  const totalXP = Object.values(completed).reduce((sum, c) => sum + (c.delta || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Today's Missions</Text>
          <Text style={styles.subheader}>
            {completedCount} of {missions.length} completed
          </Text>
        </View>
        {totalXP > 0 && (
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{totalXP} pts</Text>
          </View>
        )}
      </View>

      {verifying && (
        <View style={styles.verifyBox}>
          <Text style={styles.verifyLabel}>How did it go? Describe what you did:</Text>
          <TextInput
            style={styles.verifyInput}
            value={verifyText}
            onChangeText={setVerifyText}
            placeholder="Write a few words..."
            placeholderTextColor={colors.textLight}
            multiline
          />
          <View style={styles.verifyActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setVerifying(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!verifyText.trim() || submitting) && styles.submitBtnDisabled]}
              onPress={() => submitComplete(verifying, { text: verifyText.trim() })}
              disabled={!verifyText.trim() || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitBtnText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : missions.length === 0 ? (
        <Text style={styles.emptyText}>No pending missions. Check back later!</Text>
      ) : (
        <FlatList
          data={missions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <DailyMissionCard
              title={item.title}
              description={item.description}
              xp={item.xp}
              completed={!!completed[item.id]}
              onComplete={() => handleComplete(item)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  header: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subheader: { fontSize: 14, color: colors.textLight, marginTop: 2 },
  xpBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  xpBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  loader: { marginTop: 40 },
  errorText: {
    margin: 24,
    color: colors.textLight,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 40,
    color: colors.textLight,
    fontSize: 15,
    textAlign: 'center',
  },
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  verifyBox: {
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  verifyLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 },
  verifyInput: {
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  verifyActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.textLight, fontWeight: '600' },
  submitBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});

export default MissionsScreen;
