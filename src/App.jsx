import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import TopNav from "./components/TopNav.jsx";
import Home from "./pages/Home.jsx";
import NewCase from "./pages/NewCase.jsx";
import CasePage from "./pages/CasePage.jsx";

export default function App() {
  const location = useLocation();
  return (
    <div className="app">
      <TopNav />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="page"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<NewCase />} />
            <Route path="/case/:id" element={<CasePage />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      <footer className="footer">
        <div className="footer-inner">
          <p>כלי לחשיבה, מחקר ויצירה. לא מחליף אבחון וטיפול אצל איש מקצוע שפוגש את האדם.</p>
          <p className="mono">עזרה מיידית: ער"ן 1201 · סה"ר בצ'אט · משטרה 100 · מד"א 101</p>
        </div>
      </footer>
    </div>
  );
}
