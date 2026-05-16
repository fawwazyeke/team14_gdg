import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors } from '../theme/colors';

const INTERESTS = ['Sports', 'Music', 'Gaming', 'Art', 'Books', 'Nature', 'Food', 'Tech'];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const InterestChip = ({ interest, isActive, onPress }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isActive ? 1.05 : 1) }],
    };
  });

  return (
    <AnimatedTouchable
      style={[styles.chip, isActive && styles.chipActive, animatedStyle]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
        {interest}
      </Text>
    </AnimatedTouchable>
  );
};

const OnboardingScreen = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleStart = async () => {
    if (!name.trim()) return;
    await AsyncStorage.multiSet([
      ['user_name', name.trim()],
      ['user_interests', JSON.stringify(selectedInterests)],
      ['has_onboarded', 'true'],
    ]);
    onComplete();
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={colors.gradientBackground}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.emoji}>🌅</Text>
            <Text style={styles.title}>Welcome to Bridger</Text>
            <Text style={styles.subtitle}>
              You're not alone. Let's get to know you a little so we can help you connect.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>What should we call you?</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your preferred name"
              placeholderTextColor={colors.textLight}
              returnKeyType="done"
            />

            <Text style={styles.label}>What are you into? (pick any)</Text>
            <View style={styles.chips}>
              {INTERESTS.map(interest => (
                <InterestChip
                  key={interest}
                  interest={interest}
                  isActive={selectedInterests.includes(interest)}
                  onPress={() => toggleInterest(interest)}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, !name.trim() && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={!name.trim()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Let's Go</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            You can always change your interests later in your profile.
          </Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  formContainer: {
    width: '100%',
    marginBottom: 40,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: colors.text,
    marginBottom: 32,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  chipText: {
    color: colors.textLight,
    fontWeight: '600',
    fontSize: 15,
  },
  chipTextActive: {
    color: '#fff',
  },
  button: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  disclaimer: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export default OnboardingScreen;
