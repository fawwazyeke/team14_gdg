const MISSION_POOL = [
  {
    id: 'm1',
    title: 'Say hello to a neighbor',
    description: "A simple greeting can brighten someone's day — and yours.",
    xp: 10,
  },
  {
    id: 'm2',
    title: 'Join an online community',
    description: 'Find a subreddit, Discord server, or forum around a hobby you enjoy.',
    xp: 20,
  },
  {
    id: 'm3',
    title: 'Send a voice message',
    description: "Reach out to a friend or family member you haven't spoken to in a while.",
    xp: 15,
  },
  {
    id: 'm4',
    title: 'Attend a local event',
    description: "Check the Events tab and RSVP to something that sparks your interest.",
    xp: 30,
  },
  {
    id: 'm5',
    title: 'Share something you love',
    description: 'Post about a book, show, or song that has meant something to you recently.',
    xp: 10,
  },
  {
    id: 'm6',
    title: 'Plan a coffee meetup',
    description: "Send a message to someone you'd like to catch up with.",
    xp: 25,
  },
  {
    id: 'm7',
    title: 'Take a walk in a busy area',
    description: 'Being around people, even without interacting, can ease loneliness.',
    xp: 10,
  },
  {
    id: 'm8',
    title: 'Try a group class',
    description: 'Yoga, cooking, language, art — find a local class and sign up this week.',
    xp: 30,
  },
  {
    id: 'm9',
    title: 'Compliment a stranger',
    description: 'One genuine compliment can open a door to a new connection.',
    xp: 15,
  },
  {
    id: 'm10',
    title: 'Cook a meal for someone',
    description: 'Food is one of the oldest ways humans bond. Who can you cook for today?',
    xp: 25,
  },
];

/**
 * Returns 3 daily missions.
 * TODO: Replace with server-generated, personalized missions based on user interests.
 *
 * @returns {Promise<Array>} - Array of 3 mission objects
 */
export async function getDailyMissions() {
  await new Promise(resolve => setTimeout(resolve, 300));
  const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
