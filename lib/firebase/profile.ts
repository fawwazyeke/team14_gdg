import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseDb } from "./client";

export type UserProfile = {
  uid: string;
  nickname: string;
  email: string | null;
  photoURL: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function getUserProfile(uid: string) {
  const snapshot = await getDoc(doc(firebaseDb, "users", uid));
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

export async function saveUserProfile(input: {
  uid: string;
  nickname: string;
  email: string | null;
  photoURL: string | null;
}) {
  const nickname = input.nickname.trim();

  await setDoc(
    doc(firebaseDb, "users", input.uid),
    {
      uid: input.uid,
      nickname,
      email: input.email,
      photoURL: input.photoURL,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
}

export function profileStorageKey(uid: string) {
  return `do_pending_profile_${uid}`;
}

export function savePendingProfile(input: {
  uid: string;
  nickname: string;
  email: string | null;
  photoURL: string | null;
}) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    profileStorageKey(input.uid),
    JSON.stringify({
      uid: input.uid,
      nickname: input.nickname.trim(),
      email: input.email,
      photoURL: input.photoURL
    })
  );
}

export function getPendingProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(profileStorageKey(uid));
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as UserProfile;
  } catch {
    return null;
  }
}

export function clearPendingProfile(uid: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(profileStorageKey(uid));
}
