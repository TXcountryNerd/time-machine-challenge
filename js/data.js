// Loads the player bank. Relative URL so it works under /time-machine-challenge/.
export const ERAS = ['80s', '90s', '00s', '10s', '20s'];
export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

let cache = null;

export async function loadPlayers(url = new URL('../data/players.json', import.meta.url)) {
  if (cache) return cache;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load players.json (${res.status})`);
  const data = await res.json();
  const byId = new Map(data.cards.map((c) => [c.id, c]));
  cache = { ...data, byId };
  return cache;
}

export function cell(cards, era, pos) {
  return cards.filter((c) => c.era === era && c.pos === pos).sort((a, b) => b.ovr - a.ovr);
}
