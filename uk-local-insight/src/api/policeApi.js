// src/api/policeApi.js
import { fetchJson } from "./fetchJson";

const BASE = "https://data.police.uk/api";

export async function getCrimeCategories(dateYYYYMM) {
  return await fetchJson(`${BASE}/crime-categories?date=${encodeURIComponent(dateYYYYMM)}`);
}

export async function getCrimesAtLocation({ lat, lng, dateYYYYMM, category }) {
  const cat = category || "all-crime";
  return await fetchJson(
    `${BASE}/crimes-street/${encodeURIComponent(cat)}?lat=${lat}&lng=${lng}&date=${encodeURIComponent(dateYYYYMM)}`
  );
}

// IMPORTANT: outcomes-for-crime expects persistent_id (often null for some street-crime records)
export async function getOutcomesForCrimePersistentId(persistentId) {
  return await fetchJson(`${BASE}/outcomes-for-crime/${encodeURIComponent(persistentId)}`);
}
