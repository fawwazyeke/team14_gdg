const MOCK_EVENTS = [
  {
    id: '1',
    title: 'Weekend Jogging Club',
    category: 'sports',
    date: 'Sat, 9:00 AM',
    location: 'Central Park',
    description: 'A friendly group run for all fitness levels. No experience needed!',
    emoji: '🏃',
  },
  {
    id: '2',
    title: 'Board Game Night',
    category: 'games',
    date: 'Tue, 7:00 PM',
    location: 'Geeky Cafe',
    description: 'Bring your friends or come solo and make new ones!',
    emoji: '🎲',
  },
  {
    id: '3',
    title: 'Indie Rock Live Show',
    category: 'music',
    date: 'Fri, 8:00 PM',
    location: 'The Basement',
    description: 'Three local bands playing original music. Entry is free.',
    emoji: '🎸',
  },
  {
    id: '4',
    title: 'Photography Walk',
    category: 'art',
    date: 'Sun, 10:00 AM',
    location: 'Riverside',
    description: 'Explore the city through your lens with a small group.',
    emoji: '📷',
  },
  {
    id: '5',
    title: 'Soccer Watch Party',
    category: 'sports',
    date: 'Wed, 6:00 PM',
    location: "O'Brien's Pub",
    description: "Champions League semifinal — free snacks, great crowd.",
    emoji: '⚽',
  },
  {
    id: '6',
    title: 'Trivia Night',
    category: 'games',
    date: 'Thu, 8:00 PM',
    location: 'The Library Bar',
    description: 'Test your knowledge and meet curious people.',
    emoji: '🧠',
  },
  {
    id: '7',
    title: 'Open Mic Night',
    category: 'music',
    date: 'Sat, 7:00 PM',
    location: 'The Loft',
    description: 'Perform or just enjoy — all genres welcome.',
    emoji: '🎤',
  },
  {
    id: '8',
    title: 'Watercolor Workshop',
    category: 'art',
    date: 'Sun, 2:00 PM',
    location: 'Community Center',
    description: 'Learn the basics of watercolor in a relaxed group setting.',
    emoji: '🎨',
  },
];

export const EVENT_CATEGORIES = ['All', 'Sports', 'Games', 'Music', 'Art'];

/**
 * Fetches the list of curated events.
 * TODO: Replace with real backend / scraped data API call.
 *
 * @returns {Promise<Array>} - List of event objects
 */
export async function getEvents() {
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_EVENTS;
}
