import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import {
  createAccountWithEmail,
  firebaseAuth,
  loginWithEmail,
  logoutFromFirebase,
} from '../config/firebase';
import {
  clearPendingProfile,
  getPendingProfile,
  getUserProfile,
  nicknameFromEmail,
  savePendingProfile,
  saveUserProfile,
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

        setProfile(remoteProfile || pendingProfile);
      } catch {
        const pendingProfile = await getPendingProfile(nextUser.uid);
        setProfile(pendingProfile);
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
