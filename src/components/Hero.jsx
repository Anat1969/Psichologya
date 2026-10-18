import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { LENSES } from "../lenses.js";

// Three translucent planes in perspective. They drift apart with the pointer and
// fold into one plane in the middle: three readings, one space.
export default function Hero() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const rotY = useTransform(sx, [-1, 1], [-14, 14]);
  const rotX = useTransform(sy, [-1, 1], [10, -10]);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  return (
    <section className="hero" onPointerMove={onMove} onPointerLeave={() => { mx.set(0); my.set(0); }}>
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-inner wrap">
        <div className="hero-text">
          <motion.span className="mono hero-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            מעבדה לחשיבה ביוגרפית
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}>
            מקרה אחד.
            <br />
            שלוש עדשות.
            <br />
            <span className="hero-accent">מרחב אחד.</span>
          </motion.h1>
          <motion.p className="hero-sub" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}>
            כותבים מקרה. כל עדשה קוראת אותו דרך מנגנון שינוי אחר, מציעה מענה, ומתרגמת את המענה למרחב מחייה. הסינתזה מחברת את שלושתן לתמונה אחת ולמרחב אחד.
          </motion.p>
          <motion.div className="row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
            <Link to="/new" className="btn btn--big" data-testid="hero-new">
              מקרה חדש
            </Link>
            <a href="#cases" className="btn btn--ghost btn--big">
              המקרים
            </a>
          </motion.div>
        </div>

        <div className="hero-stage" aria-hidden="true">
          <motion.div className="stage" style={{ rotateY: rotY, rotateX: rotX }}>
            {LENSES.slice(0, 3).map((l, i) => (
              <motion.div
                key={l.id}
                className="stage-plane"
                style={{ background: `linear-gradient(150deg, ${l.soft}, ${l.color} 60%, ${l.deep})` }}
                initial={{ opacity: 0, z: -200, x: 0 }}
                animate={{ opacity: 0.84, z: [i * 70 - 70, i * 70 - 40, i * 70 - 70], x: [(i - 1) * 70, (i - 1) * 26, (i - 1) * 70], y: [(1 - i) * 18, 0, (1 - i) * 18] }}
                transition={{ opacity: { duration: 0.8, delay: 0.3 + i * 0.15 }, default: { duration: 10, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 } }}
              >
                <span className="mono">{l.short}</span>
              </motion.div>
            ))}
            <motion.div
              className="stage-core"
              animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.65, 1, 0.65] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
