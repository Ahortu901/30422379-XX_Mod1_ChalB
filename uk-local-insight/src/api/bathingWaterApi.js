// src/api/bathingWaterApi.js  (FULL - robust list parsing + proxy paths)
import { fetchJson } from "./fetchJson";

// Always via proxy to avoid CORS (vite proxy + Netlify redirect)
const LIST_URL = "https://environment.data.gov.uk/doc/bathing-water.json";


function pickItems(data) {
  return (
    data?.items ||
    data?.result?.items ||
    data?.result?.primaryTopic?.items ||
    data?.result?.primaryTopic?.contains ||
    data?.primaryTopic?.items ||
    data?.primaryTopic?.contains ||
    data?.contains ||
    []
  );
}

function toProxyPath(fullUrl) {
  const u = new URL(fullUrl);
  return "/ea" + u.pathname + u.search;
}

export async function listBathingWaters() {
  const data = await fetchJson(LIST_URL);
  const items = pickItems(data);
  return Array.isArray(items) ? items : [];
}

export async function getBathingWaterDetail(aboutUrl) {
  if (!aboutUrl) throw new Error("Missing bathing water URL");

  // Attempt 1: id resource .json
  const url1 = aboutUrl.endsWith(".json") ? aboutUrl : `${aboutUrl}.json`;

  // Attempt 2: /id/ -> /doc/ + .json
  const url2 = (() => {
    const doc = aboutUrl.replace("/id/", "/doc/");
    return doc.endsWith(".json") ? doc : `${doc}.json`;
  })();

  try {
    return await fetchJson(toProxyPath(url1));
  } catch {
    return await fetchJson(toProxyPath(url2));
  }
}
