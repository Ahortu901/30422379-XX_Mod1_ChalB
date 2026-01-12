export async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15_000;
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Request failed (${res.status}) ${text.slice(0, 200)}`);
    }

    // Some EA endpoints return JSON with content-type json; safe:
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}
