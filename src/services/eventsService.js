import { apiFetch } from './backendClient';

// ── Participation ─────────────────────────────────────────────────────────────

export async function joinEvent(event) {
  return apiFetch(`/events/${event.id}/join`, {
    method: 'POST',
    body: JSON.stringify({
      event_title: event.title,
      event_start_at: event.startAt,
      event_city: event.city || '',
    }),
  });
}

export async function unjoinEvent(eventId) {
  return apiFetch(`/events/${eventId}/join`, { method: 'DELETE' });
}

export async function getMyEvents() {
  return apiFetch('/events/my');
}

// ── Feedback chat ─────────────────────────────────────────────────────────────

export async function sendFeedbackMessage(eventId, message) {
  return apiFetch(`/events/${eventId}/feedback/message`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function completeFeedback(eventId) {
  return apiFetch(`/events/${eventId}/feedback/complete`, { method: 'POST' });
}

export async function getFeedbackMessages(eventId) {
  return apiFetch(`/events/${eventId}/feedback/messages`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if the event's start time is in the past. */
export function eventHasPassed(startAt) {
  if (!startAt) return false;
  return new Date(startAt) < new Date();
}

export const EVENT_CATEGORIES = [
  'All',
  'Language Exchange',
  'Games & Hobbies',
  'Outdoor & Sports',
  'Food & Cafe',
  'Culture',
  'Tech & Learning',
  'Community Events',
];

export async function getEvents({ city, category } = {}) {
  const params = new URLSearchParams({
    min_social_score: '3',
  });

  if (city) {
    params.set('city', city);
  }
  if (category && category !== 'All') {
    params.set('category', category);
  }

  const events = await apiFetch(`/events?${params.toString()}`);
  return events.map(normalizeEventForApp);
}

function normalizeEventForApp(event) {
  const date = formatDate(event.start_at);
  const location = event.venue_name || event.address || cityLabel(event.city);

  return {
    id: event.id,
    title: event.title,
    category: event.category,
    date,
    startAt: event.start_at,   // raw ISO — used for "has event passed?" check
    location,
    description: event.summary || event.social_reason || event.description,
    emoji: categoryEmoji(event.category),
    city: event.city,
    sourceUrl: event.source_url,
    socialScore: event.social_score,
    socialReason: event.social_reason,
  };
}

function formatDate(value) {
  if (!value) {
    return 'Date TBA';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function cityLabel(city) {
  if (city === 'seoul') {
    return 'Seoul';
  }
  if (city === 'tokyo') {
    return 'Tokyo';
  }
  return 'Location TBA';
}

function categoryEmoji(category) {
  const normalized = category.toLowerCase();
  if (normalized.includes('language')) return '💬';
  if (normalized.includes('game')) return '🎲';
  if (normalized.includes('outdoor') || normalized.includes('sport')) return '🌿';
  if (normalized.includes('food') || normalized.includes('cafe')) return '☕';
  if (normalized.includes('culture')) return '🏛️';
  if (normalized.includes('tech')) return '💡';
  return '📍';
}
