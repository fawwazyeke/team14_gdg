import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const DailyMissionCard = ({ title, description, onComplete }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (!isCompleted) scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    if (!isCompleted) {
      scale.value = withSpring(1);
      setIsCompleted(true);
      if (onComplete) onComplete();
    }
  };

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      <LinearGradient
        colors={isCompleted ? ['#F9FAFB', '#F3F4F6'] : ['#FFFFFF', '#FFF0F5']}
        style={[styles.card, isCompleted && styles.cardCompleted]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, isCompleted && styles.iconContainerCompleted]}>
            <Ionicons 
              name={isCompleted ? "checkmark-circle" : "star"} 
              size={20} 
              color={isCompleted ? "#10B981" : colors.primary} 
            />
          </View>
          <Text style={[styles.headerTitle, isCompleted && { color: '#10B981' }]}>
            {isCompleted ? "Mission Accomplished" : "Daily Mission"}
          </Text>
        </View>
        
        <Text style={[styles.title, isCompleted && styles.textCompleted]}>{title}</Text>
        <Text style={[styles.description, isCompleted && styles.textCompleted]}>{description}</Text>
        
        <AnimatedTouchable
          style={styles.button}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          disabled={isCompleted}
        >
          <LinearGradient
            colors={isCompleted ? ['#D1D5DB', '#9CA3AF'] : colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              {isCompleted ? "Completed" : "I Did It!"}
            </Text>
            {!isCompleted && <Ionicons name="checkmark-circle" size={20} color="#FFF" style={styles.buttonIcon} />}
          </LinearGradient>
        </AnimatedTouchable>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 12,
    marginHorizontal: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCompleted: {
    shadowOpacity: 0,
    elevation: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 126, 103, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // Soft green
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 26,
  },
  description: {
    fontSize: 15,
    color: colors.textLight,
    marginBottom: 24,
    lineHeight: 22,
  },
  textCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

export default DailyMissionCard;
