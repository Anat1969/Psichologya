// MERHAV-GH (מרחב פנימי) — attaches the Midjourney image made from a reading's prompt.
// No login: anyone may add or remove an image. Files go to the merhav-media bucket under
// cases/<caseId>/<lens>-<ts>.<ext>; the reading keeps a history in images[] (newest last).
// Removing only drops the entry from images[]; the file stays in storage.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const BUCKET = "merhav-media";
const HOURLY_LIMIT = 60;
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const LENSES = ["biographical", "tzimtzum", "buddhist", "synthesis"];

type Img = { url: string; at: string };

async function uploadsLastHour(): Promise<number> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const r = await fetch(`${SB_URL}/rest/v1/merhav_readings?select=id&updated_at=gte.${since}&images=neq.[]`, {
    method: "HEAD",
    headers: { ...SB, Prefer: "count=exact" },
  });
  return Number((r.headers.get("content-range") ?? "").split("/")[1]) || 0;
}

async function patch(id: string, images: Img[]) {
  const r = await fetch(`${SB_URL}/rest/v1/merhav_readings?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...SB, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ images, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json())[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "בקשה לא תקינה" }, 400); }
  const caseId = String(form.get("caseId") ?? "");
  const lens = String(form.get("lens") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(caseId) || !LENSES.includes(lens)) return json({ error: "כרטיס לא תקין" }, 400);

  const q = await fetch(`${SB_URL}/rest/v1/merhav_readings?select=id,images&case_id=eq.${caseId}&lens=eq.${lens}`, { headers: SB });
  const [reading] = q.ok ? await q.json() : [];
  if (!reading) return json({ error: "הקריאה עוד לא נוצרה" }, 404);
  const images: Img[] = Array.isArray(reading.images) ? reading.images : [];

  try {
    const remove = String(form.get("remove") ?? "");
    if (remove) return json({ reading: await patch(reading.id, images.filter((i) => i.url !== remove)) });

    if ((await uploadsLastHour()) >= HOURLY_LIMIT) return json({ error: "הועלו הרבה תמונות בשעה האחרונה. נסי שוב מאוחר יותר." }, 429);
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "לא התקבלה תמונה" }, 400);
    const ext = TYPES[file.type];
    if (!ext) return json({ error: "אפשר להעלות JPG, PNG או WEBP" }, 415);
    if (file.size > MAX_BYTES) return json({ error: "התמונה גדולה מ-10MB" }, 413);

    const path = `cases/${caseId}/${lens}-${Date.now()}.${ext}`;
    const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { ...SB, "Content-Type": file.type, "Cache-Control": "31536000" },
      body: await file.arrayBuffer(),
    });
    if (!up.ok) return json({ error: `ההעלאה נכשלה: ${await up.text()}` }, 500);
    const url = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    return json({ reading: await patch(reading.id, [...images, { url, at: new Date().toISOString() }]) });
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
