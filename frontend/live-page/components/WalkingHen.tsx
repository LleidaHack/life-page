"use client";

import { useEffect, useRef, useState } from "react";
import "./walking-hen.css";

// Retain eggs across client navigation, but clear them on a full page refresh.
let retainedEggs: number[] = [];
const MAX_EGGS = 10;
const EGG_MESSAGE = ""; // Pending final event copy.

export default function WalkingHen({ active }: { active: boolean }) {
  const [eggs, setEggs] = useState<number[]>([]);
  const [laying, setLaying] = useState(false);
  const hen = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEggs([...retainedEggs]);
    setLaying(false);
    if (!active) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let position = 5;
    let direction = 1;
    let elapsed = 0;
    let pause = 0;
    const interval = process.env.NODE_ENV === "development" ? 6000 : 18000;
    const timer = setInterval(() => {
      if (document.hidden) return;
      if (pause > 0) {
        pause -= 100;
        if (pause <= 0) setLaying(false);
        return;
      }
      position += direction * .4;
      if (position >= 95 || position <= 5) {
        position = Math.max(5, Math.min(95, position));
        direction *= -1;
      }
      if (hen.current) {
        hen.current.style.left = `${position}%`;
        hen.current.style.setProperty("--hen-direction", String(direction));
        hen.current.style.transition = reducedMotion.matches ? "none" : "left 100ms linear";
      }
      elapsed += 100;
      if (elapsed < interval || retainedEggs.length >= MAX_EGGS) return;
      const slot = Math.min(MAX_EGGS - 1, Math.floor(position / 10));
      if (retainedEggs.includes(slot)) return;
      elapsed = 0;
      pause = 1800;
      setLaying(true);
      retainedEggs = [...retainedEggs, slot];
      setEggs([...retainedEggs]);
    }, 100);
    return () => clearInterval(timer);
  }, [active]);

  function removeEgg(slot: number) {
    retainedEggs = retainedEggs.filter(value => value !== slot);
    setEggs([...retainedEggs]);
  }

  return <div className="hen-walk">
    {eggs.map(slot => <button key={slot} className="hen-egg" style={{ left: `${slot * 10 + 5}%` }} onClick={() => removeEgg(slot)} aria-label="Recollir l’ou">
      <img src="/hackeps/hen-egg.png" alt="" draggable={false} />
    </button>)}
    {active && <div ref={hen} className={`walking-hen${laying ? " is-laying" : ""}`} aria-hidden="true">
      {laying && EGG_MESSAGE && <span className="hen-message">{EGG_MESSAGE}</span>}
      <img src="/hackeps/walking-hen.png" alt="" draggable={false} />
    </div>}
  </div>;
}
