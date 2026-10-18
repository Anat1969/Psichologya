import { SUPABASE_URL, SUPABASE_ANON } from "./config.js";

const H = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };

async function readJson(r) {
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not json */ }
  if (!r.ok) throw new Error(data?.error || data?.message || `שגיאה ${r.status}`);
  return data;
}

export async function listCases() {
  const q =
    "select=id,code,title,created_at,risk_level,intake,merhav_readings(lens,images,distill)" +
    "&order=created_at.desc&limit=80";
  return readJson(await fetch(`${SUPABASE_URL}/rest/v1/merhav_cases?${q}`, { headers: H }));
}

export async function getCase(id) {
  const rows = await readJson(
    await fetch(`${SUPABASE_URL}/rest/v1/merhav_cases?id=eq.${id}&select=*,merhav_readings(*)`, { headers: H }),
  );
  return rows?.[0] ?? null;
}

export async function analyze(payload) {
  return readJson(
    await fetch(`${SUPABASE_URL}/functions/v1/merhav-analyze`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function uploadImage(caseId, lens, file) {
  const form = new FormData();
  form.append("caseId", caseId);
  form.append("lens", lens);
  form.append("file", file);
  return readJson(await fetch(`${SUPABASE_URL}/functions/v1/merhav-upload`, { method: "POST", headers: H, body: form }));
}

export async function removeImage(caseId, lens, url) {
  const form = new FormData();
  form.append("caseId", caseId);
  form.append("lens", lens);
  form.append("remove", url);
  return readJson(await fetch(`${SUPABASE_URL}/functions/v1/merhav-upload`, { method: "POST", headers: H, body: form }));
}
