import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DEV_CHAT_URL, LOGO_URL, RESEARCH_PROJECT_URL } from "../config.js";
import { copyText } from "../util.js";

export default function TopNav() {
  const [installEvt, setInstallEvt] = useState(null);
  const [toast, setToast] = useState("");
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    setOpen(false);
    const ok = await copyText(window.location.href);
    flash(ok ? "הקישור הועתק" : "לא הצלחתי להעתיק");
  };

  const install = async () => {
    if (!installEvt) return;
    setOpen(false);
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

        <nav className="nav-links">
          <Link to="/new" className="nav-btn nav-btn--accent">
            מקרה חדש
          </Link>
          <div className="sys" ref={menuRef}>
            <button
              className={`sys-toggle ${LOGO_URL ? "sys-toggle--logo" : "nav-btn"}`}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="מערכת"
              onClick={() => setOpen((v) => !v)}
            >
              {LOGO_URL ? <img src={LOGO_URL} alt="מערכת" /> : "מערכת"}
            </button>
            <div className={`sys-menu ${open ? "is-open" : ""}`} role="menu">
              <button className="nav-btn" role="menuitem" onClick={copyLink}>
                העתקת קישור
              </button>
              <a className="nav-btn" role="menuitem" href={DEV_CHAT_URL} target="_blank" rel="noreferrer">
                שיחת הפיתוח
              </a>
              <a className="nav-btn" role="menuitem" href={RESEARCH_PROJECT_URL} target="_blank" rel="noreferrer">
                פרויקט המחקר
              </a>
              {installEvt && (
                <button className="nav-btn nav-btn--install" role="menuitem" onClick={install}>
                  התקנת האפליקציה
                </button>
              )}
            </div>
          </div>
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
