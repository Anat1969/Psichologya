import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { analyze, getCase } from "../api.js";
import { LENS, LENSES, THREE } from "../lenses.js";
import { formatDate } from "../util.js";
import IntakePanel from "../components/IntakePanel.jsx";
import LensCard from "../components/LensCard.jsx";
import SynthesisCard from "../components/SynthesisCard.jsx";
import Motif from "../components/Motif.jsx";

export default function CasePage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [c, setC] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [readings, setReadings] = useState({});
  const [status, setStatus] = useState({});
  const [errors, setErrors] = useState({});
  const [proceed, setProceed] = useState(false);
  const started = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const row = await getCase(id);
      if (!row) {
        setLoadErr("המקרה לא נמצא");
        return;
      }
      const map = {};
      for (const r of row.merhav_readings ?? []) map[r.lens] = r;
      setReadings(map);
      setStatus(Object.fromEntries(LENSES.map((l) => [l.id, map[l.id] ? "ready" : "idle"])));
      setC(row);
    } catch (e) {
      setLoadErr(e.message);
    }
  }, [id]);

  useEffect(() => {
    started.current = new Set();
    setC(null);
    setProceed(false);
    load();
  }, [load]);

  const setReading = (r) => r && setReadings((m) => ({ ...m, [r.lens]: r }));

  const run = useCallback(
    async (lens) => {
      setStatus((s) => ({ ...s, [lens]: "running" }));
      setErrors((e) => ({ ...e, [lens]: "" }));
      try {
        const payload = lens === "synthesis" ? { action: "synthesis", caseId: id } : { action: "lens", caseId: id, lens };
        const { reading } = await analyze(payload);
        setReading(reading);
        setStatus((s) => ({ ...s, [lens]: "ready" }));
      } catch (e) {
        setErrors((x) => ({ ...x, [lens]: e.message }));
        setStatus((s) => ({ ...s, [lens]: "error" }));
      }
    },
    [id],
  );

  const intake = c?.intake ?? {};
  const acute = c?.risk_level === "acute";
  const anyReading = Object.keys(readings).length > 0;
  const mayRun = c && !acute && (intake.sufficient || proceed || anyReading);

  // Three lenses in parallel, once each.
  useEffect(() => {
    if (!mayRun) return;
    for (const lens of THREE) {
      if (!readings[lens] && !started.current.has(lens)) {
        started.current.add(lens);
        run(lens);
      }
    }
  }, [mayRun, readings, run]);

  // Synthesis as soon as all three exist.
  const threeReady = THREE.every((l) => readings[l]);
  useEffect(() => {
    if (!mayRun || !threeReady || readings.synthesis || started.current.has("synthesis")) return;
    started.current.add("synthesis");
    run("synthesis");
  }, [mayRun, threeReady, readings.synthesis, run]);

  // A lens re-read after the synthesis was built makes the synthesis stale.
  const [regenerated, setRegenerated] = useState(false);
  const stale = Boolean(readings.synthesis) && regenerated;

  const regen = async (lens) => {
    await run(lens);
    if (lens !== "synthesis" && readings.synthesis) setRegenerated(true);
  };

  const onAnswer = async (answers) => {
    const { case: updated } = await analyze({ action: "answer", caseId: id, answers });
    setC((old) => ({ ...old, ...updated }));
  };

  // Deep link: ?lens=<id> scrolls to that card.
  const focus = params.get("lens");
  useEffect(() => {
    if (!focus || !c) return;
    const t = setTimeout(() => document.getElementById(`lens-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    return () => clearTimeout(t);
  }, [focus, c, status[focus]]); // eslint-disable-line react-hooks/exhaustive-deps

  const goLens = (lens) => {
    setParams({ lens }, { replace: true });
    document.getElementById(`lens-${lens}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loadErr)
    return (
      <div className="wrap center-block">
        <p className="error">{loadErr}</p>
        <Link to="/" className="btn">לדף הבית</Link>
      </div>
    );

  if (!c)
    return (
      <div className="wrap center-block">
        <Motif lens="synthesis" size={110} />
        <p className="muted">טוען את המקרה</p>
      </div>
    );

  return (
    <div className="case">
      <header className="case-head wrap">
        <div className="case-head-text">
          <span className="mono">{c.code} · {formatDate(c.created_at)}</span>
          <h1>{c.title || c.code}</h1>
          <details className="case-body">
            <summary>תיאור המקרה</summary>
            <p>{c.body}</p>
            {c.answers && (
              <>
                <span className="mono">תשובות לבירור</span>
                <p>{c.answers}</p>
              </>
            )}
          </details>
          <div className="row">
            <Link to={`/new?from=${c.id}`} className="btn btn--ghost btn--small" data-testid="revise">
              עריכת המקרה והרצה מחדש
            </Link>
            {c.parent_id && (
              <Link to={`/case/${c.parent_id}`} className="btn btn--ghost btn--small">
                הגרסה הקודמת
              </Link>
            )}
          </div>
        </div>
        <div className="case-head-motif">
          <Motif lens="synthesis" size={150} />
        </div>
      </header>

      <div className="wrap">
        <IntakePanel c={c} onAnswer={onAnswer} onProceed={() => setProceed(true)} proceeding={proceed} readingsStarted={mayRun} />
      </div>

      {!acute && (
        <>
          <nav className="rail" aria-label="ניווט בין העדשות">
            <div className="rail-inner">
              {LENSES.map((l) => (
                <button
                  key={l.id}
                  className={`rail-btn ${focus === l.id ? "is-active" : ""} is-${status[l.id] ?? "idle"}`}
                  style={{ "--lens": l.color }}
                  onClick={() => goLens(l.id)}
                  data-testid={`rail-${l.id}`}
                >
                  <span className="rail-dot" />
                  <span>{l.short}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="lenses wrap">
            {THREE.map((lens) => (
              <LensCard
                key={lens}
                caseId={c.id}
                lens={lens}
                reading={readings[lens]}
                status={mayRun || readings[lens] ? status[lens] ?? "idle" : "idle"}
                error={errors[lens]}
                onRetry={() => run(lens)}
                onRegenerate={() => regen(lens)}
                onReading={setReading}
              />
            ))}
            <SynthesisCard
              caseId={c.id}
              reading={readings.synthesis}
              status={status.synthesis ?? "idle"}
              error={errors.synthesis}
              onRetry={() => run("synthesis")}
              onRegenerate={() => {
                setRegenerated(false);
                run("synthesis");
              }}
              onReading={setReading}
              stale={stale}
              waiting={!threeReady}
            />
          </div>
        </>
      )}

      {!mayRun && !acute && (
        <motion.p className="wrap muted center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          העדשות ייפתחו אחרי הבירור, או בלחיצה על "המשך עם מה שיש".
        </motion.p>
      )}
      <div className="wrap legend mono">
        {LENSES.map((l) => (
          <span key={l.id} style={{ "--lens": l.color }}>{LENS[l.id].tension}</span>
        ))}
      </div>
    </div>
  );
}
