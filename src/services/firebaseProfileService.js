import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { firebaseDb } from '../config/firebase';

const USER_PROFILES_COLLECTION = 'user_profiles';

export const userStorageKeys = (uid) => ({
  onboarded: `has_onboarded:${uid}`,
  name: `user_name:${uid}`,
  interests: `user_interests:${uid}`,
  pendingProfile: `do_pending_profile:${uid}`,
});

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(firebaseDb, USER_PROFILES_COLLECTION, uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveUserProfile(input) {
  const ref = doc(firebaseDb, USER_PROFILES_COLLECTION, input.uid);
  const snapshot = await getDoc(ref);
  const data = {
    uid: input.uid,
    nickname: input.nickname.trim(),
    country: input.country ?? 'unknown',
    language: input.language ?? 'unknown',
    email: input.email ?? null,
    photoURL: input.photoURL ?? null,
    interests: input.interests ?? [],
    communication_style: input.communication_style ?? null,
    stability_score: input.stability_score ?? 0,
    stage: input.stage ?? 'AI_START',
    streak_count: input.streak_count ?? 0,
    last_activity_date: input.last_activity_date ?? null,
    score_bar_visible: input.score_bar_visible ?? false,
    ai_penalty_count: input.ai_penalty_count ?? 0,
    user_penalty_count: input.user_penalty_count ?? 0,
    user_warning_given: input.user_warning_given ?? false,
    updated_at: serverTimestamp(),
  };

  if (!snapshot.exists()) {
    data.created_at = serverTimestamp();
  }

  await setDoc(ref, data, { merge: true });
  return data;
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
