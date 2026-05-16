import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DoThemeProvider } from './src/context/DoThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import DoLoginScreen from './src/screens/DoLoginScreen';
import DoOnboardingScreen from './src/screens/DoOnboardingScreen';
import { userStorageKeys } from './src/services/firebaseProfileService';
import { ensureBackendProfile, submitOnboardingSurvey } from './src/services/onboardingSurveyService';
import { colors } from './src/theme/colors';

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
        // Interests set means onboarding was completed (possibly on another device)
        AsyncStorage.setItem(userStorageKeys(user.uid).onboarded, 'true');
        setHasOnboarded(true);
      } else {
        setHasOnboarded(false);
      }
    });
  }, [needsProfile, profile, user]);

  // Ensure backend profile exists whenever the user reaches the main app.
  // ensureBackendProfile is idempotent — safe to call every login.
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

  if (loading || (user && !needsProfile && hasOnboarded === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <FirebaseErrorBanner />
      {!user || needsProfile ? (
        <DoLoginScreen />
      ) : hasOnboarded ? (
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
