import { motion } from "framer-motion";
import { LENS } from "../lenses.js";
import Motif from "./Motif.jsx";
import SpaceBlock from "./SpaceBlock.jsx";
import Basis from "./Basis.jsx";

export function LensShell({ lens, status, error, onRetry, children, actions }) {
  const l = LENS[lens];
  return (
    <motion.section
      id={`lens-${lens}`}
      className={`lens lens--${lens} is-${status}`}
      style={{ "--lens": l.color, "--lens-deep": l.deep, "--lens-soft": l.soft }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      data-testid={`lens-${lens}`}
    >
      <div className="lens-head">
        <div className="lens-motif">
          <Motif lens={lens} size={96} active={status !== "idle"} />
        </div>
        <div className="lens-titles">
          <span className="mono lens-label">{l.label}</span>
          <h2>{l.name}</h2>
          <p className="lens-q">{l.question}</p>
          <p className="mono lens-mech">מנגנון השינוי: {l.mechanism}</p>
        </div>
        <div className="lens-actions">{actions}</div>
      </div>

      {status === "running" && (
        <div className="lens-wait">
          <span className="wait-bar" />
          <p>{lens === "synthesis" ? "מחבר את שלוש הקריאות לתמונה אחת" : `קורא את המקרה דרך ${l.short === "צמצום" ? "עדשת הצמצום" : `העדשה ה${l.short}`}`}</p>
        </div>
      )}
      {status === "error" && (
        <div className="lens-wait lens-wait--error">
          <p className="error">{error}</p>
          {onRetry && (
            <button className="btn btn--small" onClick={onRetry}>
              ניסיון נוסף
            </button>
          )}
        </div>
      )}
      {status === "idle" && <div className="lens-wait"><p className="muted">ממתין</p></div>}
      {status === "ready" && children}
    </motion.section>
  );
}

export default function LensCard({ caseId, lens, reading, status, error, onRetry, onRegenerate, onReading }) {
  const l = LENS[lens];
  const c = reading?.content ?? {};
  return (
    <LensShell
      lens={lens}
      status={status}
      error={error}
      onRetry={onRetry}
      actions={
        status === "ready" && (
          <button className="btn btn--ghost btn--small" onClick={onRegenerate} data-testid={`regen-${lens}`}>
            קריאה מחדש
          </button>
        )
      }
    >
      <div className="lens-body">
        <div className="lens-col">
          <span className="tag">כגישה</span>
          {c.question && <p className="lens-case-q">{c.question}</p>}
          {c.core && <p className="lens-core">{c.core}</p>}
          {Array.isArray(c.points) && c.points.length > 0 && (
            <dl className="points">
              {c.points.map((p, i) => (
                <div key={i} className="point">
                  <dt className="mono">{p.label}</dt>
                  <dd>{p.text}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="lens-col lens-col--solution">
          <span className="tag">כפתרון</span>
          <div className="three">
            <div className="three-row">
              <span className="three-k">הייחוד</span>
              <p>{c.uniqueness}</p>
            </div>
            <div className="three-row">
              <span className="three-k">המענה</span>
              <p>{c.response}</p>
            </div>
            {c.tool?.name && (
              <div className="tool">
                <span className="mono">כלי</span>
                <strong>{c.tool.name}</strong>
                <p>{c.tool.how}</p>
              </div>
            )}
            <div className="three-row three-row--limit">
              <span className="three-k">הגבול</span>
              <p>{c.limit}</p>
            </div>
          </div>
          {Array.isArray(c.sources) && c.sources.length > 0 && (
            <p className="sources mono">מקורות: {c.sources.join(" · ")}</p>
          )}
          <Basis basis={c.basis} />
        </div>
      </div>

      <SpaceBlock caseId={caseId} lens={lens} reading={reading} color={l.color} onReading={onReading} />
    </LensShell>
  );
}
