import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { colors } from './src/theme/colors';

export default function App() {
  // null = still loading from storage
  const [hasOnboarded, setHasOnboarded] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('has_onboarded').then(val => {
      setHasOnboarded(val === 'true');
    });
  }, []);

  if (hasOnboarded === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {hasOnboarded
        ? <AppNavigator />
        : <OnboardingScreen onComplete={() => setHasOnboarded(true)} />
      }
    </SafeAreaProvider>
  );
}
