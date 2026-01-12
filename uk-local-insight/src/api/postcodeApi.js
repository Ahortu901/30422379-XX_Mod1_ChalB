import { fetchJson } from "./fetchJson";

export async function lookupPostcode(postcode) {
  const cleaned = postcode.trim();
  const data = await fetchJson(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`
  );
  if (!data?.result) throw new Error("No postcode result found.");
  return {
    postcode: data.result.postcode,
    lat: data.result.latitude,
    lng: data.result.longitude,
    district: data.result.admin_district,
    region: data.result.region,
  };
}
