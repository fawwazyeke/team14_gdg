import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoTheme } from '../context/DoThemeContext';
import { useAuth } from '../context/AuthContext';
import { nicknameFromEmail } from '../services/firebaseProfileService';

const IS_WEB = Platform.OS === 'web';

export default function DoLoginScreen() {
  const { P } = useDoTheme();
  const insets = useSafeAreaInsets();
  const { user, needsProfile, signIn, signUp, signInWithGoogle, completeProfile } = useAuth();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestedNickname = useMemo(
    () => nickname || user?.displayName || nicknameFromEmail(user?.email || email),
    [email, nickname, user],
  );

  const handleGoogle = async () => {
    if (!IS_WEB) {
      setError('Google sign-in works on the web version. Use email/password on mobile.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleNickname = async () => {
    const name = suggestedNickname.trim();
    if (name.length < 2) {
      setError('Choose a name with at least 2 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await completeProfile(name);
    } catch (e) {
      setError(e?.message || 'Could not save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (needsProfile) {
    return (
      <LinearGradient
        colors={[P.horizon[0], P.horizon[1], P.bg]}
        locations={[0, 0.35, 0.75]}
        style={styles.root}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 48 }]} keyboardShouldPersistTaps="handled">
            <Text style={[styles.wordmark, { color: P.ink }]}>Do</Text>
            <Text style={[styles.heading, { color: P.ink }]}>What should we{'\n'}call you?</Text>
            <Text style={[styles.sub, { color: P.inkSoft }]}>Just a first name or nickname. No public profile.</Text>

            <TextInput
              value={suggestedNickname}
              onChangeText={setNickname}
              placeholder="your name"
              placeholderTextColor={P.inkMuted}
              autoFocus
              style={[styles.nameInput, { color: P.ink, borderBottomColor: suggestedNickname ? P.primary : P.line }]}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity onPress={handleNickname} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={[P.grad[0], P.grad[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[P.horizon[0], P.horizon[1], P.bg]}
      locations={[0, 0.35, 0.75]}
      style={styles.root}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 48 }]} keyboardShouldPersistTaps="handled">

          {/* Orb */}
          <LinearGradient
            colors={[P.horizon[0], P.horizon[1], P.horizon[2], P.horizon[3]]}
            locations={[0, 0.55, 0.8, 1]}
            style={styles.orb}
          >
            <LinearGradient colors={['#FFF7DC', P.primary]} style={styles.orbCore} />
            <View style={styles.orbLine} />
          </LinearGradient>

          <Text style={[styles.wordmark, { color: P.ink }]}>Do</Text>
          <Text style={[styles.heading, { color: P.ink }]}>
            {mode === 'login' ? 'Welcome back.' : 'Find your people.'}
          </Text>
          <Text style={[styles.sub, { color: P.inkSoft }]}>
            Small, real steps toward connection — in Korea and beyond.
          </Text>

          {/* Google sign-in */}
          <TouchableOpacity
            onPress={handleGoogle}
            disabled={loading}
            activeOpacity={0.8}
            style={[styles.googleBtn, { backgroundColor: P.surface, borderColor: P.line }]}
          >
            <Text style={[styles.googleBtnText, { color: P.ink }]}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={[styles.dividerRow, { marginBottom: 16 }]}>
            <View style={[styles.dividerLine, { backgroundColor: P.line }]} />
            <Text style={[styles.dividerLabel, { color: P.inkMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: P.line }]} />
          </View>

          {/* Mode toggle */}
          <View style={[styles.toggle, { backgroundColor: P.surface, borderColor: P.line }]}>
            {[['login', 'Log in'], ['signup', 'Sign up']].map(([m, label]) => (
              <TouchableOpacity
                key={m}
                onPress={() => { setMode(m); setError(''); }}
                style={[styles.toggleBtn, mode === m && { backgroundColor: P.primary }]}
              >
                <Text style={[styles.toggleText, { color: mode === m ? '#fff' : P.inkSoft }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Inputs */}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={P.inkMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={[styles.input, { color: P.ink, borderColor: P.line, backgroundColor: P.surface }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={P.inkMuted}
            secureTextEntry
            autoComplete={mode === 'login' ? 'password' : 'new-password'}
            style={[styles.input, { color: P.ink, borderColor: P.line, backgroundColor: P.surface }]}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity onPress={handleAuth} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[P.grad[0], P.grad[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{mode === 'login' ? 'Log in' : 'Create account'}</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.hint, { color: P.inkMuted }]}>
            No strangers list. No likes. Just small steps.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function friendlyError(e) {
  const code = String(e?.code || e?.message || '');
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) return 'Email or password is incorrect.';
  if (code.includes('auth/email-already-in-use')) return 'That email already has an account. Try logging in.';
  if (code.includes('auth/weak-password')) return 'Use at least 6 characters for your password.';
  if (code.includes('auth/network-request-failed')) return 'Network error. Check your connection.';
  if (code.includes('auth/too-many-requests')) return 'Too many attempts. Please wait a moment.';
  return 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 28, paddingBottom: 48 },

  orb: {
    width: 80, height: 80, borderRadius: 40, overflow: 'hidden',
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#E08A5F', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20,
  },
  orbCore: { width: 40, height: 40, borderRadius: 20, position: 'absolute', top: '28%', left: '50%', marginLeft: -20 },
  orbLine: { position: 'absolute', left: 0, right: 0, top: '70%', height: 1, backgroundColor: 'rgba(255,255,255,0.5)' },

  wordmark: { fontSize: 56, fontWeight: '300', letterSpacing: -2, textAlign: 'center', lineHeight: 58, marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5, textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 32 },

  toggle: {
    flexDirection: 'row', borderRadius: 999, borderWidth: 0.5,
    padding: 4, marginBottom: 20,
  },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  toggleText: { fontSize: 14, fontWeight: '600' },

  input: {
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 16, marginBottom: 12,
  },

  nameInput: {
    fontSize: 34, fontWeight: '300', letterSpacing: -0.5,
    borderBottomWidth: 1.5, paddingVertical: 10, paddingHorizontal: 4,
    backgroundColor: 'transparent', marginBottom: 28,
  },

  btn: {
    borderRadius: 999, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#E08A5F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12,
    marginBottom: 16,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

  hint: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  error: { color: '#b3261e', fontSize: 13, marginBottom: 12, textAlign: 'center' },

  googleBtn: {
    borderWidth: 1, borderRadius: 999,
    paddingVertical: 14, alignItems: 'center', marginBottom: 16,
  },
  googleBtnText: { fontSize: 15, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerLabel: { fontSize: 12, fontWeight: '600' },
});
