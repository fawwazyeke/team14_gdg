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
import { SURVEY_QUESTIONS } from '../services/onboardingSurveyService';
import { colors } from '../theme/colors';

const INTERESTS = ['Sports', 'Music', 'Gaming', 'Art', 'Books', 'Nature', 'Food', 'Tech'];

const OnboardingScreen = ({ initialName = '', onComplete }) => {
  const [name, setName] = useState(initialName);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleStart = async () => {
    if (!name.trim() || !allQuestionsAnswered || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await onComplete({ name: name.trim(), interests: selectedInterests, surveyAnswers });
    } catch {
      setError('Could not save onboarding. Make sure the backend is running, then try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const allQuestionsAnswered = SURVEY_QUESTIONS.every((question) => surveyAnswers[question.key]);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>Welcome to Bridger</Text>
        <Text style={styles.subtitle}>
          You're not alone. Let's get to know you a little so we can help you connect.
        </Text>

        <Text style={styles.label}>What should we call you?</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.textLight}
          returnKeyType="done"
        />

        <Text style={styles.label}>What are you into? (pick any)</Text>
        <View style={styles.chips}>
          {INTERESTS.map(interest => {
            const active = selectedInterests.includes(interest);
            return (
              <TouchableOpacity
                key={interest}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleInterest(interest)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>A few gentle check-in questions</Text>
        <Text style={styles.questionIntro}>
          These help Do unlock the right practice flow. Pick what feels true today.
        </Text>

        {SURVEY_QUESTIONS.map((question, index) => (
          <View key={question.key} style={styles.questionCard}>
            <Text style={styles.questionNumber}>Question {index + 1}</Text>
            <Text style={styles.questionText}>{question.prompt}</Text>
            <View style={styles.optionStack}>
              {question.options.map((option) => {
                const active = surveyAnswers[question.key] === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionButton, active && styles.optionButtonActive]}
                    onPress={() => setSurveyAnswers(prev => ({ ...prev, [question.key]: option.value }))}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (!name.trim() || !allQuestionsAnswered || submitting) && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={!name.trim() || !allQuestionsAnswered || submitting}
        >
          <Text style={styles.buttonText}>{submitting ? 'Saving...' : "Let's Go →"}</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          You can always change your interests later in your profile.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 72,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 28,
    backgroundColor: colors.surface,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 40,
    width: '100%',
  },
  questionIntro: {
    color: colors.textLight,
    fontSize: 13,
    lineHeight: 19,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  questionCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 14,
    marginBottom: 14,
  },
  questionNumber: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  questionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 12,
  },
  optionStack: {
    gap: 8,
  },
  optionButton: {
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.surface,
  },
  optionButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#EAF3FF',
  },
  optionText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.text,
  },
  errorText: {
    color: '#b3261e',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textLight,
    fontWeight: '500',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export default OnboardingScreen;
