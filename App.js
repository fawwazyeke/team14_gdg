import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { userStorageKeys } from './src/services/firebaseProfileService';
import { createBackendProfile, submitOnboardingSurvey } from './src/services/onboardingSurveyService';
import { colors } from './src/theme/colors';

function AppGate() {
  const { user, profile, loading, needsProfile, completeProfile } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState(null);

  useEffect(() => {
    if (!user || needsProfile) {
      setHasOnboarded(null);
      return;
    }

    AsyncStorage.getItem(userStorageKeys(user.uid).onboarded).then((val) => {
      setHasOnboarded(val === 'true');
    });
  }, [needsProfile, user]);

  const handleOnboardingComplete = async ({ name, interests, surveyAnswers }) => {
    if (!user) {
      return;
    }

    const keys = userStorageKeys(user.uid);
    await AsyncStorage.multiSet([
      [keys.name, name.trim()],
      [keys.interests, JSON.stringify(interests)],
      [keys.onboarded, 'true'],
    ]);
    await completeProfile(name, { interests });
    await createBackendProfile({ nickname: name, interests });
    await submitOnboardingSurvey(surveyAnswers);
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
      {!user || needsProfile ? (
        <LoginScreen />
      ) : hasOnboarded ? (
        <AppNavigator />
      ) : (
        <OnboardingScreen initialName={profile?.nickname || ''} onComplete={handleOnboardingComplete} />
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
