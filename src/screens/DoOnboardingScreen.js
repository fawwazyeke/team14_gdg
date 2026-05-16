import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { DM_Sans_400Regular, DM_Sans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces';
import { buildPalette } from '../theme/doTheme';
import { PrimaryButton, GhostButton, Chip, ProgressDots } from '../components/DoAtoms';

const P = buildPalette('dawn', 'light');

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
        {/* Sunrise orb */}
        <LinearGradient
          colors={[P.horizon[0], P.horizon[1], P.horizon[2], P.horizon[3]]}
          locations={[0, 0.55, 0.8, 1]}
          style={styles.sunriseOrb}
        >
          <LinearGradient
            colors={['#FFF7DC', P.primary]}
            style={styles.sunCore}
          />
          <View style={styles.horizonLine} />
        </LinearGradient>

        <Text style={styles.wordmark}>Do</Text>
        <Text style={styles.welcomeSubtitle}>
          You're not alone.{'\n'}Let's find your people — slowly.
        </Text>
      </View>

      <View style={styles.stepFooter}>
        <PrimaryButton P={P} onPress={onNext}>Begin</PrimaryButton>
        <Text style={styles.disclaimer}>Takes about a minute. You can change anything later.</Text>
        <ProgressDots count={3} active={0} P={P} />
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
          <ProgressDots count={3} active={1} P={P} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step 2: Interests ──────────────────────────────────────────
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
        <ProgressDots count={3} active={2} P={P} />
      </View>
    </View>
  );
}

// ─── Root Onboarding ────────────────────────────────────────────
export default function DoOnboardingScreen({ initialName = '', onComplete }) {
  const [fontsLoaded] = useFonts({ DM_Sans_400Regular, DM_Sans_600SemiBold, Fraunces_400Regular });
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [interests, setInterests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const finish = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onComplete({ name: name.trim(), interests, surveyAnswers: {} });
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
      {step === 2 && (
        <StepInterests
          interests={interests}
          setInterests={setInterests}
          onNext={finish}
          onBack={back}
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
  sunriseOrb: {
    width: 110, height: 110, borderRadius: 55, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 30,
    shadowColor: '#E08A5F', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24,
  },
  sunCore: {
    width: 56, height: 56, borderRadius: 28,
    position: 'absolute', top: '30%', left: '50%', marginLeft: -28,
  },
  horizonLine: {
    position: 'absolute', left: 0, right: 0, top: '72%', height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  wordmark: {
    fontFamily: 'Fraunces_400Regular', fontSize: 88, color: P.ink,
    lineHeight: 90, letterSpacing: -3,
  },
  welcomeSubtitle: {
    fontFamily: 'DM_Sans_400Regular', fontSize: 17, color: P.inkSoft,
    textAlign: 'center', lineHeight: 26, marginTop: 18, maxWidth: 260,
  },

  stepFooter: { paddingHorizontal: 24, gap: 16 },
  disclaimer: { fontFamily: 'DM_Sans_400Regular', fontSize: 13, color: P.inkMuted, textAlign: 'center' },

  backBtn: { paddingHorizontal: 24, paddingVertical: 8, marginBottom: 4 },
  backBtnText: { fontFamily: 'DM_Sans_400Regular', fontSize: 15, fontWeight: '500' },

  stepBody: { paddingHorizontal: 32, paddingTop: 12, paddingBottom: 20 },
  stepTitle: { fontFamily: 'DM_Sans_600SemiBold', fontSize: 30, lineHeight: 36, letterSpacing: -0.5, marginBottom: 10 },
  stepSub: { fontFamily: 'DM_Sans_400Regular', fontSize: 15, lineHeight: 23, marginBottom: 32 },

  nameInput: {
    fontFamily: 'Fraunces_400Regular', fontSize: 38, letterSpacing: -0.8,
    borderBottomWidth: 1.5, paddingVertical: 10, paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  inputHint: { fontFamily: 'DM_Sans_400Regular', fontSize: 13, marginTop: 14 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 16 },

  errorText: { color: '#b3261e', fontSize: 13, textAlign: 'center', marginBottom: 12, paddingHorizontal: 24 },
});
