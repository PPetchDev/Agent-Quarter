const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getHistory(characterId: string) {
  const res = await fetch(`${BASE}/api/conversations/${characterId}/history`);
  if (!res.ok) return [];
  return res.json() as Promise<Array<{ id: string; role: string; content: string; mood?: string; createdAt: string }>>;
}

export async function getCharacters() {
  const res = await fetch(`${BASE}/api/characters`);
  if (!res.ok) throw new Error('Failed to fetch characters');
  return res.json();
}
