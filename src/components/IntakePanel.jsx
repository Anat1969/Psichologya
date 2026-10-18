import { useState } from "react";
import { motion } from "framer-motion";
import Basis from "./Basis.jsx";

export function Hotlines() {
  return (
    <ul className="hotlines">
      <li><strong>ער"ן</strong> עזרה ראשונה נפשית, 1201</li>
      <li><strong>סה"ר</strong> סיוע והקשבה ברשת</li>
      <li><strong>משטרה 100 · מד"א 101</strong> בסכנה מיידית</li>
      <li><strong>חדר מיון פסיכיאטרי</strong> במצב חריף</li>
    </ul>
  );
}

export default function IntakePanel({ c, onAnswer, onProceed, proceeding, readingsStarted }) {
  const intake = c.intake ?? {};
  const [answers, setAnswers] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const risk = intake.risk ?? {};
  const scope = intake.beyond_scope ?? {};
  const needsGate = !intake.sufficient && !readingsStarted && c.risk_level !== "acute";

  const submit = async () => {
    if (!answers.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await onAnswer(answers.trim());
      setAnswers("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="intake" data-testid="intake">
      {c.risk_level === "acute" && (
        <motion.div className="alert alert--acute" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} data-testid="risk-acute">
          <span className="tag">עצירה</span>
          <h3>עלה חשש לסיכון ממשי</h3>
          <p>{risk.reason}</p>
          <p>תהליך הקריאה נעצר. קודם הערכת סיכון, תוכנית בטיחות, בדיקת חובות דיווח לפי החוק, ופנייה לאיש מקצוע קליני. כדאי להתייעץ עם מדריכה.</p>
          <Hotlines />
        </motion.div>
      )}
      {c.risk_level === "concern" && (
        <div className="alert alert--concern" data-testid="risk-concern">
          <span className="tag">לתשומת לב</span>
          <p>{risk.reason}</p>
        </div>
      )}
      {scope.flag && (
        <div className="alert alert--scope" data-testid="beyond-scope">
          <span className="tag">חורג מתחום הייעוץ</span>
          <p>{scope.reason}</p>
        </div>
      )}

      <div className="intake-grid">
        <div className="intake-main">
          <span className="tag">מה הובן</span>
          <p className="reflection">{intake.reflection}</p>
          <Basis basis={intake.basis} />
        </div>

        {Array.isArray(intake.questions) && intake.questions.length > 0 && (
          <div className={`intake-q ${needsGate ? "is-gate" : ""}`}>
            <span className="tag">{needsGate ? "חסר מידע חיוני" : "שאלות שיחדדו את הקריאה"}</span>
            <ol>
              {intake.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
            {c.risk_level !== "acute" && (
              <>
                <textarea
                  value={answers}
                  onChange={(e) => setAnswers(e.target.value)}
                  placeholder="התשובות שלך, בחופשיות"
                  rows={4}
                  data-testid="answers"
                />
                <div className="row">
                  <button className="btn" onClick={submit} disabled={busy || !answers.trim()} data-testid="send-answers">
                    {busy ? "מעדכן את הבירור" : readingsStarted ? "הוספת תשובות" : "שליחת תשובות"}
                  </button>
                  {needsGate && (
                    <button className="btn btn--ghost" onClick={onProceed} disabled={proceeding} data-testid="proceed">
                      המשך עם מה שיש
                    </button>
                  )}
                </div>
                {readingsStarted && <p className="muted small">תשובות חדשות מעדכנות את הבירור. כדי שהעדשות ישקפו אותן, לחצי "קריאה מחדש".</p>}
                {err && <p className="error">{err}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
