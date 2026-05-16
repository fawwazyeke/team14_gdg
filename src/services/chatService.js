import { apiFetch } from './backendClient';

export async function sendMessage(userText, conversationHistory = [], userProfile = {}) {
  const data = await apiFetch('/chat/ai', {
    method: 'POST',
    body: JSON.stringify({
      user_id: 1,
      message: userText,
      conversation_history: conversationHistory,
      user_profile: userProfile,
    }),
  });

  const response = data.ai_response || {};
  const text =
    response.reply ||
    response.message ||
    response.text ||
    (typeof response === 'string' ? response : 'I hear you. Tell me more.');

  return {
    _id: data.message_id || Math.round(Math.random() * 1_000_000),
    text,
    createdAt: new Date(),
    user: {
      _id: 2,
      name: 'Companion',
      avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png',
    },
  };
}
