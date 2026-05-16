import { apiFetch } from './backendClient';

export async function getSuggestedFriends() {
  return apiFetch('/friends/suggested');
}

export async function sendFriendRequest(targetUid) {
  return apiFetch(`/friends/request/${targetUid}`, { method: 'POST' });
}

export async function acceptFriendRequest(fromUid) {
  return apiFetch(`/friends/accept/${fromUid}`, { method: 'POST' });
}

export async function rejectFriendRequest(fromUid) {
  return apiFetch(`/friends/reject/${fromUid}`, { method: 'POST' });
}

export async function getFriends() {
  return apiFetch('/friends');
}

export async function getPendingRequests() {
  return apiFetch('/friends/pending');
}
