import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { DMSans_400Regular, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces';
import { buildPalette } from '../theme/doTheme';
import { CompanionSketch, PrimaryButton, Chip, ProgressDots } from '../components/DoAtoms';
import { SURVEY_QUESTIONS } from '../services/onboardingSurveyService';

const P = buildPalette('dawn', 'dark');

const INTERESTS = [
  { id: 'sports',  label: 'Sports',  emoji: '⚽' },
  { id: 'music',   label: 'Music',   emoji: '🎵' },
  { id: 'gaming',  label: 'Gaming',  emoji: '🎮' },
  { id: 'art',     label: 'Art',     emoji: '🎨' },
  { id: 'books',   label: 'Books',   emoji: '📖' },
  { id: 'nature',  label: 'Nature',  emoji: '🌿' },
  { id: 'food',    label: 'Food',    emoji: '🥖' },
  { id: 'tech',    label: 'Tech',    emoji: '💡' },
  { id: 'film',    label: 'Film',    emoji: '🎬' },
  { id: 'fitness', label: 'Fitness', emoji: '🏃' },
];

// ─── Step 0: Welcome ────────────────────────────────────────────
function StepWelcome({ onNext }) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeCenter}>
        <View style={styles.companionWrap}>
          <View style={[styles.companionHalo, { backgroundColor: P.primary + '33' }]} />
          <CompanionSketch size={130} P={P} animated />
        </View>

        <Text style={styles.wordmark}>Do</Text>
        <Text style={styles.welcomeSubtitle}>
          You're not alone.{'\n'}Let's find your people — slowly.
        </Text>
      </View>

      <View style={styles.stepFooter}>
        <PrimaryButton P={P} onPress={onNext}>Begin</PrimaryButton>
        <Text style={styles.disclaimer}>Takes about a minute. You can change anything later.</Text>
        <ProgressDots count={5} active={0} P={P} />
      </View>
    </View>
  );
}

// ─── Step 1: Name ───────────────────────────────────────────────
function StepName({ name, setName, onNext, onBack }) {
  const inputRef = useRef(null);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.stepContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: P.inkSoft }]}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.stepBody}>
          <Text style={[styles.stepTitle, { color: P.ink }]}>What should we{'\n'}call you?</Text>
          <Text style={[styles.stepSub, { color: P.inkSoft }]}>Just a first name, or whatever feels right.</Text>

          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            placeholder="your name"
            placeholderTextColor={P.inkMuted}
            autoFocus
            style={[styles.nameInput, {
              color: P.ink,
              borderBottomColor: name ? P.primary : P.line,
            }]}
          />
          <Text style={[styles.inputHint, { color: P.inkMuted }]}>
            This is just for us. No accounts, no public profile.
          </Text>
        </View>

        <View style={styles.stepFooter}>
          <PrimaryButton P={P} onPress={onNext} disabled={!name.trim()}>Continue</PrimaryButton>
          <ProgressDots count={5} active={1} P={P} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step 2: Age ────────────────────────────────────────────────
function StepAge({ age, setAge, onNext, onBack }) {
  const ageNum = parseInt(age, 10);
  const valid = !isNaN(ageNum) && ageNum >= 18 && ageNum <= 100;
  const tooYoung = !isNaN(ageNum) && ageNum < 18 && age.length >= 2;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.stepContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: P.inkSoft }]}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.stepBody}>
          <Text style={[styles.stepTitle, { color: P.ink }]}>How old are you?</Text>
          <Text style={[styles.stepSub, { color: P.inkSoft }]}>
            We use this to keep the space safe. It's never shown to anyone.
          </Text>

          <TextInput
            value={age}
            onChangeText={v => setAge(v.replace(/[^0-9]/g, ''))}
            placeholder="your age"
            placeholderTextColor={P.inkMuted}
            keyboardType="number-pad"
            maxLength={3}
            autoFocus
            style={[styles.nameInput, {
              color: P.ink,
              borderBottomColor: valid ? P.primary : tooYoung ? '#b3261e' : P.line,
            }]}
          />

          {tooYoung ? (
            <Text style={[styles.inputHint, { color: '#b3261e' }]}>
              You must be 18 or older to connect with others.
            </Text>
          ) : (
            <Text style={[styles.inputHint, { color: P.inkMuted }]}>
              Connecting with others requires age 18+.
            </Text>
          )}
        </View>

        <View style={styles.stepFooter}>
          <PrimaryButton P={P} onPress={onNext} disabled={!valid}>Continue</PrimaryButton>
          <ProgressDots count={5} active={2} P={P} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step 3: Interests ──────────────────────────────────────────
function StepInterests({ interests, setInterests, onNext, onBack }) {
  const toggle = (id) =>
    setInterests(interests.includes(id) ? interests.filter(x => x !== id) : [...interests, id]);

  return (
    <View style={styles.stepContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={[styles.backBtnText, { color: P.inkSoft }]}>← Back</Text>
      </TouchableOpacity>

      <View style={[styles.stepBody, { flex: 1 }]}>
        <Text style={[styles.stepTitle, { color: P.ink }]}>What lights you up?</Text>
        <Text style={[styles.stepSub, { color: P.inkSoft }]}>Pick a few. You can always change these later.</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.chipsWrap}>
            {INTERESTS.map(it => (
              <Chip key={it.id} P={P} active={interests.includes(it.id)} onPress={() => toggle(it.id)} icon={it.emoji}>
                {it.label}
              </Chip>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.stepFooter}>
        <PrimaryButton P={P} onPress={onNext} disabled={interests.length === 0}>
          {interests.length === 0 ? 'Pick at least one' : `Continue with ${interests.length}`}
        </PrimaryButton>
        <ProgressDots count={5} active={3} P={P} />
      </View>
    </View>
  );
}

// ─── Step 4: Survey ─────────────────────────────────────────────
function StepSurvey({ surveyAnswers, setSurveyAnswers, onNext, onBack, submitting }) {
  const allAnswered = SURVEY_QUESTIONS.every(q => surveyAnswers[q.key]);

  const select = (questionKey, optionValue) => {
    setSurveyAnswers(prev => ({ ...prev, [questionKey]: optionValue }));
  };

  return (
    <View style={styles.stepContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={[styles.backBtnText, { color: P.inkSoft }]}>← Back</Text>
      </TouchableOpacity>

      <View style={[styles.stepBody, { flex: 1 }]}>
        <Text style={[styles.stepTitle, { color: P.ink }]}>A few quick questions</Text>
        <Text style={[styles.stepSub, { color: P.inkSoft }]}>
          Helps us find the right people and pace for you.
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {SURVEY_QUESTIONS.map((q, qi) => (
            <View key={q.key} style={styles.surveyQuestion}>
              <Text style={[styles.surveyPrompt, { color: P.ink }]}>
                {qi + 1}. {q.prompt}
              </Text>
              {q.options.map(opt => {
                const selected = surveyAnswers[q.key] === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => select(q.key, opt.value)}
                    activeOpacity={0.75}
                    style={[
                      styles.surveyOption,
                      {
                        borderColor: selected ? P.primary : P.line,
                        backgroundColor: selected ? P.primary + '22' : P.surface,
                      },
                    ]}
                  >
                    <View style={[styles.surveyRadio, { borderColor: selected ? P.primary : P.line }]}>
                      {selected && <View style={[styles.surveyRadioFill, { backgroundColor: P.primary }]} />}
                    </View>
                    <Text style={[styles.surveyOptionText, { color: selected ? P.ink : P.inkSoft }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.stepFooter}>
        <PrimaryButton P={P} onPress={onNext} disabled={!allAnswered || submitting}>
          {submitting ? 'Saving…' : allAnswered ? 'Finish' : 'Answer all questions'}
        </PrimaryButton>
        <ProgressDots count={5} active={4} P={P} />
      </View>
    </View>
  );
}

// ─── Root Onboarding ────────────────────────────────────────────
export default function DoOnboardingScreen({ initialName = '', onComplete }) {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_600SemiBold, Fraunces_400Regular });
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState('');
  const [interests, setInterests] = useState([]);
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const finish = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onComplete({ name: name.trim(), age: parseInt(age, 10), interests, surveyAnswers });
    } catch (e) {
      setError(e?.message || 'Could not save. Try again.');
      setSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <LinearGradient
      colors={[P.horizon[0], P.horizon[1], P.bg]}
      locations={[0, 0.3, 0.7]}
      style={styles.root}
    >
      {step === 0 && <StepWelcome onNext={next} />}
      {step === 1 && <StepName name={name} setName={setName} onNext={next} onBack={back} />}
      {step === 2 && <StepAge age={age} setAge={setAge} onNext={next} onBack={back} />}
      {step === 3 && (
        <StepInterests
          interests={interests}
          setInterests={setInterests}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 4 && (
        <StepSurvey
          surveyAnswers={surveyAnswers}
          setSurveyAnswers={setSurveyAnswers}
          onNext={finish}
          onBack={back}
          submitting={submitting}
        />
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stepContainer: { flex: 1, paddingTop: 60, paddingBottom: 40 },

  welcomeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  companionWrap: {
    width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  companionHalo: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    shadowColor: '#E08A5F', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.24, shadowRadius: 24,
  },
  wordmark: {
    fontFamily: 'Fraunces_400Regular', fontSize: 88, color: P.ink,
    lineHeight: 90, letterSpacing: -3,
  },
  welcomeSubtitle: {
    fontFamily: 'DMSans_400Regular', fontSize: 17, color: P.inkSoft,
    textAlign: 'center', lineHeight: 26, marginTop: 18, maxWidth: 260,
  },

  stepFooter: { paddingHorizontal: 24, gap: 16 },
  disclaimer: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: P.inkMuted, textAlign: 'center' },

  backBtn: { paddingHorizontal: 24, paddingVertical: 8, marginBottom: 4 },
  backBtnText: { fontFamily: 'DMSans_400Regular', fontSize: 15, fontWeight: '500' },

  stepBody: { paddingHorizontal: 32, paddingTop: 12, paddingBottom: 20 },
  stepTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 30, lineHeight: 36, letterSpacing: -0.5, marginBottom: 10 },
  stepSub: { fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 23, marginBottom: 32 },

  nameInput: {
    fontFamily: 'Fraunces_400Regular', fontSize: 38, letterSpacing: -0.8,
    borderBottomWidth: 1.5, paddingVertical: 10, paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  inputHint: { fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 14 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 16 },

  surveyQuestion: { marginBottom: 28 },
  surveyPrompt: { fontFamily: 'DMSans_600SemiBold', fontSize: 15, lineHeight: 22, marginBottom: 12 },
  surveyOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
  },
  surveyRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  surveyRadioFill: { width: 10, height: 10, borderRadius: 5 },
  surveyOptionText: { fontFamily: 'DMSans_400Regular', fontSize: 14, flex: 1 },

  errorText: { color: '#b3261e', fontSize: 13, textAlign: 'center', marginBottom: 12, paddingHorizontal: 24 },
});
