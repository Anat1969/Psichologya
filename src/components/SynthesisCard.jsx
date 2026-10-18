import { LENS } from "../lenses.js";
import { LensShell } from "./LensCard.jsx";
import SpaceBlock from "./SpaceBlock.jsx";
import Basis from "./Basis.jsx";

const FORM = [
  ["predisposing", "מנבאים"],
  ["precipitating", "מעוררים"],
  ["perpetuating", "משמרים"],
  ["protective", "מגינים"],
];

export default function SynthesisCard({ caseId, reading, status, error, onRetry, onRegenerate, onReading, stale, waiting }) {
  const c = reading?.content ?? {};
  const shownStatus = waiting && status === "idle" ? "idle" : status;
  return (
    <LensShell
      lens="synthesis"
      status={shownStatus}
      error={error}
      onRetry={onRetry}
      actions={
        status === "ready" && (
          <button className={`btn btn--small ${stale ? "" : "btn--ghost"}`} onClick={onRegenerate} data-testid="regen-synthesis">
            {stale ? "בניית הסינתזה מחדש" : "קריאה מחדש"}
          </button>
        )
      }
    >
      {stale && <p className="stale mono">אחת העדשות עודכנה אחרי שהסינתזה נבנתה</p>}

      <blockquote className="synth-image">{c.image}</blockquote>

      <div className="synth-weave">
        <div className="weave-item">
          <span className="mono">איפה הן מסכימות</span>
          <p>{c.agree}</p>
        </div>
        <div className="weave-item">
          <span className="mono">איפה אחת משלימה את הגבול של אחרת</span>
          <p>{c.complement}</p>
        </div>
        <div className="weave-item">
          <span className="mono">איפה הן מושכות לכיוונים שונים</span>
          <p>{c.tension}</p>
        </div>
        <div className="weave-item weave-item--now">
          <span className="mono">מה מתאים עכשיו</span>
          <p>{c.now}</p>
        </div>
      </div>

      {c.formulation && (
        <div className="formulation">
          <span className="tag">המשגה</span>
          <div className="form-grid">
            {FORM.map(([k, label]) => (
              <div key={k} className="form-cell">
                <span className="mono">{label}</span>
                <p>{c.formulation[k]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(c.ways) && c.ways.length > 0 && (
        <div className="ways">
          <span className="tag">דרכי עבודה</span>
          <div className="ways-grid">
            {c.ways.map((w, i) => (
              <article key={i} className={`way ${i === 0 ? "way--lead" : ""}`}>
                <span className="mono">{i === 0 ? "נשענת על הסינתזה" : `דרך ${i + 1}`}</span>
                <h3>{w.name}</h3>
                <p>{w.what}</p>
                <dl>
                  <dt>למה</dt>
                  <dd>{w.why}</dd>
                  <dt>המגבלה</dt>
                  <dd>{w.limit}</dd>
                  <dt>מתי</dt>
                  <dd>{w.when}</dd>
                </dl>
              </article>
            ))}
          </div>
        </div>
      )}

      {c.clinical?.needed && (
        <div className="clinical">
          <span className="tag">חורג מתחום הייעוץ</span>
          <p><strong>{c.clinical.what}</strong>{c.clinical.who ? `, אצל ${c.clinical.who.replace(/^אצל\s+/, "")}` : ""}</p>
          {c.clinical.parallel && <p className="muted">במקביל: {c.clinical.parallel}</p>}
        </div>
      )}

      <div className="verdict">
        <div className="verdict-main">
          <span className="tag">המלצה</span>
          <p>{c.recommendation}</p>
        </div>
        <div className="verdict-side">
          <div>
            <span className="mono">צעד הבא</span>
            <p>{c.next_step}</p>
          </div>
          <div>
            <span className="mono">לימוד</span>
            <p>{c.learning}</p>
            {c.source && <p className="sources mono">להעמקה: {c.source}</p>}
          </div>
        </div>
      </div>

      <Basis basis={c.basis} />
      <SpaceBlock caseId={caseId} lens="synthesis" reading={reading} color={LENS.synthesis.color} onReading={onReading} />
    </LensShell>
  );
}
