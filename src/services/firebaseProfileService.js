import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { firebaseDb } from '../config/firebase';

export const userStorageKeys = (uid) => ({
  onboarded: `has_onboarded:${uid}`,
  name: `user_name:${uid}`,
  interests: `user_interests:${uid}`,
  pendingProfile: `do_pending_profile:${uid}`,
  language: `do_language`,        // global key — one device, one language preference
  mood: `do_mood:${uid}`,
  mode: `do_mode:${uid}`,
});

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(firebaseDb, 'users', uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveUserProfile(input) {
  const ref = doc(firebaseDb, 'users', input.uid);
  const snapshot = await getDoc(ref);
  const data = {
    uid: input.uid,
    nickname: input.nickname.trim(),
    email: input.email ?? null,
    photoURL: input.photoURL ?? null,
    interests: input.interests ?? [],
    updatedAt: serverTimestamp(),
  };

  if (!snapshot.exists()) {
    data.createdAt = serverTimestamp();
  }

  await setDoc(ref, data, { merge: true });
  return data;
}

/**
 * Merge-only update for non-critical user preferences (language, mood, mode).
 * Won't wipe other profile fields.
 */
export async function saveUserPreferences(uid, prefs = {}) {
  const ref = doc(firebaseDb, 'users', uid);
  await setDoc(ref, { ...prefs, updatedAt: serverTimestamp() }, { merge: true });
}

export async function savePendingProfile(input) {
  const keys = userStorageKeys(input.uid);
  await AsyncStorage.setItem(
    keys.pendingProfile,
    JSON.stringify({
      uid: input.uid,
      nickname: input.nickname.trim(),
      email: input.email ?? null,
      photoURL: input.photoURL ?? null,
      interests: input.interests ?? [],
    })
  );
}

export async function getPendingProfile(uid) {
  const stored = await AsyncStorage.getItem(userStorageKeys(uid).pendingProfile);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export async function clearPendingProfile(uid) {
  await AsyncStorage.removeItem(userStorageKeys(uid).pendingProfile);
}

export function nicknameFromEmail(email) {
  return email?.split('@')[0]?.replace(/[._-]+/g, ' ') || '';
}
