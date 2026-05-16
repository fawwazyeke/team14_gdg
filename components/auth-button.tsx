"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import { clearPendingProfile, getPendingProfile, getUserProfile, saveUserProfile, type UserProfile } from "@/lib/firebase/profile";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setReady(true);
        return;
      }

      try {
        const remoteProfile = await getUserProfile(nextUser.uid);
        if (remoteProfile) {
          setProfile(remoteProfile);
          clearPendingProfile(nextUser.uid);
        } else {
          setProfile(getPendingProfile(nextUser.uid));
        }
      } catch {
        setProfile(getPendingProfile(nextUser.uid));
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const pendingProfile = getPendingProfile(user.uid);
    if (!pendingProfile) {
      return;
    }

    void saveUserProfile({
      uid: user.uid,
      nickname: pendingProfile.nickname,
      email: pendingProfile.email,
      photoURL: pendingProfile.photoURL
    })
      .then(() => clearPendingProfile(user.uid))
      .catch(() => undefined);
  }, [user]);

  if (!ready) {
    return <span className="auth-state">Checking</span>;
  }

  if (!user) {
    return (
      <Link className="auth-link" href="/login">
        Sign in
      </Link>
    );
  }

  return (
    <div className="auth-menu">
      <span>{profile?.nickname || user.displayName || user.email || "Signed in"}</span>
      <button onClick={() => signOut(firebaseAuth)} type="button">
        Sign out
      </button>
    </div>
  );
}
