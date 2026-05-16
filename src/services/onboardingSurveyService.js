import { apiFetch } from './backendClient';

export const SURVEY_QUESTIONS = [
  {
    key: 'social_energy',
    prompt: 'What kind of social setting feels easiest right now?',
    options: [
      { label: 'One-on-one', value: 'one_on_one', score: 8 },
      { label: 'Small group', value: 'small_group', score: 10 },
      { label: 'Large group', value: 'large_group', score: 14 },
    ],
  },
  {
    key: 'conversation_comfort',
    prompt: 'How comfortable are you starting a conversation?',
    options: [
      { label: 'I need a prompt', value: 'needs_prompt', score: 6 },
      { label: 'I can try if it is casual', value: 'casual_ok', score: 10 },
      { label: 'I usually start first', value: 'starts_first', score: 15 },
    ],
  },
  {
    key: 'event_readiness',
    prompt: 'Which event would you try this week?',
    options: [
      { label: 'Online or quiet activity', value: 'quiet_activity', score: 6 },
      { label: 'Workshop or hobby meetup', value: 'workshop', score: 12 },
      { label: 'Language exchange or group event', value: 'group_event', score: 18 },
    ],
  },
  {
    key: 'follow_up_confidence',
    prompt: 'After meeting someone, what feels realistic?',
    options: [
      { label: 'Just showing up is enough', value: 'showing_up', score: 5 },
      { label: 'Say thanks before leaving', value: 'say_thanks', score: 9 },
      { label: 'Exchange contact or make a plan', value: 'follow_up', score: 15 },
    ],
  },
];

// Default middle-range answers give ~41 stability points (enough to unlock missions at ≥36).
const DEFAULT_SURVEY_ANSWERS = {
  social_energy: 'small_group',
  conversation_comfort: 'casual_ok',
  event_readiness: 'workshop',
  follow_up_confidence: 'say_thanks',
};

export async function ensureBackendProfile({ nickname, interests, age }) {
  try {
    return await apiFetch('/users/me');
  } catch (error) {
    if (!String(error.message || '').includes('Profile not found')) {
      throw error;
    }
  }

  let created;
  try {
    created = await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({
        nickname,
        country: 'unknown',
        language: 'unknown',
        interests,
        age: age ?? null,
      }),
    });
  } catch (error) {
    if (!String(error.message || '').includes('Profile already exists')) {
      throw error;
    }
    return apiFetch('/users/me');
  }

  // Submit default survey so new users start with a usable stability score.
  try {
    await submitOnboardingSurvey(DEFAULT_SURVEY_ANSWERS);
  } catch (e) {
    console.warn('Default survey submission failed:', e.message);
  }

  return created;
}

export async function submitOnboardingSurvey(answersByQuestion) {
  const answers = SURVEY_QUESTIONS.map((question) => {
    const option = question.options.find((item) => item.value === answersByQuestion[question.key]);
    return {
      question_key: question.key,
      answer: option?.value || '',
      score: option?.score || 0,
    };
  });

  return apiFetch('/survey', {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}
