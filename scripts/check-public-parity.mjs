import assert from "node:assert/strict";

// Release check only: it cannot publish, delete, or update any content.
// Customer, staff, order, reservation, payment, stock and QR endpoints are excluded.
const fields = {
  allergens: ["code", "name"],
  farming: ["slug", "name", "description"],
  cuts: ["slug", "name", "altNames", "anatomy", "zone", "description", "flavour", "texture", "cooking", "ageing", "images", "isDemo", "published", "position"],
  breeds: ["slug", "name", "type", "country", "region", "farmingMethodId", "feeding", "tasting", "marbling", "tenderness", "flavour", "ageing", "certifications", "certVerified", "body", "images", "videoUrl", "available", "isDemo", "published", "position"],
  categories: ["name", "slug", "description", "images", "parentId", "position", "active"],
  products: ["name", "slug", "description", "ingredients", "categoryId", "priceMode", "priceCents", "takeawayPriceCents", "estWeightGrams", "hasCooking", "images", "available", "active", "dailySpecial", "offMenu", "seasonal", "specialty", "recommended", "channels", "breedId", "cutId", "origin", "cutName", "breedName", "farming", "ageing", "cookingNotes", "meatCharacteristics", "pricePending", "pairing", "isDemo", "position"],
  pages: ["slug", "title", "seoTitle", "seoDesc"],
  sections: ["pageId", "type", "position", "enabled", "content"],
  promotions: ["title", "description", "kind", "image", "startsAt", "endsAt", "active", "productIds"],
  media: ["url", "alt", "mime", "gallery", "position"],
  shifts: ["name", "weekdays", "start", "end", "slotMinutes", "maxCovers", "active"],
  closures: ["date", "reason"],
};
const publicSettingKeys = ["brand", "contacts", "ordering", "reservations", "seo", "cooking"];
const sessions = [];
const canonical = value => JSON.stringify(normalize(value));
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]));
  return value;
}
const pick = (object, keys) => Object.fromEntries(keys.filter(key => object[key] !== undefined).map(key => [key, object[key]]));
function project(resource, row) {
  const result = pick(row, fields[resource]);
  if (resource === "breeds") result.cutIds = (row.cuts ?? []).map(x => x.cutId).sort();
  if (resource === "products") {
    result.allergenIds = (row.allergens ?? []).filter(x => !x.traces).map(x => x.allergenId).sort();
    result.traceIds = (row.allergens ?? []).filter(x => x.traces).map(x => x.allergenId).sort();
    result.optionGroups = [...(row.optionGroups ?? [])].sort((a, b) => a.position - b.position).map(group => ({
      name: group.name, minSelect: group.minSelect, maxSelect: group.maxSelect,
      options: (group.options ?? []).map(option => pick(option, ["name", "priceCents", "available"])).sort((a, b) => canonical(a).localeCompare(canonical(b))),
    }));
  }
  return result;
}
async function request(base, path, cookie, body) {
  const response = await fetch(new URL(path, base), {
    method: body ? "POST" : "GET",
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${new URL(base).host} ${path}: HTTP ${response.status}`);
  return { data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
async function readPublicContent(base, password) {
  const login = await request(base, "/api/auth/login", undefined, { password });
  assert.equal(login.data?.role, "SUPER_ADMIN", "Accesso Super Admin richiesto.");
  assert.ok(login.cookie, "Sessione non ricevuta.");
  sessions.push({ base, cookie: login.cookie });
  const content = {};
  const resources = Object.keys(fields);
  for (let offset = 0; offset < resources.length; offset += 4) {
    await Promise.all(resources.slice(offset, offset + 4).map(async resource => {
      content[resource] = (await request(base, `/api/admin/r/${resource}`, login.cookie)).data;
    }));
  }
  content.settings = pick((await request(base, "/api/admin/settings", login.cookie)).data, publicSettingKeys);
  return content;
}
function compare(source, live) {
  const differences = [];
  for (const resource of Object.keys(fields)) {
    const liveRows = new Map(live[resource].map(row => [row.id, row]));
    const sourceRows = new Map(source[resource].map(row => [row.id, row]));
    for (const row of source[resource]) {
      const other = liveRows.get(row.id);
      const label = row.slug ?? row.name ?? row.type ?? resource;
      if (!other) { differences.push(`${resource} ${label}: assente in produzione`); continue; }
      const left = project(resource, row), right = project(resource, other);
      const changed = Object.keys(left).filter(key => canonical(left[key]) !== canonical(right[key]));
      if (changed.length) differences.push(`${resource} ${label}: ${changed.join(", ")}`);
    }
    for (const row of live[resource]) if (!sourceRows.has(row.id)) differences.push(`${resource}: record presente solo in produzione`);
  }
  for (const key of publicSettingKeys) if (canonical(source.settings[key]) !== canonical(live.settings[key])) differences.push(`settings: ${key}`);
  return differences;
}
function collectAssets(content, origin) {
  const urls = new Set();
  function visit(value) {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value && typeof value === "object") { Object.values(value).forEach(visit); return; }
    if (typeof value !== "string" || !/^(\/|https?:\/\/)/.test(value)) return;
    let url;
    try { url = new URL(value, origin); } catch { return; }
    if (url.origin !== origin) return;
    if (/\/api\/media\//.test(url.pathname) || /\.(png|jpe?g|webp|gif|svg|ico|mp4|webm|pdf|woff2?)$/i.test(url.pathname)) urls.add(url.href);
  }
  for (const resource of Object.keys(fields)) content[resource].forEach(row => visit(project(resource, row)));
  visit(content.settings);
  return [...urls];
}
try {
  assert.ok(process.env.REPLIT_DEV_DOMAIN && process.env.PUBLIC_BASE_URL, "Impostare REPLIT_DEV_DOMAIN e PUBLIC_BASE_URL del progetto.");
  assert.ok(process.env.SEED_ADMIN_PASSWORD, "Password Super Admin richiesta tramite il Secret del progetto, mai come argomento.");
  const source = new URL(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  const live = new URL(process.env.PUBLIC_BASE_URL);
  assert.equal(live.protocol, "https:", "L'URL pubblico deve usare HTTPS.");
  assert.ok(!live.username && !live.password, "Non inserire credenziali negli URL.");
  assert.notEqual(source.origin, live.origin, "Anteprima e produzione devono essere ambienti distinti.");
  const [sourceContent, liveContent] = await Promise.all([
    readPublicContent(source.origin, process.env.SEED_ADMIN_PASSWORD),
    readPublicContent(live.origin, process.env.SEED_ADMIN_PASSWORD),
  ]);
  const differences = compare(sourceContent, liveContent);
  const assets = collectAssets(sourceContent, live.origin);
  for (let offset = 0; offset < assets.length; offset += 4) {
    await Promise.all(assets.slice(offset, offset + 4).map(async url => {
      const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(20000) });
      if (response.status !== 200) differences.push(`Asset ${new URL(url).pathname}: HTTP ${response.status}`);
    }));
  }
  if (differences.length) {
    console.error(`NON ALLINEATO: ${differences.length} differenze rilevate.`);
    differences.forEach(difference => console.error(`- ${difference}`));
    process.exitCode = 1;
  } else {
    const records = Object.keys(fields).reduce((count, resource) => count + sourceContent[resource].length, 0);
    console.log(`ALLINEATO: ${records} record, ${Object.keys(fields).length} risorse, ${publicSettingKeys.length} gruppi di impostazioni; ${assets.length} asset raggiungibili.`);
    console.log("Nessun contenuto è stato modificato e nessun ordine o prenotazione è stato inviato.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Controllo non riuscito.");
  process.exitCode = 1;
} finally {
  for (const { base, cookie } of sessions) {
    try {
      const response = await fetch(new URL("/api/auth/logout", base), { method: "POST", headers: { cookie }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Logout non riuscito.");
    } catch {
      console.error("Logout della sessione di verifica non riuscito.");
      process.exitCode = 1;
    }
  }
}
