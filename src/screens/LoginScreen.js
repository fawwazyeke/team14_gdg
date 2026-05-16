import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { nicknameFromEmail } from '../services/firebaseProfileService';
import { colors } from '../theme/colors';

const LoginScreen = () => {
  const { user, needsProfile, profileNotice, signIn, signUp, completeProfile } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestedNickname = useMemo(
    () => nickname || user?.displayName || nicknameFromEmail(user?.email || email),
    [email, nickname, user]
  );

  const handleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const handleNickname = async () => {
    const cleanNickname = suggestedNickname.trim();
    if (cleanNickname.length < 2) {
      setError('Choose a nickname with at least 2 characters.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await completeProfile(cleanNickname);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  if (needsProfile) {
    return (
      <AuthShell>
        <Text style={styles.eyebrow}>Do / 道 / 도</Text>
        <Text style={styles.title}>Choose what people call you.</Text>
        <Text style={styles.subtitle}>This nickname is shared with your Do profile in Firebase.</Text>
        {profileNotice ? <Text style={styles.notice}>{profileNotice}</Text> : null}
        <TextInput
          style={styles.input}
          value={suggestedNickname}
          onChangeText={setNickname}
          placeholder="Nickname"
          placeholderTextColor={colors.textLight}
          autoCapitalize="words"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton loading={loading} title="Continue" onPress={handleNickname} />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Text style={styles.eyebrow}>Do / 道 / 도</Text>
      <Text style={styles.title}>Sign in to keep your path.</Text>
      <Text style={styles.subtitle}>
        Find small, real-world chances to practice connection in Korea and Japan.
      </Text>

      <View style={styles.modeSwitch}>
        {['login', 'signup'].map((nextMode) => (
          <TouchableOpacity
            key={nextMode}
            style={[styles.modeButton, mode === nextMode && styles.modeButtonActive]}
            onPress={() => setMode(nextMode)}
          >
            <Text style={[styles.modeText, mode === nextMode && styles.modeTextActive]}>
              {nextMode === 'login' ? 'Log in' : 'Sign up'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.textLight}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.textLight}
        secureTextEntry
        autoComplete={mode === 'login' ? 'password' : 'new-password'}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        loading={loading}
        title={mode === 'login' ? 'Log in' : 'Create account'}
        onPress={handleAuth}
      />
    </AuthShell>
  );
};

const AuthShell = ({ children }) => (
  <KeyboardAvoidingView
    style={styles.keyboardView}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>{children}</View>
    </ScrollView>
  </KeyboardAvoidingView>
);

const PrimaryButton = ({ loading, title, onPress }) => (
  <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={onPress} disabled={loading}>
    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{title}</Text>}
  </TouchableOpacity>
);

function errorMessage(error) {
  const code = error?.code || error?.message || '';
  if (String(code).includes('auth/invalid-credential')) {
    return 'The email or password does not look right.';
  }
  if (String(code).includes('auth/email-already-in-use')) {
    return 'That email already has an account. Try logging in.';
  }
  if (String(code).includes('auth/weak-password')) {
    return 'Use a password with at least 6 characters.';
  }
  if (String(code).includes('auth/operation-not-allowed')) {
    return 'Enable email/password sign-in in Firebase Authentication.';
  }
  if (String(code).includes('auth/network-request-failed')) {
    return 'Network error while contacting Firebase.';
  }
  return 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: colors.textLight,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  notice: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 9,
    paddingVertical: 10,
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
  },
  modeText: {
    color: colors.textLight,
    fontWeight: '700',
  },
  modeTextActive: {
    color: colors.text,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  error: {
    color: '#b3261e',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default LoginScreen;
