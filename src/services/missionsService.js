import { apiFetch } from './backendClient';

export async function getDailyMissions() {
  const data = await apiFetch('/missions');
  const list = Array.isArray(data) ? data : [];
  return list
    .filter((m) => m.status === 'pending')
    .slice(0, 3)
    .map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      xp: m.stability_delta ?? 0,
      verificationType: m.verification_type || null,
      isAiGenerated: m.is_ai_generated || false,
    }));
}

export async function completeMission(missionId, { text, imageUrl } = {}) {
  return apiFetch(`/missions/${missionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ text: text || null, image_url: imageUrl || null }),
  });
}
