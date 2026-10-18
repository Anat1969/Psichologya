import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DEV_CHAT_URL, RESEARCH_PROJECT_URL } from "../config.js";
import { copyText } from "../util.js";

export default function TopNav() {
  const [installEvt, setInstallEvt] = useState(null);
  const [toast, setToast] = useState("");
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const copyLink = async () => {
    const ok = await copyText(window.location.href);
    flash(ok ? "הקישור הועתק" : "לא הצלחתי להעתיק");
  };

  const install = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice.catch(() => null);
    setInstallEvt(null);
  };

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Link to="/" className="brand" aria-label="מרחב פנימי, דף הבית">
          <span className="brand-mark" aria-hidden="true">
            <i style={{ background: "#a8742f" }} />
            <i style={{ background: "#41508a" }} />
            <i style={{ background: "#5b7c63" }} />
          </span>
          <span className="brand-name">מרחב פנימי</span>
        </Link>

        <button className="nav-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "סגירה" : "תפריט"}
        </button>

        <nav className={`nav-links ${open ? "is-open" : ""}`}>
          <Link to="/new" className="nav-btn nav-btn--accent">
            מקרה חדש
          </Link>
          <button className="nav-btn" onClick={copyLink}>
            העתקת קישור
          </button>
          <a className="nav-btn" href={DEV_CHAT_URL} target="_blank" rel="noreferrer">
            שיחת הפיתוח
          </a>
          <a className="nav-btn" href={RESEARCH_PROJECT_URL} target="_blank" rel="noreferrer">
            פרויקט המחקר
          </a>
          {installEvt && (
            <button className="nav-btn nav-btn--install" onClick={install}>
              התקנת האפליקציה
            </button>
          )}
        </nav>
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
