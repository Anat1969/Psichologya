// Compact fixtures shaped exactly like the merhav_* rows the app reads.
const basis = { facts: ["בת 42, מורה 17 שנה"], assessments: ["השאלה הביוגרפית אמיתית"], assumptions: ["אין סיבה גופנית, לא נבדק"] };

export const ids = {
  ready: "11111111-1111-4111-8111-111111111111",
  fresh: "22222222-2222-4222-8222-222222222222",
  thin: "33333333-3333-4333-8333-333333333333",
  acute: "44444444-4444-4444-8444-444444444444",
  created: "55555555-5555-4555-8555-555555555555",
};

export function intake({ sufficient = true, level = "none", scope = false } = {}) {
  return {
    title: "חיים של מישהי אחרת",
    reflection: "אישה בת 42 שוויתרה על עיצוב בגיל 21 שואלת אם זה שלב או קריאה.",
    sufficient,
    questions: ["האם העייפות נבדקה גופנית?", "מה קרה בשנה האחרונה?", "איך נראה הקשר עם האם היום?"],
    risk: { level, reason: level === "none" ? "" : level === "acute" ? "עלה חשש ממשי לפגיעה עצמית." : "עייפות מתמשכת מצדיקה בירור." },
    beyond_scope: { flag: scope, reason: scope ? "דיכאון שפוגע בתפקוד" : "" },
    basis,
  };
}

export function makeCase(id, opts = {}) {
  const now = "2026-10-18T20:59:02.921896+00:00";
  return {
    id,
    code: opts.code ?? "דוגמה 1",
    title: "חיים של מישהי אחרת",
    body: "אישה בת 42, אמא לשני ילדים, מורה 17 שנה. מרגישה שהיא חיה את החיים של מישהי אחרת.",
    answers: null,
    intake: intake(opts),
    risk_level: opts.level ?? "none",
    parent_id: null,
    created_at: now,
    updated_at: now,
    merhav_readings: [],
  };
}

const PROMPTS = {
  biographical: "מעבר מחדר ישן אל סדנת יצירה מוארת, מסדרון אבן וסף רחב, בית אבן בגליל",
  tzimtzum: "קיר ישן שנסוג פנימה ופותח נישה ריקה ושקטה, חצר פנימית בעכו",
  buddhist: "חדר אדמה דחוסה עם פתח עגול לשמיים, אגן בזלת עם מים, גליל עליון",
  synthesis: "מסדרון אבן אל חצר פנימית פתוחה לשמיים, קיר שנסוג, שולחן עבודה עץ",
};
const TAIL = ", צילום תיעודי בסגנון סרט דוקומנטרי, Documentary realism, Professional architecture photography, 1:1 --ar 1:1 --no text, words, writing, frame divisions";

export function makeReading(caseId, lens, n = 1) {
  const space = { distill: `מרחב ${lens} שמשאיר לה מקום משלה (${n})`, principle: "מעבר, נסיגה ונשימה", prompt_he: PROMPTS[lens] };
  const content =
    lens === "synthesis"
      ? {
          image: "אישה שנושאת בחירה של גיל 21 ומנסה לשמוע את הקול שלה בחדר שאמה עדיין ממלאת.",
          agree: "ההחלטה הגדולה לא עכשיו; ניסוי קטן; בירור גופני.",
          complement: "הצמצום משלים את הגבול של הביוגרפית ביחסים החיים עם האם.",
          tension: "הביוגרפית מושכת קדימה, הצמצום מבקש לחכות.",
          now: "בירור רפואי, הבחנת קולות וצעד קטן עם העיצוב.",
          formulation: { predisposing: "ויתור בגיל 21", precipitating: "שבעון משקף", perpetuating: "ביקורת אמהית", protective: "תפקוד יציב" },
          ways: [
            { name: "מעבר בשלבים", what: "מפת קולות, ציר משתקף וניסוי קטן", why: "מחבר את שלוש העדשות", limit: "לא מהיר", when: "אחרי בירור רפואי" },
            { name: "הערכת מצב רוח", what: "הערכה וטיפול ממוקד", why: "עייפות מתמשכת", limit: "עלול לטשטש את השאלה", when: "אם ההנאה כבתה" },
          ],
          clinical: { needed: true, what: "בירור רפואי והערכת מצב רוח", who: "רופאת משפחה", parallel: "ממשיכה בעבודה הביוגרפית בקצב איטי" },
          recommendation: "הדרך הראשונה, בתנאי שהבירור הרפואי נעשה עכשיו.",
          next_step: "לשאול באיזה קול עלה המשפט בהחלטה האחרונה.",
          learning: "קודם מי עוד בחדר ומה מצב הגוף, אחר כך התוכן.",
          source: "Mordechai Rotenberg, Re-Biographing and Deviance",
          basis,
          space,
        }
      : {
          question: `השאלה של עדשת ${lens} במקרה הזה`,
          core: `הקריאה המרכזית של עדשת ${lens}.`,
          points: [
            { label: "נקודה א", text: "טקסט ראשון" },
            { label: "נקודה ב", text: "טקסט שני" },
          ],
          uniqueness: "מה שרק העדשה הזו רואה.",
          response: "מה היא מציעה בפועל.",
          tool: { name: "כלי לדוגמה", how: "איך משתמשים בו" },
          limit: "איפה היא לא מגיעה במקרה הזה.",
          sources: ["Bernard Lievegoed, Phases"],
          basis,
          space,
        };
  const t = new Date(Date.UTC(2026, 9, 18, 21, n, 0)).toISOString();
  return { id: `r-${lens}-${n}`, case_id: caseId, lens, content, distill: space.distill, prompt_he: PROMPTS[lens] + TAIL, images: [], created_at: t, updated_at: t };
}
