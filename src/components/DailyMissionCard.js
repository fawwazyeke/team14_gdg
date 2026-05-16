import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

const DailyMissionCard = ({ title, description, xp, completed, onComplete }) => {
  return (
    <View style={[styles.card, completed && styles.cardCompleted]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, completed && styles.titleCompleted]}>{title}</Text>
        {xp != null && (
          <View style={[styles.xpTag, completed && styles.xpTagCompleted]}>
            <Text style={styles.xpText}>+{xp} XP</Text>
          </View>
        )}
      </View>

      <Text style={styles.description}>{description}</Text>

      {completed ? (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>✓ Completed!</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={onComplete}>
          <Text style={styles.buttonText}>I Did It!</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.missionBackground,
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  cardCompleted: {
    opacity: 0.7,
    borderLeftColor: '#aaa',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  xpTag: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  xpTagCompleted: {
    backgroundColor: '#ccc',
  },
  xpText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  completedBadge: {
    backgroundColor: '#e6f4ea',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  completedText: {
    color: '#2e7d32',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default DailyMissionCard;
