import { motion } from "framer-motion";
import { LENS } from "../lenses.js";

// Abstract, moving signatures of each lens's spatial grammar. Not icons: each one
// enacts the mechanism of change (layers of time, a wall stepping back, breath,
// three planes becoming one).
export default function Motif({ lens, size = 120, active = true }) {
  const l = LENS[lens];
  const s = size;
  if (l.motif === "strata") {
    const bands = [0.9, 0.62, 0.78, 0.5, 0.7, 0.4, 0.58];
    return (
      <div className="motif" style={{ width: s, height: s }} aria-hidden="true">
        {bands.map((w, i) => (
          <motion.span
            key={i}
            className="motif-band"
            style={{ background: l.color, top: `${8 + i * 12.5}%`, opacity: 0.25 + i * 0.1 }}
            initial={{ width: "8%" }}
            animate={active ? { width: [`${w * 60}%`, `${w * 100}%`, `${w * 60}%`] } : { width: `${w * 80}%` }}
            transition={{ duration: 7, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
          />
        ))}
        <motion.span
          className="motif-threshold"
          style={{ background: l.deep }}
          animate={active ? { right: ["12%", "72%", "12%"] } : {}}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }
  if (l.motif === "recede") {
    return (
      <div className="motif motif--recede" style={{ width: s, height: s }} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="motif-frame"
            style={{ borderColor: l.color, opacity: 1 - i * 0.2 }}
            animate={active ? { inset: [`${i * 9}%`, `${i * 9 + 6}%`, `${i * 9}%`] } : { inset: `${i * 9}%` }}
            transition={{ duration: 6, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
          />
        ))}
        <motion.span
          className="motif-void"
          animate={active ? { opacity: [0.55, 1, 0.55] } : {}}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }
  if (l.motif === "breath") {
    return (
      <div className="motif motif--breath" style={{ width: s, height: s }} aria-hidden="true">
        <motion.span
          className="motif-ring"
          style={{ borderColor: l.color }}
          animate={active ? { scale: [0.82, 1, 0.82], opacity: [0.35, 0.8, 0.35] } : {}}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="motif-core"
          style={{ background: `radial-gradient(circle at 40% 35%, ${l.soft}, ${l.color})` }}
          animate={active ? { scale: [0.7, 0.86, 0.7] } : {}}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }
  // converge
  const planes = [LENS.biographical.color, LENS.tzimtzum.color, LENS.buddhist.color];
  return (
    <div className="motif motif--converge" style={{ width: s, height: s }} aria-hidden="true">
      {planes.map((c, i) => (
        <motion.span
          key={c}
          className="motif-plane"
          style={{ background: c }}
          animate={
            active
              ? { x: [(i - 1) * s * 0.22, 0, (i - 1) * s * 0.22], rotate: [(i - 1) * 14, 0, (i - 1) * 14], opacity: [0.75, 0.55, 0.75] }
              : {}
          }
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
