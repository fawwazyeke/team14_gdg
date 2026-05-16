import { apiFetch } from './backendClient';

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
