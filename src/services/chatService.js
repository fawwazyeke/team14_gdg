const MOCK_RESPONSES = [
  "That sounds tough. Would it help to share more about what's on your mind?",
  "I hear you. Small steps forward are still steps. Have you checked today's missions?",
  "Connecting with others can feel hard at first, but you're doing great by being here.",
  "Did you know there's a board game night happening this week? Check the Events tab!",
  "You're not alone. Many people feel this way. What's one small thing that brought you joy recently?",
  "It takes courage to reach out. I'm here to listen whenever you need it.",
  "Have you thought about joining a local group around something you enjoy?",
  "Remember: every strong friendship started with a single conversation, just like this one.",
];

/**
 * Sends a user message and returns a bot response.
 * TODO: Replace with real AI API call (e.g., Claude API).
 *
 * @param {string} userText - The user's message text
 * @returns {Promise<object>} - A GiftedChat-compatible message object
 */
export async function sendMessage(userText) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

  const text = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];

  return {
    _id: Math.round(Math.random() * 1000000),
    text,
    createdAt: new Date(),
    user: {
      _id: 2,
      name: 'Companion',
      avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png',
    },
  };
}
