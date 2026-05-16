import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import { radii } from '../theme/doTheme';

// ─── Companion Orb ──────────────────────────────────────────────
export function CompanionOrb({ size = 84, P, animated = true }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!animated) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.05, duration: 2500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0,  duration: 2500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animated]);

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ scale }] }}>
      {/* halo */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        backgroundColor: P.primary + '33',
      }} />
      {/* core */}
      <LinearGradient
        colors={[P.grad[0], P.grad[1], P.grad[2]]}
        start={{ x: 0.3, y: 0.28 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size * 0.7, height: size * 0.7, borderRadius: size * 0.35,
          alignSelf: 'center', marginTop: size * 0.15,
          shadowColor: P.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12,
          elevation: 8,
        }}
      />
    </Animated.View>
  );
}

// ─── Creature SVG ───────────────────────────────────────────────
export function CreatureOrb({ size = 84, P, animated = true }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!animated) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.04, duration: 2500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0,  duration: 2500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animated]);

  const c = P.primary;
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ scale }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <G strokeLinecap="round" strokeLinejoin="round">
          <Path d="M 63 30 L 63 9" stroke={c} strokeWidth="3" />
          <Circle cx="63" cy="7.5" r="2.2" fill={c} />
          <Path d="M 8 53 L 17 54" stroke={c} strokeWidth="3.5" />
          <Path d="M 83 54 L 92 53" stroke={c} strokeWidth="3.5" />
          <Path d="M 30 30 C 18 32, 12 42, 12 53 C 12 65, 18 73, 30 76 C 42 79, 58 79, 70 76 C 82 73, 88 65, 88 53 C 88 42, 80 32, 68 30 C 56 27, 42 27, 30 30 Z"
            stroke={c} strokeWidth="3.5" fill="none" />
          <Ellipse cx="42" cy="50" rx="2" ry="5" fill={c} />
          <Ellipse cx="58" cy="50" rx="2" ry="5" fill={c} />
          <Path d="M 45 60 Q 50 65 55 60" stroke={c} strokeWidth="2.2" fill="none" />
        </G>
      </Svg>
    </Animated.View>
  );
}

// ─── Dawn Horizon ───────────────────────────────────────────────
export function DawnHorizon({ progress = 0.5, P, height = 110, style = {} }) {
  const sunY = 100 - (progress * 75 + 15);
  return (
    <View style={[{ height, borderRadius: 14, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[P.horizon[0], P.horizon[1], P.horizon[2], P.horizon[3]]}
        locations={[0, 0.55, 0.85, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* sun */}
      <LinearGradient
        colors={['#FFF6E0', '#FFD692', P.primary]}
        style={{
          position: 'absolute',
          width: 40, height: 40, borderRadius: 20,
          left: '50%', marginLeft: -20,
          top: `${sunY}%`,
          shadowColor: '#FFD692', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 16,
        }}
      />
      {/* horizon line */}
      <View style={{
        position: 'absolute', left: 0, right: 0, top: '85%', height: 1,
        backgroundColor: 'rgba(255,255,255,0.35)',
      }} />
    </View>
  );
}

// ─── Primary Button ─────────────────────────────────────────────
export function PrimaryButton({ children, onPress, P, disabled = false, style = {} }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={disabled ? [P.surfaceQuiet, P.surfaceQuiet] : [P.grad[0], P.grad[1], P.grad[2]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 18, paddingHorizontal: 24, borderRadius: 999,
          alignItems: 'center',
          shadowColor: disabled ? 'transparent' : P.primary,
          shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
          elevation: disabled ? 0 : 6,
        }}
      >
        <Text style={{ color: disabled ? P.inkMuted : '#fff', fontSize: 17, fontWeight: '600', letterSpacing: -0.1 }}>
          {children}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Ghost / Secondary Button ───────────────────────────────────
export function GhostButton({ children, onPress, P, style = {} }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[{
      paddingVertical: 16, paddingHorizontal: 24, borderRadius: 999,
      borderWidth: 1.5, borderColor: P.line, alignItems: 'center',
    }, style]}>
      <Text style={{ color: P.ink, fontSize: 16, fontWeight: '500' }}>{children}</Text>
    </TouchableOpacity>
  );
}

// ─── Chip ───────────────────────────────────────────────────────
export function Chip({ children, active, onPress, P, icon }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 11, paddingHorizontal: 16, borderRadius: 999,
      borderWidth: active ? 1.5 : 1,
      borderColor: active ? P.primary : P.line,
      backgroundColor: active ? P.wash : P.surface,
    }}>
      {icon ? <Text style={{ fontSize: 15 }}>{icon}</Text> : null}
      <Text style={{ color: active ? P.primaryDeep : P.inkSoft, fontSize: 14, fontWeight: active ? '600' : '500' }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Card ───────────────────────────────────────────────────────
export function Card({ children, P, style = {}, soft = false, onPress }) {
  const inner = (
    <View style={[{
      backgroundColor: soft ? P.surfaceQuiet : P.surface,
      borderRadius: radii.lg,
      borderWidth: 0.5, borderColor: P.line,
      shadowColor: '#2A2420', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: soft ? 0 : 0.06, shadowRadius: 8, elevation: soft ? 0 : 2,
    }, style]}>
      {children}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{inner}</TouchableOpacity>;
  return inner;
}

// ─── Progress Dots ──────────────────────────────────────────────
export function ProgressDots({ count, active, P }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{
          height: 6, width: i === active ? 22 : 6,
          borderRadius: 3,
          backgroundColor: i === active ? P.primary : P.line,
        }} />
      ))}
    </View>
  );
}

// ─── Pulsing dot ────────────────────────────────────────────────
export function PulseDot({ P, size = 6 }) {
  const opacity = useRef(new Animated.Value(0.65)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1.0, duration: 1500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.65, duration: 1500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: P.accent, opacity }} />
  );
}
