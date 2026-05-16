import { apiFetch } from './backendClient';

export async function getChatMemory() {
  const data = await apiFetch('/ai/chat/memory');
  return Array.isArray(data.history) ? data.history : [];
}

export async function sendMessage(userText, conversationHistory = [], userProfile = {}) {
  const data = await apiFetch('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message: userText }),
  });

  const text =
    data.reply ||
    data.message ||
    (typeof data === 'string' ? data : 'I hear you. Tell me more.');

  return {
    _id: Math.round(Math.random() * 1_000_000),
    text,
    createdAt: new Date(),
    user: {
      _id: 2,
      name: 'Companion',
      avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png',
    },
  };
}
