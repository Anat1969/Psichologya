import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { analyze, getCase } from "../api.js";
import Motif from "../components/Motif.jsx";

const PROMPTS = ["גיל ושלב חיים", "מה הקושי, וממתי", "באיזו עוצמה, ואיך הוא משפיע על היום־יום", "מה כבר נוסה", "מערכת תומכת ובריאות גופנית", "מה האדם עצמו רוצה שישתנה"];

export default function NewCase() {
  const [params] = useSearchParams();
  const from = params.get("from");
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!from) return;
    getCase(from)
      .then((c) => {
        if (!c) return;
        setCode(c.code);
        setBody([c.body, c.answers].filter(Boolean).join("\n\n"));
      })
      .catch(() => {});
  }, [from]);

  const submit = async (e) => {
    e.preventDefault();
    if (body.trim().length < 20) {
      setErr("כמה משפטים לפחות, כדי שתהיה קריאה.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const { case: c } = await analyze({ action: from ? "revise" : "intake", code: code.trim(), body: body.trim(), parentId: from || undefined });
      nav(`/case/${c.id}`);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  };

  return (
    <div className="newcase wrap">
      <div className="newcase-grid">
        <form className="newcase-form" onSubmit={submit}>
          <span className="mono">{from ? "גרסה חדשה של מקרה" : "מקרה חדש"}</span>
          <h1>{from ? "עריכה והרצה מחדש" : "מה המקרה"}</h1>
          <p className="muted">בלי שמות ובלי פרטים מזהים. הגרסה הקודמת נשמרת כמו שהיא.</p>

          <label className="field">
            <span className="mono">קוד מקרה</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="למשל: ר.מ 42" maxLength={40} data-testid="code" />
          </label>

          <label className="field">
            <span className="mono">תיאור</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              maxLength={6000}
              placeholder="מי האדם, מה מביא אותו, ממתי, ומה הוא רוצה שישתנה"
              data-testid="body"
            />
            <span className="counter mono">{body.length} / 6000</span>
          </label>

          {err && <p className="error" data-testid="new-error">{err}</p>}
          <button className="btn btn--big" disabled={busy} data-testid="submit">
            {busy ? "קורא את המקרה" : "פתיחת המקרה"}
          </button>
        </form>

        <aside className="newcase-aside">
          <span className="mono">מה כדאי לכלול</span>
          <ul>
            {PROMPTS.map((p, i) => (
              <motion.li key={p} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
                {p}
              </motion.li>
            ))}
          </ul>
          <p className="muted small">אם חסר מידע חיוני, הבירור יבקש עד שלוש שאלות. אם עולה חשש לסיכון, התהליך נעצר לפני הקריאות.</p>
        </aside>
      </div>

      <AnimatePresence>
        {busy && (
          <motion.div className="veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Motif lens="synthesis" size={160} />
            <p>בירור ובדיקת סיכון</p>
            <span className="muted small">כחצי דקה</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
