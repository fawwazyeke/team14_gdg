import { firebaseAuth } from '../config/firebase';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

export async function apiFetch(path, options = {}) {
  const token = await firebaseAuth.currentUser?.getIdToken(true);
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
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
