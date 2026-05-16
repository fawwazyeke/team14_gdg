import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createAccountWithEmail,
  firebaseAuth,
  googleProvider,
  loginWithEmail,
  loginWithGooglePopup,
  logoutFromFirebase,
} from '../config/firebase';
import {
  clearPendingProfile,
  getPendingProfile,
  getUserProfile,
  nicknameFromEmail,
  savePendingProfile,
  saveUserProfile,
  userStorageKeys,
} from '../services/firebaseProfileService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileNotice, setProfileNotice] = useState('');

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser);
      setProfileNotice('');

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const remoteProfile = await withTimeout(getUserProfile(nextUser.uid), 3000);
        const pendingProfile = await getPendingProfile(nextUser.uid);

        if (pendingProfile) {
          await saveUserProfile({
            ...pendingProfile,
            uid: nextUser.uid,
            email: nextUser.email,
            photoURL: nextUser.photoURL,
          });
          await clearPendingProfile(nextUser.uid);
        }

        const resolved = remoteProfile || pendingProfile;
        if (resolved?.nickname) {
          AsyncStorage.setItem(userStorageKeys(nextUser.uid).name, resolved.nickname).catch(() => {});
        }
        setProfile(resolved);
      } catch {
        const pendingProfile = await getPendingProfile(nextUser.uid);
        if (pendingProfile) {
          setProfile(pendingProfile);
        } else {
          // Firestore unreachable and no pending profile — use locally cached nickname so the user isn't asked again
          const cachedName = await AsyncStorage.getItem(userStorageKeys(nextUser.uid).name).catch(() => null);
          setProfile(cachedName ? { uid: nextUser.uid, nickname: cachedName, email: nextUser.email } : null);
        }
        setProfileNotice('Firestore is not reachable right now. Do will keep your profile locally and sync later.');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      profileNotice,
      needsProfile: Boolean(user && !profile?.nickname),
      async signIn(email, password) {
        await loginWithEmail(firebaseAuth, email.trim(), password);
      },
      async signUp(email, password) {
        await createAccountWithEmail(firebaseAuth, email.trim(), password);
      },
      async signInWithGoogle() {
        await loginWithGooglePopup(firebaseAuth, googleProvider);
      },
      async signOut() {
        await logoutFromFirebase(firebaseAuth);
      },
      async completeProfile(nickname, extras = {}) {
        if (!user) {
          throw new Error('Sign in before saving a profile.');
        }

        const profileInput = {
          uid: user.uid,
          nickname: nickname.trim() || nicknameFromEmail(user.email),
          email: user.email,
          photoURL: user.photoURL,
          interests: extras.interests ?? profile?.interests ?? [],
        };

        // Always persist nickname locally so Firestore downtime doesn't re-prompt the user
        AsyncStorage.setItem(userStorageKeys(user.uid).name, profileInput.nickname).catch(() => {});

        try {
          const savedProfile = await withTimeout(saveUserProfile(profileInput), 3000);
          await clearPendingProfile(user.uid);
          setProfile({ ...profileInput, ...savedProfile });
        } catch {
          await savePendingProfile(profileInput);
          setProfile(profileInput);
          setProfileNotice('Saved locally. It will sync when Firestore is reachable.');
        }
      },
    }),
    [loading, profile, profileNotice, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firebase request timed out')), timeoutMs);
    }),
  ]);
}
