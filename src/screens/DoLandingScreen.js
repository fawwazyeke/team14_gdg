/**
 * DoLandingScreen — 3-step pre-auth onboarding
 * Step 0: Welcome   → "Find your way."
 * Step 1: Name      → "What should we call you?"
 * Step 2: Interests → "What lights you up?"
 *
 * Props: { onGetStarted, onSignIn }
 * onGetStarted is called after step 2 (with collected name + interests stored in AsyncStorage)
 * onSignIn is called from the sign-in link on step 0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Dimensions, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W } = Dimensions.get('window');

// ── Dawn-dark palette (fixed, pre-auth) ──────────────────────────────────────
const BG      = '#1c1815';
const SURFACE = '#26211A';
const INK     = '#F2E8D8';
const SOFT    = '#B8AB99';
const MUTED   = '#7A6F62';
const LINE    = 'rgba(242,232,216,0.12)';
const PRIMARY = '#E08A5F';
const GRAD    = ['#FBB57A', '#E08A5F', '#C46A3D'];
const WASH    = '#3A2A1F';
const SERIF   = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

// Keys for pre-filling the post-auth onboarding
export const ONBOARDING_CACHE_KEYS = {
  name:      '@do_pre_name',
  interests: '@do_pre_interests',
};

// ── Interest options (matches ai_logic categories) ───────────────────────────
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

// ── Shared helpers ────────────────────────────────────────────────────────────
const ORB_D = W * 0.56;   // orb diameter for step 0

/** Breathe + pulse loop for the orb */
function useBreath(duration = 3200) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.055, duration, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0,   duration, useNativeDriver: true }),
      ])
    ).start();
    return () => scale.stopAnimation();
  }, []);
  return scale;
}

/** Fade + slide-up entrance: runs whenever `trigger` changes */
function useFadeUp(trigger = 0, delay = 0) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 520, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 480, delay, useNativeDriver: true }),
    ]).start();
  }, [trigger]);
  return { opacity, transform: [{ translateY }] };
}

/** Three pill-dots — active dot is wider */
function ProgressDots({ active, count = 3 }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[s.dot, { width: i === active ? 22 : 6, backgroundColor: i === active ? PRIMARY : LINE }]}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 0 — Welcome
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeStep({ insets, onBegin, onSignIn }) {
  const breathe = useBreath();

  const orbStyle   = useFadeUp(0, 0);
  const textStyle  = useFadeUp(0, 200);
  const ctaStyle   = useFadeUp(0, 420);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* top amber glow — atmosphere */}
      <View style={s.topGlow} pointerEvents="none" />

      {/* ── Orb ── */}
      <View style={s.orbWrap}>
        <Animated.View style={[orbStyle, { alignItems: 'center', justifyContent: 'center' }]}>
          {/* halos */}
          <Animated.View style={[s.halo3, { transform: [{ scale: breathe }] }]} />
          <Animated.View style={[s.halo2, { transform: [{ scale: breathe }] }]} />
          <Animated.View style={[s.halo1, { transform: [{ scale: breathe }] }]} />
          {/* core */}
          <Animated.View style={{ transform: [{ scale: breathe }] }}>
            <LinearGradient
              colors={['#FFF7E4', '#FBB57A', '#E08A5F', '#C46A3D']}
              start={{ x: 0.3, y: 0.25 }}
              end={{ x: 0.75, y: 0.85 }}
              style={s.orbCore}
            >
              {/* specular highlight */}
              <View style={s.orbHighlight} />
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </View>

      {/* ── Wordmark + tagline ── */}
      <Animated.View style={[s.wordmarkWrap, textStyle]}>
        <Text style={s.wordmark}>Do</Text>
        <Text style={s.tagline}>Find your way.</Text>
      </Animated.View>

      {/* ── Bottom CTA section ── */}
      <Animated.View
        style={[s.ctaSection, { paddingBottom: insets.bottom + 36 }, ctaStyle]}
      >
        <TouchableOpacity onPress={onBegin} activeOpacity={0.85} style={{ width: '100%' }}>
          <LinearGradient
            colors={GRAD}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.primaryBtn}
          >
            <Text style={s.primaryBtnText}>Begin</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={s.ctaNote}>Takes about a minute. You can change anything later.</Text>

        <ProgressDots active={0} />

        <TouchableOpacity onPress={onSignIn} activeOpacity={0.7} style={s.signInLink}>
          <Text style={s.signInText}>Already have an account? <Text style={{ color: PRIMARY }}>Sign in</Text></Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Name
// ─────────────────────────────────────────────────────────────────────────────
function NameStep({ insets, name, setName, onBack, onNext }) {
  const inputRef = useRef(null);
  const h1Style   = useFadeUp(1, 0);
  const subStyle  = useFadeUp(1, 80);
  const inpStyle  = useFadeUp(1, 160);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Back */}
      <TouchableOpacity onPress={onBack} style={[s.backBtn, { marginTop: 8 }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={s.stepContent}>
        <Animated.Text style={[s.stepH1, h1Style]}>
          What should we{'\n'}call you?
        </Animated.Text>
        <Animated.Text style={[s.stepBody, subStyle]}>
          Just a first name, or whatever feels right.
        </Animated.Text>

        <Animated.View style={[inpStyle, { width: '100%' }]}>
          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            placeholder="your name"
            placeholderTextColor={MUTED}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => name.trim() && onNext()}
            style={[
              s.nameInput,
              { borderBottomColor: name.trim() ? PRIMARY : LINE },
            ]}
          />
        </Animated.View>

        <Text style={s.inputHint}>This is just for us. No accounts, no public profile.</Text>
      </View>

      {/* Bottom */}
      <View style={[s.ctaSection, { paddingBottom: insets.bottom + 36 }]}>
        <TouchableOpacity
          onPress={onNext}
          disabled={!name.trim()}
          activeOpacity={0.85}
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={name.trim() ? GRAD : [SURFACE, SURFACE]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.primaryBtn}
          >
            <Text style={[s.primaryBtnText, !name.trim() && { color: MUTED }]}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
        <ProgressDots active={1} />
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Interests
// ─────────────────────────────────────────────────────────────────────────────
function InterestsStep({ insets, interests, setInterests, onBack, onNext }) {
  const h1Style   = useFadeUp(2, 0);
  const subStyle  = useFadeUp(2, 80);
  const chipStyle = useFadeUp(2, 160);

  const toggle = useCallback((id) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, [setInterests]);

  const canContinue = interests.length > 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Back */}
      <TouchableOpacity onPress={onBack} style={[s.backBtn, { marginTop: 8 }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={[s.stepContent, { flex: 1 }]}>
        <Animated.Text style={[s.stepH1, h1Style]}>What lights you up?</Animated.Text>
        <Animated.Text style={[s.stepBody, subStyle]}>
          Pick a few. You can always change these later.
        </Animated.Text>

        <Animated.View style={[chipStyle, { flex: 1 }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.chipGrid}
          >
            {INTERESTS.map((it) => {
              const active = interests.includes(it.id);
              return (
                <TouchableOpacity
                  key={it.id}
                  onPress={() => toggle(it.id)}
                  activeOpacity={0.75}
                  style={[
                    s.chip,
                    active
                      ? { backgroundColor: WASH, borderColor: PRIMARY, borderWidth: 1.5 }
                      : { backgroundColor: SURFACE, borderColor: LINE, borderWidth: 1 },
                  ]}
                >
                  <Text style={s.chipEmoji}>{it.emoji}</Text>
                  <Text style={[s.chipLabel, { color: active ? PRIMARY : SOFT, fontWeight: active ? '600' : '500' }]}>
                    {it.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>

      {/* Bottom */}
      <View style={[s.ctaSection, { paddingBottom: insets.bottom + 36 }]}>
        <TouchableOpacity
          onPress={onNext}
          disabled={!canContinue}
          activeOpacity={0.85}
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={canContinue ? GRAD : [SURFACE, SURFACE]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.primaryBtn}
          >
            <Text style={[s.primaryBtnText, !canContinue && { color: MUTED }]}>
              {canContinue ? `Continue with ${interests.length}` : 'Pick at least one'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <ProgressDots active={2} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export — owns step state
// ─────────────────────────────────────────────────────────────────────────────
export default function DoLandingScreen({ onGetStarted, onSignIn }) {
  const insets = useSafeAreaInsets();
  const [step, setStep]           = useState(0);
  const [name, setName]           = useState('');
  const [interests, setInterests] = useState([]);

  const handleFinish = async () => {
    // Cache for the post-auth DoOnboardingScreen to pre-fill
    try {
      await AsyncStorage.multiSet([
        [ONBOARDING_CACHE_KEYS.name,      name.trim()],
        [ONBOARDING_CACHE_KEYS.interests, JSON.stringify(interests)],
      ]);
    } catch (_) {}
    onGetStarted();
  };

  if (step === 0) return <WelcomeStep    insets={insets} onBegin={() => setStep(1)} onSignIn={onSignIn} />;
  if (step === 1) return <NameStep       insets={insets} name={name} setName={setName} onBack={() => setStep(0)} onNext={() => setStep(2)} />;
  return               <InterestsStep  insets={insets} interests={interests} setInterests={setInterests} onBack={() => setStep(1)} onNext={handleFinish} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Step 0: orb + wordmark ──
  topGlow: {
    position: 'absolute',
    top: -60, alignSelf: 'center',
    width: 320, height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,185,100,0.09)',
  },
  orbWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  halo3: {
    position: 'absolute',
    width: ORB_D * 1.55, height: ORB_D * 1.55, borderRadius: ORB_D * 0.775,
    backgroundColor: 'rgba(217,149,102,0.07)',
  },
  halo2: {
    position: 'absolute',
    width: ORB_D * 1.22, height: ORB_D * 1.22, borderRadius: ORB_D * 0.61,
    backgroundColor: 'rgba(217,149,102,0.13)',
  },
  halo1: {
    position: 'absolute',
    width: ORB_D * 0.97, height: ORB_D * 0.97, borderRadius: ORB_D * 0.485,
    backgroundColor: 'rgba(217,149,102,0.18)',
  },
  orbCore: {
    width: ORB_D * 0.72, height: ORB_D * 0.72, borderRadius: ORB_D * 0.36,
    shadowColor: '#E08A5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 14,
  },
  orbHighlight: {
    position: 'absolute',
    top: '14%', left: '18%',
    width: '32%', height: '22%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  wordmarkWrap: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  wordmark: {
    fontFamily: SERIF,
    fontSize: 88,
    fontStyle: 'italic',
    fontWeight: '500',
    color: INK,
    lineHeight: 96,
    letterSpacing: -2,
    includeFontPadding: false,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '400',
    color: SOFT,
    marginTop: 6,
    letterSpacing: -0.1,
  },

  // ── Shared bottom CTA ──
  ctaSection: {
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 14,
  },
  primaryBtn: {
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#E08A5F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ctaNote: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 19,
  },
  signInLink: {
    paddingVertical: 8,
    marginTop: 2,
  },
  signInText: {
    fontSize: 14,
    color: MUTED,
    fontWeight: '500',
  },

  // ── Progress dots ──
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  // ── Steps 1 & 2 shared ──
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
    color: SOFT,
  },
  stepContent: {
    paddingHorizontal: 32,
    paddingTop: 20,
    flex: 1,
  },
  stepH1: {
    fontSize: 30,
    fontWeight: '600',
    color: INK,
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 10,
  },
  stepBody: {
    fontSize: 15,
    color: SOFT,
    lineHeight: 23,
    marginBottom: 36,
  },

  // ── Step 1: Name input ──
  nameInput: {
    fontFamily: SERIF,
    fontSize: 38,
    fontWeight: '400',
    color: INK,
    letterSpacing: -0.5,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 2,
    borderBottomWidth: 1.5,
    backgroundColor: 'transparent',
  },
  inputHint: {
    fontSize: 13,
    color: MUTED,
    marginTop: 14,
    lineHeight: 19,
  },

  // ── Step 2: Interest chips ──
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  chipEmoji: {
    fontSize: 15,
  },
  chipLabel: {
    fontSize: 14,
  },
});
