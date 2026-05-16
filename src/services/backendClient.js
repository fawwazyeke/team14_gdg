import { firebaseAuth } from '../config/firebase';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Get the current user's Firebase ID token.
 * - Does NOT force-refresh (uses cached token when valid — avoids network failures)
 * - Waits up to 5 s for auth state to restore from AsyncStorage on first load
 * - Falls back gracefully if unauthenticated
 */
async function getAuthToken() {
  // Happy path: user already restored from storage
  if (firebaseAuth.currentUser) {
    try {
      return await firebaseAuth.currentUser.getIdToken(false);
    } catch (e) {
      console.warn('[auth] getIdToken failed, retrying without cache:', e?.code);
      try {
        return await firebaseAuth.currentUser.getIdToken(true);
      } catch (e2) {
        console.warn('[auth] force-refresh also failed:', e2?.code);
        return null;
      }
    }
  }

  // Auth state not restored yet — wait for onAuthStateChanged (max 5 s)
  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsub();
      console.warn('[auth] Timed out waiting for auth state. Proceeding without token.');
      resolve(null);
    }, 5000);

    const unsub = firebaseAuth.onAuthStateChanged(async (user) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub();

      if (!user) {
        resolve(null);
        return;
      }

      try {
        const token = await user.getIdToken(false);
        resolve(token);
      } catch (e) {
        console.warn('[auth] getIdToken in onAuthStateChanged failed:', e?.code);
        resolve(null);
      }
    });
  });
}

export async function apiFetch(path, options = {}) {
  const token = await getAuthToken();

  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    // Don't bother hitting the server if we have no token — it will just 401
    throw new Error('Not authenticated. Please sign in again.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(readErrorMessage(message, response.status));
  }

  return response.json();
}

function readErrorMessage(message, status) {
  if (!message) {
    return `API request failed with ${status}`;
  }
  try {
    const parsed = JSON.parse(message);
    if (parsed.detail) {
      return typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
    }
  } catch {
    return message;
  }
  return message;
}
