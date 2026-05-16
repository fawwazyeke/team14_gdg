import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import DailyMissionCard from '../components/DailyMissionCard';
import { getDailyMissions } from '../services/missionsService';

const MissionsScreen = () => {
  const [missions, setMissions] = useState([]);
  const [completed, setCompleted] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDailyMissions().then(data => {
      setMissions(data);
      setLoading(false);
    });
  }, []);

  const handleComplete = (id) => {
    setCompleted(prev => ({ ...prev, [id]: true }));
  };

  const completedCount = Object.keys(completed).length;
  const totalXP = missions
    .filter(m => completed[m.id])
    .reduce((sum, m) => sum + m.xp, 0);

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
            <Text style={styles.xpBadgeText}>+{totalXP} XP</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
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
              onComplete={() => handleComplete(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subheader: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  xpBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  xpBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
});

export default MissionsScreen;
