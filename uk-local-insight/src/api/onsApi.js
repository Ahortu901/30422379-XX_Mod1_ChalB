import { fetchJson } from "./fetchJson";

const BASE = "https://api.beta.ons.gov.uk/v1";

export async function listDatasets() {
  const data = await fetchJson(`${BASE}/datasets`);
  return data?.items ?? [];
}

export async function getDataset(datasetId) {
  return await fetchJson(`${BASE}/datasets/${encodeURIComponent(datasetId)}`);
}

export function getLatestVersionHref(datasetObj) {
  const href = datasetObj?.links?.latest_version?.href;
  if (!href) return null;
  return href.startsWith("http") ? href : `https://api.beta.ons.gov.uk${href}`;
}

export async function getVersionByHref(href) {
  return await fetchJson(href);
}

export async function getDimensions({ datasetId, edition, version }) {
  const url = `${BASE}/datasets/${datasetId}/editions/${edition}/versions/${version}/dimensions`;
  const data = await fetchJson(url);
  return data?.items ?? [];
}

export async function getDimensionOptions({ datasetId, edition, version, dimension, limit = 50, offset = 0 }) {
  const url = `${BASE}/datasets/${datasetId}/editions/${edition}/versions/${version}/dimensions/${dimension}/options?limit=${limit}&offset=${offset}`;
  const data = await fetchJson(url);
  return data?.items ?? [];
}

export async function getObservations({ datasetId, edition, version, selections }) {
  // selections: { [dimensionName]: optionId }
  const params = new URLSearchParams();
  Object.entries(selections || {}).forEach(([dim, opt]) => {
    if (opt) params.set(dim, opt);
  });

  const url = `${BASE}/datasets/${datasetId}/editions/${edition}/versions/${version}/observations?${params.toString()}`;
  const data = await fetchJson(url);
  return data?.observations ?? data?.items ?? data ?? null;
}
