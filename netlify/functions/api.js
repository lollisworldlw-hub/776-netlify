// netlify/functions/api.js

export async function handler(event) {
  // 1) Let browsers do preflight safely (some Android WebViews are picky)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  // 2) Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Use POST" }),
    };
  }

  try {
    // 3) Read JSON from Netlify request
    const body = event.body ? JSON.parse(event.body) : {};
    const { action } = body;

    if (!action) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Missing action" }),
      };
    }

    // 4) Send to Google Apps Script Web App
    const GAS_URL = "https://script.google.com/macros/s/AKfycbz4ackhnUqtXg-ZgcoByzHPs1lVwkzXVsS3UiyiQSm-9a1Z34ub88YF0vzrk6m6FPq8CA/exec";
    
    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // GAS always returns text; parse it safely
    const text = await gasRes.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { ok: false, error: "GAS did not return JSON", raw: text };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // same-origin call from your Netlify page doesn't need this,
        // but keeping it doesn't hurt and helps odd webviews.
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(json),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: err?.message || String(err) }),
    };
  }
}
