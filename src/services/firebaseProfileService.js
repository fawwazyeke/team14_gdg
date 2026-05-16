import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';

import { firebaseDb } from '../config/firebase';
import { apiFetch } from './backendClient';

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
  try {
    return await apiFetch('/users/me');
  } catch (error) {
    if (!String(error.message || '').includes('Profile not found')) {
      throw error;
    }
  }

  try {
    return await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({
        nickname: input.nickname.trim(),
        country: input.country ?? 'unknown',
        language: input.language ?? 'unknown',
        interests: input.interests ?? [],
        communication_style: input.communication_style ?? null,
        age: input.age ?? null,
      }),
    });
  } catch (error) {
    if (!String(error.message || '').includes('Profile already exists')) {
      throw error;
    }
    return apiFetch('/users/me');
  }
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
