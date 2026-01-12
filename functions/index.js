const functions = require("firebase-functions");
const fetch = require("node-fetch");

exports.eaProxy = functions.https.onRequest(async (req, res) => {
  try {
    // remove "/ea" prefix
    const path = req.originalUrl.replace(/^\/ea/, "");
    const targetUrl = "https://environment.data.gov.uk" + path;

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        // pass through basic headers
        accept: req.headers.accept || "application/json",
        "user-agent": "uk-local-insight/1.0"
      }
    });

    res.status(upstream.status);

    // forward safe headers
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (!["connection", "transfer-encoding"].includes(k)) {
        res.setHeader(key, value);
      }
    });

    const body = await upstream.text();
    res.send(body);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
