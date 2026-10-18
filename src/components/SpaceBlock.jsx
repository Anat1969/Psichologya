import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { uploadImage, removeImage } from "../api.js";
import { copyText, latestImage } from "../util.js";

// One active drop zone at a time receives Ctrl+V / Cmd+V.
let activeZone = null;
if (typeof window !== "undefined" && !window.__merhavPaste) {
  window.__merhavPaste = true;
  window.addEventListener("paste", (e) => {
    if (!activeZone) return;
    const tag = document.activeElement?.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT") return;
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      activeZone(file);
    }
  });
}

export default function SpaceBlock({ caseId, lens, reading, color, onReading }) {
  const space = reading?.content?.space ?? {};
  const prompt = reading?.prompt_he ?? "";
  const img = latestImage(reading);
  const history = Array.isArray(reading?.images) ? reading.images : [];
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);
  const handlerRef = useRef(null);

  const send = async (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setErr("אפשר להעלות JPG, PNG או WEBP");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const { reading: r } = await uploadImage(caseId, lens, file);
      onReading?.(r);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  handlerRef.current = send;

  useEffect(() => () => {
    if (activeZone === handlerRef.current) activeZone = null;
  }, []);

  const arm = () => { activeZone = (f) => handlerRef.current(f); };

  const copy = async () => {
    const ok = await copyText(prompt);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  };

  const remove = async () => {
    if (!img) return;
    setBusy(true);
    try {
      const { reading: r } = await removeImage(caseId, lens, img.url);
      onReading?.(r);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space" style={{ "--lens": color }}>
      <div className="space-text">
        <span className="tag">כמרחב</span>
        {space.principle && <p className="space-principle mono">{space.principle}</p>}
        {space.distill && <p className="space-distill">{space.distill}</p>}
        <div className="prompt">
          <div className="prompt-head">
            <span className="mono">פרומפט למידג'רני</span>
            <button className={`btn btn--small ${copied ? "is-done" : ""}`} onClick={copy} data-testid={`copy-${lens}`}>
              {copied ? "הועתק" : "העתקת הפרומפט"}
            </button>
          </div>
          <p className="prompt-body" dir="rtl">{prompt}</p>
        </div>
      </div>

      <div
        className={`drop ${over ? "is-over" : ""} ${img ? "has-img" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="אזור העלאת תמונה: גרירה, הדבקה או בחירת קובץ"
        data-testid={`drop-${lens}`}
        onMouseEnter={arm}
        onFocus={arm}
        onDragOver={(e) => { e.preventDefault(); setOver(true); arm(); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          send(e.dataTransfer.files?.[0]);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); }
        }}
      >
        <AnimatePresence mode="wait">
          {img ? (
            <motion.img
              key={img.url}
              src={img.url}
              alt={space.distill || "המרחב"}
              className="drop-img"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          ) : (
            <motion.div key="empty" className="drop-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span className="drop-frame" />
              <p>גררי לכאן את התמונה ממידג'רני</p>
              <p className="muted">או העתיקי אותה והדביקי כאן</p>
            </motion.div>
          )}
        </AnimatePresence>
        {busy && <div className="drop-busy"><span className="spinner" />מעלה</div>}
      </div>

      <div className="drop-actions">
        <button className="btn btn--ghost btn--small" onClick={() => fileRef.current?.click()} data-testid={`pick-${lens}`}>
          {img ? "החלפת תמונה" : "בחירת קובץ"}
        </button>
        {img && (
          <>
            <a className="btn btn--ghost btn--small" href={img.url} target="_blank" rel="noreferrer" download>
              פתיחת התמונה
            </a>
            <button className="btn btn--ghost btn--small" onClick={remove} data-testid={`remove-${lens}`}>
              הסרת התמונה
            </button>
          </>
        )}
        {history.length > 1 && <span className="mono muted">{history.length} גרסאות</span>}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          data-testid={`file-${lens}`}
          onChange={(e) => { send(e.target.files?.[0]); e.target.value = ""; }}
        />
      </div>
      {err && <p className="error">{err}</p>}
    </div>
  );
}
