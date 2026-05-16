import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DoThemeProvider } from './src/context/DoThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import DoLandingScreen from './src/screens/DoLandingScreen';
import DoLoginScreen from './src/screens/DoLoginScreen';
import DoOnboardingScreen from './src/screens/DoOnboardingScreen';
import { userStorageKeys } from './src/services/firebaseProfileService';
import { ensureBackendProfile, submitOnboardingSurvey } from './src/services/onboardingSurveyService';
import { colors } from './src/theme/colors';

// Key stored once the landing screen has been dismissed
const LANDING_SEEN_KEY = '@do_landing_seen';

function FirebaseErrorBanner() {
  const { profileNotice } = useAuth();
  if (!profileNotice) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>⚠ {profileNotice}</Text>
    </View>
  );
}

function AppGate() {
  const { user, profile, loading, needsProfile, completeProfile } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState(null);
  const backendSyncedRef = useRef(false);

  // Landing / login routing for unauthenticated users
  // null = still checking storage, 'landing' = show landing, 'login' | 'signup' = show login
  const [authView, setAuthView] = useState(null);

  // Check AsyncStorage once — show landing only the very first time
  useEffect(() => {
    if (user) return; // logged in — no need
    AsyncStorage.getItem(LANDING_SEEN_KEY).then((seen) => {
      setAuthView(seen === 'true' ? 'login' : 'landing');
    });
  }, [user]);

  // Reset auth view when user logs out
  useEffect(() => {
    if (!user) return;
    setAuthView(null); // clear so the check runs again on next logout
  }, [user]);

  const handleGetStarted = async () => {
    await AsyncStorage.setItem(LANDING_SEEN_KEY, 'true');
    setAuthView('signup');
  };

  const handleSignIn = async () => {
    await AsyncStorage.setItem(LANDING_SEEN_KEY, 'true');
    setAuthView('login');
  };

  useEffect(() => {
    if (!user || needsProfile) {
      setHasOnboarded(null);
      backendSyncedRef.current = false;
      return;
    }

    AsyncStorage.getItem(userStorageKeys(user.uid).onboarded).then((val) => {
      if (val === 'true') {
        setHasOnboarded(true);
      } else if (profile?.interests?.length > 0) {
        AsyncStorage.setItem(userStorageKeys(user.uid).onboarded, 'true');
        setHasOnboarded(true);
      } else {
        setHasOnboarded(false);
      }
    });
  }, [needsProfile, profile, user]);

  // Ensure backend profile exists whenever the user reaches the main app.
  useEffect(() => {
    if (!user || !hasOnboarded || !profile?.nickname || backendSyncedRef.current) return;
    backendSyncedRef.current = true;
    ensureBackendProfile({ nickname: profile.nickname, interests: profile.interests || [] })
      .catch((e) => console.warn('Backend profile sync failed (will retry next launch):', e.message));
  }, [user, hasOnboarded, profile]);

  const handleOnboardingComplete = async ({ name, age, interests, surveyAnswers }) => {
    if (!user) return;

    await completeProfile(name, { interests, age });

    try {
      await ensureBackendProfile({ nickname: name, interests, age });
      await submitOnboardingSurvey(surveyAnswers);
    } catch (e) {
      console.warn('Backend onboarding call failed, will retry later:', e.message);
    }

    const keys = userStorageKeys(user.uid);
    await AsyncStorage.multiSet([
      [keys.name, name.trim()],
      [keys.interests, JSON.stringify(interests)],
      [keys.onboarded, 'true'],
    ]);
    backendSyncedRef.current = true;
    setHasOnboarded(true);
  };

  // ── Loading spinner ──
  if (loading || (user && !needsProfile && hasOnboarded === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1c1815' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Unauthenticated ──
  if (user && needsProfile) {
    return (
      <SafeAreaProvider>
        <FirebaseErrorBanner />
        <DoLoginScreen initialMode="signup" />
      </SafeAreaProvider>
    );
  }

  if (!user) {
    // Still checking AsyncStorage
    if (authView === null) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1c1815' }} />
      );
    }

    if (authView === 'landing') {
      return (
        <SafeAreaProvider>
          <DoLandingScreen
            onGetStarted={handleGetStarted}
            onSignIn={handleSignIn}
          />
        </SafeAreaProvider>
      );
    }

    return (
      <SafeAreaProvider>
        <FirebaseErrorBanner />
        <DoLoginScreen initialMode={authView === 'signup' ? 'signup' : 'login'} />
      </SafeAreaProvider>
    );
  }

  // ── Authenticated ──
  return (
    <SafeAreaProvider>
      <FirebaseErrorBanner />
      {hasOnboarded ? (
        <AppNavigator />
      ) : (
        <DoOnboardingScreen initialName={profile?.nickname || ''} onComplete={handleOnboardingComplete} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: '#b3261e',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});

export default function App() {
  return (
    <AuthProvider>
      <DoThemeProvider>
        <AppGate />
      </DoThemeProvider>
    </AuthProvider>
  );
}
