import { fetchJson } from "./fetchJson";

const BASE = "https://environment.data.gov.uk/flood-monitoring";

export async function getStationsNear({ lat, lng, dist = 15000 }) {
  const url = `${BASE}/id/stations?lat=${lat}&long=${lng}&dist=${dist}`;
  const data = await fetchJson(url);
  return data?.items ?? [];
}

export async function getMeasuresForStation(stationId) {
  const url = `${BASE}/id/stations/${encodeURIComponent(stationId)}/measures`;
  const data = await fetchJson(url);
  return data?.items ?? [];
}

export async function getLatestReadingForMeasure(measureId) {
  const url = `${BASE}/id/measures/${encodeURIComponent(measureId)}/readings?latest`;
  const data = await fetchJson(url);
  return data?.items?.[0] ?? null;
}

export async function getFloodsNear({ lat, lng, dist = 15000 }) {
  const url = `${BASE}/id/floods?lat=${lat}&long=${lng}&dist=${dist}`;
  const data = await fetchJson(url);
  return data?.items ?? [];
}
