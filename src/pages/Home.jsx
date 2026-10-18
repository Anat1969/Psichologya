import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Hero from "../components/Hero.jsx";
import Motif from "../components/Motif.jsx";
import { LENSES, LENS } from "../lenses.js";
import { listCases } from "../api.js";
import { formatDate, latestImage } from "../util.js";

const STEPS = [
  ["כתיבה", "מקרה בכמה משפטים, בלי שמות ופרטים מזהים."],
  ["בירור ושער סיכון", "משפט שמשקף מה הובן, עד שלוש שאלות, ובדיקת סיכון לפני כל קריאה."],
  ["שלוש עדשות", "כל אחת כגישה, כפתרון וכמרחב: הייחוד, המענה, הכלי והגבול."],
  ["סינתזה ומרחב", "תמונה אחת של המקרה, דרכי עבודה, צעד הבא, ומרחב שמחבר את שלושתן."],
];

export default function Home() {
  const [cases, setCases] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    listCases().then(setCases).catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="home">
      <Hero />

      <section className="wrap section">
        <div className="section-head">
          <span className="mono">המילון המרחבי</span>
          <h2>כל עדשה שואלת שאלה אחרת, ובונה מרחב אחר</h2>
        </div>
        <div className="dict">
          {LENSES.map((l, i) => (
            <motion.article
              key={l.id}
              className={`dict-card dict-card--${l.id}`}
              style={{ "--lens": l.color, "--lens-deep": l.deep, "--lens-soft": l.soft }}
              initial={{ opacity: 0, y: 30, rotateX: 8 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: i * 0.08 }}
              data-testid={`dict-${l.id}`}
            >
              <div className="dict-motif"><Motif lens={l.id} size={84} /></div>
              <span className="mono">{l.label}</span>
              <h3>{l.name}</h3>
              <p className="dict-q">{l.question}</p>
              <dl>
                <dt>מנגנון</dt>
                <dd>{l.mechanism}</dd>
                <dt>מרחב</dt>
                <dd>{l.grammar}</dd>
                <dt>חומר ואור</dt>
                <dd>{l.material}</dd>
                <dt>מתח</dt>
                <dd>{l.tension}</dd>
              </dl>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <span className="mono">מהלך</span>
          <h2>ארבעה שלבים, מהטקסט למרחב</h2>
        </div>
        <ol className="steps">
          {STEPS.map(([t, d], i) => (
            <motion.li
              key={t}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <span className="step-n mono">0{i + 1}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="wrap section" id="cases">
        <div className="section-head section-head--row">
          <div>
            <span className="mono">ארכיון</span>
            <h2>המקרים</h2>
          </div>
          <Link to="/new" className="btn" data-testid="cases-new">מקרה חדש</Link>
        </div>
        {err && <p className="error">{err}</p>}
        {!cases && !err && <p className="muted">טוען</p>}
        {cases && cases.length === 0 && (
          <div className="empty">
            <Motif lens="synthesis" size={90} />
            <p>עוד אין מקרים. הראשון מחכה לך.</p>
          </div>
        )}
        {cases && cases.length > 0 && (
          <div className="cases">
            {cases.map((c, i) => {
              const byLens = Object.fromEntries((c.merhav_readings ?? []).map((r) => [r.lens, r]));
              const cover = latestImage(byLens.synthesis) || ["biographical", "tzimtzum", "buddhist"].map((l) => latestImage(byLens[l])).find(Boolean);
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.05 }}
                >
                  <Link to={`/case/${c.id}`} className="case-card" data-testid="case-card">
                    <div className="case-cover">
                      {cover ? <img src={cover.url} alt="" loading="lazy" /> : <div className="case-cover-empty"><Motif lens="synthesis" size={70} active={false} /></div>}
                    </div>
                    <div className="case-card-text">
                      <span className="mono">{c.code} · {formatDate(c.created_at)}</span>
                      <h3>{c.title || c.code}</h3>
                      {byLens.synthesis?.distill && <p>{byLens.synthesis.distill}</p>}
                      <div className="chips">
                        {LENSES.map((l) => (
                          <span key={l.id} className={`chip ${byLens[l.id] ? "is-on" : ""}`} style={{ "--lens": LENS[l.id].color }}>
                            {l.short}
                          </span>
                        ))}
                        {c.risk_level === "acute" && <span className="chip chip--risk">עצירה</span>}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
