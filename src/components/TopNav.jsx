import { Link } from "react-router-dom";
import { DEV_CHAT_URL, RESEARCH_PROJECT_URL } from "../config.js";

export default function TopNav() {
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
          {/* A&I logo button: copy link, dev chat, research, install (https://appofapp-gh.vercel.app/ai-menu.js) */}
          <div className="sys">
            <ai-menu chat={DEV_CHAT_URL} research={RESEARCH_PROJECT_URL} />
          </div>
        </nav>
      </div>
    </header>
  );
}
