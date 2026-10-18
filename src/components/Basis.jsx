const ROWS = [
  ["facts", "עובדה", "מה שנאמר"],
  ["assessments", "הערכה", "מה שמוערך"],
  ["assumptions", "הנחה", "מה שמונח"],
];

export default function Basis({ basis }) {
  if (!basis) return null;
  const has = ROWS.some(([k]) => basis[k]?.length);
  if (!has) return null;
  return (
    <details className="basis">
      <summary>עובדה, הערכה והנחה</summary>
      <div className="basis-grid">
        {ROWS.map(([k, label, hint]) =>
          basis[k]?.length ? (
            <div key={k} className={`basis-col basis-col--${k}`}>
              <span className="mono">{label}</span>
              <span className="muted small">{hint}</span>
              <ul>
                {basis[k].map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </details>
  );
}
