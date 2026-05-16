/**
 * DoLandingScreen — Welcome screen before sign-up
 *
 * Props: { onGetStarted, onSignIn }
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Animated, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

// ── Dawn-dark palette ─────────────────────────────────────────────────────────
const BG      = '#1c1815';
const INK     = '#F2E8D8';
const SOFT    = '#B8AB99';
const MUTED   = '#7A6F62';
const LINE    = 'rgba(242,232,216,0.12)';
const PRIMARY = '#E08A5F';
const GRAD    = ['#FBB57A', '#E08A5F', '#C46A3D'];
const SERIF   = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

const ORB_D = W * 0.56;

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

/** Fade + slide-up entrance */
function useFadeUp(delay = 0) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 520, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 480, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

export default function DoLandingScreen({ onGetStarted, onSignIn }) {
  const insets  = useSafeAreaInsets();
  const breathe = useBreath();

  const orbStyle  = useFadeUp(0);
  const textStyle = useFadeUp(200);
  const ctaStyle  = useFadeUp(420);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* top amber glow */}
      <View style={s.topGlow} pointerEvents="none" />

      {/* ── Orb ── */}
      <View style={s.orbWrap}>
        <Animated.View style={[orbStyle, { alignItems: 'center', justifyContent: 'center' }]}>
          <Animated.View style={[s.halo3, { transform: [{ scale: breathe }] }]} />
          <Animated.View style={[s.halo2, { transform: [{ scale: breathe }] }]} />
          <Animated.View style={[s.halo1, { transform: [{ scale: breathe }] }]} />
          <Animated.View style={{ transform: [{ scale: breathe }] }}>
            <LinearGradient
              colors={['#FFF7E4', '#FBB57A', '#E08A5F', '#C46A3D']}
              start={{ x: 0.3, y: 0.25 }}
              end={{ x: 0.75, y: 0.85 }}
              style={s.orbCore}
            >
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

      {/* ── Bottom CTA ── */}
      <Animated.View
        style={[s.ctaSection, { paddingBottom: insets.bottom + 36 }, ctaStyle]}
      >
        <TouchableOpacity onPress={onGetStarted} activeOpacity={0.85} style={{ width: '100%' }}>
          <LinearGradient
            colors={GRAD}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.primaryBtn}
          >
            <Text style={s.primaryBtnText}>Begin</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={s.ctaNote}>Takes about a minute. You can change anything later.</Text>

        <TouchableOpacity onPress={onSignIn} activeOpacity={0.7} style={s.signInLink}>
          <Text style={s.signInText}>
            Already have an account?{' '}
            <Text style={{ color: PRIMARY }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
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
});
