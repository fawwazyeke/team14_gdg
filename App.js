import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DoThemeProvider } from './src/context/DoThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
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

  useEffect(() => {
    if (!user || needsProfile) {
      setHasOnboarded(null);
      return;
    }

    AsyncStorage.getItem(userStorageKeys(user.uid).onboarded).then((val) => {
      if (val === 'true') {
        setHasOnboarded(true);
      } else if (profile?.nickname) {
        // Profile already exists in Firestore — user has onboarded on another device or AsyncStorage was cleared
        AsyncStorage.setItem(userStorageKeys(user.uid).onboarded, 'true');
        setHasOnboarded(true);
      } else {
        setHasOnboarded(false);
      }
    });
  }, [needsProfile, profile, user]);

  const handleOnboardingComplete = async ({ name, interests, surveyAnswers }) => {
    if (!user) {
      return;
    }

    await completeProfile(name, { interests });

    try {
      await ensureBackendProfile({ nickname: name, interests });
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
        <LoginScreen />
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
