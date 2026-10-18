// MERHAV-GH (מרחב פנימי) — reads a case through three lenses (biographical counselling,
// tzimtzum psychology, Buddhist psychology), then a synthesis, and translates each
// mechanism of change into a living space with a Hebrew Midjourney prompt.
// Actions: intake | answer | lens | synthesis | revise.
// No login: open to every visitor, with hourly caps. Writes with the service role only
// to merhav_* tables. Text: Claude (ANTHROPIC_API_KEY, shared project secret).
import Anthropic from "npm:@anthropic-ai/sdk";

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
const CASES_PER_HOUR = 40;
const READINGS_PER_HOUR = 120;

const MANDATORY = "Documentary realism, Professional architecture photography, 1:1";
const MJ_TAIL = "--ar 1:1 --no text, words, writing, frame divisions";

type Lens = "biographical" | "tzimtzum" | "buddhist";
const LENSES: Lens[] = ["biographical", "tzimtzum", "buddhist"];

// ---------------------------------------------------------------- persona + dictionary
const PERSONA = `אתה ד"ר יואב מרום, פסיכולוג קליני ומדריך מטפלים, עם יותר מעשרים וחמש שנות ניסיון. העמקת בשלוש מסורות של הבנת אדם: ייעוץ ביוגרפי על בסיס האנתרופוסופיה, הפסיכולוגיה היהודית של הצמצום (מרדכי רוטנברג) והפסיכולוגיה הבודהיסטית. אתה לא נאמן לאף שיטה אחת. השאלה שלך תמיד: מה יעזור לאדם הזה, עכשיו, בנסיבות שלו.
המשתמשת היא יועצת ביוגרפית אנתרופוסופית. פנה אליה בלשון נקבה, כעמית מקצוע. אל תסביר לה יסודות; בנה על הידע שלה.
על האדם שבמקרה מדברים בגוף שלישי ("היא", "הוא", "המלווה"), לעולם לא "המשתמשת" ולא "המשתמש".
המקרים אנונימיים ומובאים לצורך חשיבה, מחקר ויצירה.

עקרונות:
- כל עדשה עונה על שאלה אחרת ופועלת דרך מנגנון שינוי אחר. שמור על ההבדל ואל תטשטש אותו.
  ייעוץ ביוגרפי: איפה האדם נמצא בזמן חייו. מנגנון: משמעות והתמצאות. מחזורי שבע שנים, צמתי ירח (כ-18.7, 37.2, 55.8), משבר אמצע החיים, שלבים משתקפים, מה מבקש להיוולד ומה מבקש להיפרד.
  צמצום: איך האדם נמצא מול האחר ומול העבר. מנגנון: פינוי מקום ושכתוב. צמצום הדדי, שכתוב ביוגרפי (Re-Biographing), ירידה לצורך עלייה (בזהירות, לעולם לא להקטין סבל), הצמצום של המלווה.
  בודהיסטית: איך האדם מחזיק את החוויה ברגע הזה. מנגנון: הפחתת היאחזות ותגובתיות וטיפוח חמלה. שלושת שורשי הסבל, החץ השני, ארעיות, זהות ועצמי, ארבעת הברהמה ויהארה, הדרך האמצעית. אצל טראומה לא מעובדת או שבריריות: תרגול קצר, עיניים פתוחות, עיגון (David Treleaven).
- "הגבול" תמיד ספציפי למקרה הזה, לעולם לא נוסח כללי כמו "לא מתאים לטראומה".
- עקיפה רוחנית אסורה: "לשחרר", "לקבל", "זה שיעור" אינם תשובה לאדם שנפגע ולא נשמע.
- לא לאשר הנחה רק כי הובאה. לשים לב למה שנוטים לפספס: בעיה גופנית שמתחפשת לנפשית, חומרים, טראומה שלא נאמרה, הקשר משפחתי ותרבותי, משאבים.
- כנות לגבי בסיס הידע: ייעוץ ביוגרפי וצמצום הן מסגרות פרשניות עם בסיס אמפירי מצומצם; חלק מההתערבויות הבודהיסטיות (כמו MBCT) נבדקו היטב.
- לא קובעים אבחנה ("התיאור מתאים לכיוון של...") ולא ממליצים על תרופות או מינונים.
- הפרדה בין עובדה (מה שנאמר), הערכה (מה שאתה מעריך) והנחה (מה שאתה מניח).
- מקורות: רק אנשים וספרים אמיתיים שאתה בטוח בהם. אם לא בטוח, אל תציין.

שפה: עברית טבעית, תקינה, קצרה ומקצועית. משפטים קצרים. לא פיוטית, לא מתורגמת. בלי אימוג'י, בלי חיצים, בלי סימני קריאה.`;

const SPACE = `תרגום למרחב מחייה: המרחב מתאר את הפתרון, לא את הסבל. אין בו פנים של אנשים, אין דמות במצוקה, אין טקסט.
דקדוק מרחבי לכל עדשה, כדי שארבעת המרחבים לא ייראו דומים:
- ייעוץ ביוגרפי: מסלול, סף ומעבר בין חללים, שכבות זמן. אור שמשתנה לאורך המעבר, חומר שנושא זמן (אבן שחוקה, עץ ממוחזר, טיח בשכבות). המתח: בין מה שנשאר מאחור למה שנפתח.
- צמצום: חלל שמשאיר מקום, קיר שנסוג, נישה, חצר פנימית, מקום ריק מכוון לאחר. אור שנכנס דרך הנסיגה. המתח: בין מלא לריק.
- בודהיסטית: פשטות, חומר גלם טבעי, מגע עם אוויר, מים ואדמה, פתח לשמיים. אור שמשתנה במהלך היום, מרקם גלם. המתח: בין קבוע לארעי.
- סינתזה: חלל אחד שמכיל את שלושתם: מעבר, נסיגה ונשימה, בהתאם למה שהעדשות מסכימות עליו במקרה.
החלל נגזר מהמקרה הספציפי: שלב החיים, סוג הקושי והכלי שהוצע. נוף ישראלי כשמתאים (מדבר, חוף, גליל, שפלה, עיר ים תיכונית).
space.distill: משפט זיקוק אחד בעברית: מה המרחב הזה עושה לאדם.
space.principle: העיקרון המרחבי במילים ספורות.
space.prompt_he: פרומפט למידג'רני בעברית בלבד, שורה אחת רציפה, בסדר: רעיון ליבה חזותי, סוג המרחב והעיקרון, חומר ומרקם, מקור אור ואיכותו, קומפוזיציה, פלטה, ניגוד, נוף, זווית מצלמה, שעה ביום, "צילום תיעודי בסגנון סרט דוקומנטרי". כל פרט תורם לתמונה. בלי פרמטרים ובלי שלילות; הם מתווספים אוטומטית.`;

// ---------------------------------------------------------------- schemas
const str = { type: "string" };
const strArr = { type: "array", items: str };
const obj = (props: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(props),
  properties: props,
});
const BASIS = obj({ facts: strArr, assessments: strArr, assumptions: strArr });
const SPACE_SCHEMA = obj({ distill: str, principle: str, prompt_he: str });

const INTAKE_SCHEMA = obj({
  title: str,
  reflection: str,
  sufficient: { type: "boolean" },
  questions: strArr,
  risk: obj({ level: { type: "string", enum: ["none", "concern", "acute"] }, reason: str }),
  beyond_scope: obj({ flag: { type: "boolean" }, reason: str }),
  basis: BASIS,
});

const LENS_SCHEMA = obj({
  question: str,
  core: str,
  points: { type: "array", items: obj({ label: str, text: str }) },
  uniqueness: str,
  response: str,
  tool: obj({ name: str, how: str }),
  limit: str,
  sources: strArr,
  basis: BASIS,
  space: SPACE_SCHEMA,
});

const SYNTH_SCHEMA = obj({
  image: str,
  agree: str,
  complement: str,
  tension: str,
  now: str,
  formulation: obj({ predisposing: str, precipitating: str, perpetuating: str, protective: str }),
  ways: { type: "array", items: obj({ name: str, what: str, why: str, limit: str, when: str }) },
  clinical: obj({ needed: { type: "boolean" }, what: str, who: str, parallel: str }),
  recommendation: str,
  next_step: str,
  learning: str,
  source: str,
  basis: BASIS,
  space: SPACE_SCHEMA,
});

const LENS_BRIEF: Record<Lens, string> = {
  biographical: `קריאה ביוגרפית. question: איפה האדם נמצא בזמן חייו, מנוסח למקרה. points: 3 עד 4 נקודות עם label קצר מתוך: שלב ומשימה, סף או צומת, דפוס משתקף, השאלה הביוגרפית (מה מבקש להיוולד ומה להיפרד). tool: כלי ביוגרפי מעשי (ציר זמן, ציור שלבים, זיכרונות מפתח, עבודה אמנותית, שאלות כוונה) עם הוראות שימוש קצרות. sources: 1 עד 2 מתוך Rudolf Steiner, Bernard Lievegoed, Gudrun Burkhard, בשם עברי ולועזי.`,
  tzimtzum: `קריאת צמצום. question: איך האדם נמצא מול האחר ומול העבר שלו, מנוסח למקרה. points: 3 עד 4 נקודות עם label מתוך: צמצום הדדי (איפה תופס הכל ואיפה נעלם), שכתוב ביוגרפי, ירידה לצורך עלייה (רק אם מתאים ובזהירות), הצמצום של המלווה. tool: כלי מעשי (למשל תרגיל שכתוב, מפת מרחב בין־אישי, שאלת פינוי). sources: 1 עד 2, בעיקר Mordechai Rotenberg, בשם עברי ולועזי.`,
  buddhist: `קריאה בודהיסטית. question: איך האדם מחזיק את החוויה ברגע הזה, מנוסח למקרה. points: 3 עד 4 נקודות עם label מתוך: שורש הסבל, החץ השני, ארעיות, זהות ועצמי, ברהמה ויהארה, הדרך האמצעית. tool: תרגול קצר ויומיומי (נוכחות קשובה, חמלה עצמית, Metta, RAIN של Tara Brach, התבוננות בגוף), כולל התאמה רגישת טראומה אם רלוונטי. sources: 1 עד 2 מתוך Jack Kornfield, Tara Brach, Mark Epstein, Jon Kabat-Zinn, Kristin Neff, David Treleaven, בשם עברי ולועזי.`,
};

const COMMON_LENS = `שדות משותפים:
- core: הקריאה המרכזית ב-2 עד 3 משפטים.
- uniqueness (הייחוד): מה העדשה הזו רואה במקרה הזה שהשתיים האחרות לא רואות.
- response (המענה): מה היא מציעה בפועל לקושי.
- limit (הגבול): איפה היא לא מגיעה במקרה הזה, ספציפית.
- basis: 1 עד 3 פריטים קצרים בכל רשימה.
${SPACE}`;

// ---------------------------------------------------------------- helpers
async function countSince(table: string, column: string): Promise<number> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const r = await fetch(`${SB_URL}/rest/v1/${table}?select=id&${column}=gte.${since}`, {
    method: "HEAD",
    headers: { ...SB, Prefer: "count=exact" },
  });
  return Number((r.headers.get("content-range") ?? "").split("/")[1]) || 0;
}

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...SB, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`DB ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : await r.json();
}

const getCase = async (id: string) => (await rest(`merhav_cases?id=eq.${id}&select=*`))?.[0];
const getReadings = async (id: string) => (await rest(`merhav_readings?case_id=eq.${id}&select=*`)) as Record<string, unknown>[];

class UserError extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}

async function ask(schema: unknown, userText: string, effort: "low" | "medium", system = PERSONA) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
  if (!apiKey) throw new UserError("מפתח Claude לא מוגדר בשרת", 500);
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 12000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      output_config: { effort, format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: userText }],
    } as never);
    if (response.stop_reason === "refusal") throw new UserError("הבקשה נדחתה. נסי ניסוח אחר.", 422);
    const text = response.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    return JSON.parse(text);
  } catch (err) {
    if (err instanceof UserError) throw err;
    if (err instanceof Anthropic.RateLimitError) throw new UserError("עומס זמני, נסי שוב בעוד דקה.", 429);
    if (err instanceof Anthropic.APIError) throw new UserError(`Claude API ${err.status}: ${err.message}`, 502);
    throw err;
  }
}

const caseText = (c: Record<string, unknown>) =>
  `קוד מקרה: ${c.code}\nתיאור המקרה:\n${c.body}${c.answers ? `\n\nתשובות לשאלות הבירור:\n${c.answers}` : ""}`;

const finishPrompt = (p: string) => `${String(p ?? "").trim().replace(/[.,\s]+$/, "")}, ${MANDATORY} ${MJ_TAIL}`;

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

// ---------------------------------------------------------------- actions
async function runIntake(c: Record<string, unknown>) {
  const intake = await ask(
    INTAKE_SCHEMA,
    `${caseText(c)}

שלב בירור ובדיקת סיכון בלבד, לפני הקריאות.
- title: כותרת עבודה למקרה, 2 עד 5 מילים, בלי שמות.
- reflection: משפט אחד שמשקף מה הבנת.
- sufficient: האם יש מספיק מידע לקריאה סבירה של שלוש העדשות. גיל או שלב חיים, הקושי ומשכו הם המינימום. אל תהיה קפדן מדי: חוסר בפרטים משניים אינו סיבה לעצור.
- questions: עד שלוש שאלות ממוקדות שהיו משפרות את הקריאה (גם כשיש מספיק מידע).
- risk.level: none אם אין סימנים; concern אם יש סימן שדורש תשומת לב ובירור; acute אם יש חשש ממשי לפגיעה עצמית, אובדנות, פגיעה באחרים, התעללות בילד או במבוגר פגיע, מצב פסיכוטי או מאני או הידרדרות חדה. reason: משפט אחד.
- beyond_scope: האם המקרה חורג מתחום הייעוץ (דיכאון שפוגע בתפקוד, חרדה משתקת, טראומה עם הצפות או ניתוק, הפרעת אכילה, חומרים, פסיכוזה או מאניה, סיכון, קושי מתמשך שלא משתפר). reason קצר, ריק אם לא.
- basis: עובדות שנאמרו, הערכות והנחות, 1 עד 3 בכל רשימה.`,
    "low",
  );
  const level = ["none", "concern", "acute"].includes(intake?.risk?.level) ? intake.risk.level : "none";
  return { intake, level };
}

async function actionIntake(body: Record<string, unknown>) {
  const text = clip(body.body, 6000);
  if (text.length < 20) throw new UserError("צריך לתאר את המקרה בכמה משפטים לפחות.");
  if ((await countSince("merhav_cases", "created_at")) >= CASES_PER_HOUR)
    throw new UserError("נפתחו הרבה מקרים בשעה האחרונה. נסי שוב מאוחר יותר.", 429);
  const code = clip(body.code, 40) || `מקרה ${new Date().toISOString().slice(2, 10).replaceAll("-", "")}`;
  const parent_id = typeof body.parentId === "string" && /^[0-9a-f-]{36}$/i.test(body.parentId) ? body.parentId : null;
  const draft = { code, body: text, answers: clip(body.answers, 3000) || null };
  const { intake, level } = await runIntake(draft);
  const [saved] = await rest("merhav_cases", {
    method: "POST",
    body: JSON.stringify({ ...draft, title: clip(intake.title, 80) || code, intake, risk_level: level, parent_id }),
  });
  return { case: saved };
}

async function actionAnswer(c: Record<string, unknown>, body: Record<string, unknown>) {
  const add = clip(body.answers, 3000);
  if (!add) throw new UserError("לא התקבלו תשובות.");
  const answers = [c.answers, add].filter(Boolean).join("\n");
  const { intake, level } = await runIntake({ ...c, answers });
  const [saved] = await rest(`merhav_cases?id=eq.${c.id}`, {
    method: "PATCH",
    body: JSON.stringify({ answers, intake, risk_level: level, title: clip(intake.title, 80) || c.title, updated_at: new Date().toISOString() }),
  });
  return { case: saved };
}

async function upsertReading(caseId: string, lens: string, content: Record<string, unknown>) {
  const space = (content.space ?? {}) as Record<string, string>;
  const row = {
    case_id: caseId,
    lens,
    content,
    distill: clip(space.distill, 400),
    prompt_he: finishPrompt(space.prompt_he),
    updated_at: new Date().toISOString(),
  };
  const [saved] = await rest("merhav_readings?on_conflict=case_id,lens", {
    method: "POST",
    headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(row),
  });
  return saved;
}

function gate(c: Record<string, unknown>) {
  if (c.risk_level === "acute")
    throw new UserError("זוהה חשש לסיכון ממשי. תהליך הקריאה נעצר; קודם הערכת סיכון ופנייה לאיש מקצוע.", 409);
}

async function actionLens(c: Record<string, unknown>, lens: Lens) {
  gate(c);
  if ((await countSince("merhav_readings", "updated_at")) >= READINGS_PER_HOUR)
    throw new UserError("נוצרו הרבה קריאות בשעה האחרונה. נסי שוב מאוחר יותר.", 429);
  const intake = (c.intake ?? {}) as Record<string, unknown>;
  const content = await ask(
    LENS_SCHEMA,
    `${caseText(c)}

מה שכבר הובן בבירור: ${(intake.reflection as string) ?? ""}
${LENS_BRIEF[lens]}
${COMMON_LENS}
מרחב: השתמש בדקדוק המרחבי של העדשה הזו בלבד.`,
    "medium",
  );
  return { reading: await upsertReading(String(c.id), lens, content) };
}

async function actionSynthesis(c: Record<string, unknown>) {
  gate(c);
  if ((await countSince("merhav_readings", "updated_at")) >= READINGS_PER_HOUR)
    throw new UserError("נוצרו הרבה קריאות בשעה האחרונה. נסי שוב מאוחר יותר.", 429);
  const readings = await getReadings(String(c.id));
  const byLens = Object.fromEntries(readings.map((r) => [r.lens, r.content]));
  const missing = LENSES.filter((l) => !byLens[l]);
  if (missing.length) throw new UserError("הסינתזה נבנית אחרי שלוש העדשות.", 409);
  const name: Record<Lens, string> = { biographical: "ביוגרפית", tzimtzum: "צמצום", buddhist: "בודהיסטית" };
  const summary = LENSES.map((l) => {
    const r = byLens[l] as Record<string, unknown>;
    const tool = (r.tool ?? {}) as Record<string, string>;
    return `עדשה ${name[l]}:\nקריאה: ${r.core}\nהייחוד: ${r.uniqueness}\nהמענה: ${r.response} (כלי: ${tool.name})\nהגבול: ${r.limit}\nמרחב: ${(r.space as Record<string, string>)?.principle}`;
  }).join("\n\n");
  const content = await ask(
    SYNTH_SCHEMA,
    `${caseText(c)}

שלוש הקריאות:
${summary}

${c.risk_level === "concern" ? `שים לב: בבירור עלה סימן שדורש תשומת לב: ${(c.intake as Record<string, Record<string, string>>)?.risk?.reason}\n` : ""}בנה את הסינתזה משלוש השורות של כל עדשה.
- image: תמונה אחת של המקרה, משפט או שניים, לא סיכום של שלוש קריאות.
- agree: איפה שלוש העדשות מצביעות על אותו מוקד.
- complement: איפה אחת משלימה את הגבול של אחרת, בשמות העדשות.
- tension: איפה הן מושכות לכיוונים שונים.
- now: מה מתאים לאדם הזה עכשיו, ולמה.
- formulation: גורמים מנבאים, מעוררים, משמרים ומגינים, משפט לכל אחד.
- ways: 2 עד 3 דרכי עבודה שונות באמת. הראשונה נשענת על הסינתזה. האחרות יכולות לכלול גישה קלינית כשנדרש, מחוברת לשפת העדשות. לכל דרך: what, why, limit, when.
- clinical: needed אם נדרש גם טיפול קליני או הפניה. what (איזה), who (אצל מי), parallel (איך היועצת ממשיכה ללוות במקביל). ריקים אם לא נדרש.
- recommendation: מה היית ממליץ ולמה, במפורש.
- next_step: צעד אחד ברור לפגישה הבאה.
- learning: עיקרון אחד שהיועצת לוקחת למקרים אחרים, משפט או שניים.
- source: מקור אחד להעמקה, אמיתי, או ריק.
${SPACE}
מרחב: חלל אחד שמכיל את שלושת הדקדוקים, לפי מה שהעדשות מסכימות עליו.`,
    "medium",
  );
  return { reading: await upsertReading(String(c.id), "synthesis", content) };
}

// ---------------------------------------------------------------- entry
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "בקשה לא תקינה" }, 400); }
  const action = String(body.action ?? "");
  try {
    if (action === "intake" || action === "revise") return json(await actionIntake(body));
    const id = String(body.caseId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UserError("מקרה לא תקין");
    const c = await getCase(id);
    if (!c) throw new UserError("המקרה לא נמצא", 404);
    if (action === "answer") return json(await actionAnswer(c, body));
    if (action === "lens") {
      const lens = String(body.lens) as Lens;
      if (!LENSES.includes(lens)) throw new UserError("עדשה לא מוכרת");
      return json(await actionLens(c, lens));
    }
    if (action === "synthesis") return json(await actionSynthesis(c));
    throw new UserError("פעולה לא מוכרת");
  } catch (err) {
    if (err instanceof UserError) return json({ error: err.message }, err.status);
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
