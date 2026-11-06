"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "./jumping-goat.css";

const GoatClimb = dynamic(() => import("./GoatClimb"), { ssr: false });

type GoatScene = "hidden" | "bounce" | "flyby";

export default function JumpingGoat() {
  const [scene, setScene] = useState<GoatScene>("hidden");

  const [gameOpen, setGameOpen] = useState(false);
  const taps = useRef({ count: 0, since: 0 });
  const closeGame = useCallback(() => setGameOpen(false), []);
  function tapGoat() {
    const now = Date.now();
    if (now - taps.current.since > 10000) taps.current = { count: 0, since: now };
    taps.current.count += 1;
    if (taps.current.count >= 5) { taps.current.count = 0; setGameOpen(true); }
  }

  useEffect(() => {
    if (gameOpen) { setScene("hidden"); return; }
    const preview = process.env.NODE_ENV === "development";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout>;
    let appearances = 0;
    let stopped = false;

    function schedule(delay: number) {
      timer = setTimeout(() => {
        if (stopped || reducedMotion.matches) return;
        if (document.hidden) { schedule(5000); return; }
        appearances += 1;
        const giant = preview ? appearances % 2 === 0 : Math.random() < 0.08;
        setScene(giant ? "flyby" : "bounce");
        timer = setTimeout(() => {
          setScene("hidden");
          schedule(preview ? 3000 : 30000 + Math.random() * 45000);
        }, giant ? 4200 : 6600);
      }, delay);
    }

    function restart() {
      clearTimeout(timer);
      setScene("hidden");
      if (!reducedMotion.matches) schedule(preview ? 1200 : 15000);
    }
    restart();
    reducedMotion.addEventListener("change", restart);
    return () => {
      stopped = true;
      clearTimeout(timer);
      reducedMotion.removeEventListener("change", restart);
    };
  }, [gameOpen]);

  return <>
    {gameOpen && <GoatClimb onClose={closeGame} />}
    {scene === "flyby" && <button className="goat-flyby" onClick={tapGoat} aria-label="Cabra gegant"><img src="/hackeps/jumping-goat.png" alt="" width={1254} height={1254} draggable={false} /></button>}
    {scene === "bounce" && <div className="jumping-goat">
      <img className="jumping-goat-trampoline" src="/hackeps/goat-trampoline.png" alt="" width={1774} height={887} draggable={false} />
      <span className="jumping-goat-shadow" aria-hidden="true" />
      <button className="jumping-goat-character" onClick={tapGoat} aria-label="Cabra saltant"><img src="/hackeps/jumping-goat.png" alt="" width={1254} height={1254} draggable={false} /></button>
    </div>}
  </>;
}
