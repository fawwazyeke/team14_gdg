import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildPalette } from '../theme/doTheme';
import { saveUserPreferences } from '../services/firebaseProfileService';
import { useAuth } from './AuthContext';

const DoThemeContext = createContext(null);

const MOOD_KEY = (uid) => `do_mood:${uid}`;
const MODE_KEY = (uid) => `do_mode:${uid}`;
const MOOD_KEY_ANON = 'do_mood';
const MODE_KEY_ANON = 'do_mode';

export function DoThemeProvider({ children }) {
  const { user, profile } = useAuth();
  const [mood, setMoodState] = useState('dawn');
  const [mode, setModeState] = useState('dark');

  // ── Load preferences ─────────────────────────────────────────
  // When profile loads from Firestore, apply saved mood/mode.
  // On first mount (no user yet), fall back to anonymous AsyncStorage keys.
  useEffect(() => {
    if (profile?.mood || profile?.mode) {
      if (profile.mood) setMoodState(profile.mood);
      if (profile.mode) setModeState(profile.mode);
      return;
    }

    // No profile data yet — read from AsyncStorage (works for guests too)
    const moodKey = user ? MOOD_KEY(user.uid) : MOOD_KEY_ANON;
    const modeKey = user ? MODE_KEY(user.uid) : MODE_KEY_ANON;
    Promise.all([
      AsyncStorage.getItem(moodKey),
      AsyncStorage.getItem(modeKey),
    ]).then(([storedMood, storedMode]) => {
      if (storedMood) setMoodState(storedMood);
      if (storedMode) setModeState(storedMode);
    });
  }, [profile?.mood, profile?.mode, user]);

  // ── Setters with persistence ──────────────────────────────────
  const setMood = async (newMood) => {
    setMoodState(newMood);
    const key = user ? MOOD_KEY(user.uid) : MOOD_KEY_ANON;
    await AsyncStorage.setItem(key, newMood);
    if (user) {
      saveUserPreferences(user.uid, { mood: newMood }).catch(() => {});
    }
  };

  const setMode = async (newMode) => {
    setModeState(newMode);
    const key = user ? MODE_KEY(user.uid) : MODE_KEY_ANON;
    await AsyncStorage.setItem(key, newMode);
    if (user) {
      saveUserPreferences(user.uid, { mode: newMode }).catch(() => {});
    }
  };

  const P = buildPalette(mood, mode);

  return (
    <DoThemeContext.Provider value={{ P, mood, setMood, mode, setMode }}>
      {children}
    </DoThemeContext.Provider>
  );
}

export function useDoTheme() {
  return useContext(DoThemeContext);
}
