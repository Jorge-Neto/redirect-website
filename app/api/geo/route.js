import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const GLOBAL_TIMEOUT_MS = 8000;
const PROVIDER_TIMEOUT_MS = 3000;
const MAXMIND_USER = process.env.MAXMIND_ACCOUNT_ID || null;
const MAXMIND_KEY = process.env.MAXMIND_LICENSE_KEY || null;

async function fetchWithTimeout(url, opts = {}, timeout = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, { ...opts, signal: controller.signal, cache: "no-store" });
    clearTimeout(id);
    return resp;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function GET(request) {
  const startTs = Date.now();

  const headersList = await headers();
  let ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null;
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

  if (!ip || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.')) {
    return NextResponse.json({
      city: "Localhost / LAN",
      region: "Dev Environment",
      country: "Debug Mode",
      country_code: "DBG",
      latitude: -25.42,
      longitude: -49.27,
      source: "local_detection_fallback",
      ip_detected: ip || "unknown",
      provider_results: [],
      normalized: {}
    });
  }

  const providers = [
    { name: 'maxmind', url: `https://geoip.maxmind.com/geoip/v2.1/city/${ip}`, backendOnly: true },
    { name: 'ipapi_co', url: `https://ipapi.co/${ip}/json/` },
    { name: 'ip_api_com', url: `http://ip-api.com/json/${ip}` },
    { name: 'ipinfo_io', url: `https://ipinfo.io/${ip}/json` }
  ];

  const provider_results = [];
  let normalized = {
    city: null,
    region: null,
    country: null,
    country_code: null,
    latitude: null,
    longitude: null,
    timezone: null,
    source_chain: []
  };

  for (const p of providers) {
    if (p.backendOnly && (!MAXMIND_USER || !MAXMIND_KEY)) {
      continue;
    }

    if (Date.now() - startTs > GLOBAL_TIMEOUT_MS) break;

    try {
      let fetchOpts = {};
      if (p.name === 'maxmind') {
        const auth = Buffer.from(`${MAXMIND_USER}:${MAXMIND_KEY}`).toString('base64');
        fetchOpts.headers = { Authorization: `Basic ${auth}` };
      }

      const resp = await fetchWithTimeout(p.url, fetchOpts, PROVIDER_TIMEOUT_MS);
      if (!resp || !resp.ok) {
        provider_results.push({
          source: p.name,
          ok: false,
          status: resp ? resp.status : 'no_response'
        });
        continue;
      }

      const data = await resp.json();
      provider_results.push({ source: p.name, ok: true, raw: data });

      const trySet = (field, value) => {
        if ((normalized[field] === null || normalized[field] === undefined) && value != null) {
          normalized[field] = value;
          normalized.source_chain.push(`${p.name}:${field}`);
        }
      };

      if (p.name === 'maxmind') {
        trySet('city', data.city?.names?.en);
        trySet('region', data.subdivisions?.[0]?.names?.en);
        trySet('country', data.country?.names?.en);
        trySet('country_code', data.country?.iso_code);
        trySet('latitude', data.location?.latitude);
        trySet('longitude', data.location?.longitude);
        trySet('timezone', data.location?.time_zone);
      } else if (p.name === 'ipapi_co') {
        trySet('city', data.city);
        trySet('region', data.region);
        trySet('country', data.country_name);
        trySet('country_code', data.country_code);
        trySet('latitude', data.latitude);
        trySet('longitude', data.longitude);
        trySet('timezone', data.timezone);
      } else if (p.name === 'ip_api_com') {
        if (data.status !== 'fail') {
          trySet('city', data.city);
          trySet('region', data.regionName);
          trySet('country', data.country);
          trySet('country_code', data.countryCode);
          trySet('latitude', data.lat);
          trySet('longitude', data.lon);
          trySet('timezone', data.timezone);
        } else {
          provider_results[provider_results.length - 1].ok = false;
          provider_results[provider_results.length - 1].raw = data;
        }
      } else if (p.name === 'ipinfo_io') {
        trySet('city', data.city);
        trySet('region', data.region);
        trySet('country', data.country);
        if (data.loc) {
          const [lat, lon] = String(data.loc).split(',');
          trySet('latitude', parseFloat(lat));
          trySet('longitude', parseFloat(lon));
        }
        trySet('timezone', data.timezone);
      }

      if (normalized.city && normalized.latitude && normalized.longitude) {
        // break;
      }

    } catch (err) {
      provider_results.push({ source: p.name, ok: false, error: String(err) });
      console.warn(`Erro provedor ${p.name}:`, err);
      continue;
    }
  }

  const anyOk = provider_results.some(r => r.ok);
  if (!anyOk) {
    return NextResponse.json({ error: "All geo services failed", provider_results }, { status: 502 });
  }

  const result = {
    ip_detected: ip,
    normalized,
    provider_results,
    _timestamp: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
