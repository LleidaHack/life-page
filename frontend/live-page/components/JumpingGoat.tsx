"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "./jumping-goat.css";

const GoatClimb = dynamic(() => import("./GoatClimb"), { ssr: false });

type GoatScene = "hidden" | "bounce" | "flyby";

export default function JumpingGoat({ scene, onGameChange }: { scene: GoatScene; onGameChange: (open: boolean) => void }) {

  const [gameOpen, setGameOpen] = useState(false);
  const taps = useRef({ count: 0, since: 0 });
  const closeGame = useCallback(() => { setGameOpen(false); onGameChange(false); }, [onGameChange]);
  function tapGoat() {
    const now = Date.now();
    if (now - taps.current.since > 10000) taps.current = { count: 0, since: now };
    taps.current.count += 1;
    if (taps.current.count >= 5) { taps.current.count = 0; setGameOpen(true); onGameChange(true); }
  }

  return <>
    {gameOpen && <GoatClimb onClose={closeGame} />}
    {!gameOpen && scene === "flyby" && <button className="goat-flyby" onClick={tapGoat} aria-label="Cabra gegant"><img src="/hackeps/jumping-goat.png" alt="" width={1254} height={1254} draggable={false} /></button>}
    {!gameOpen && scene === "bounce" && <div className="jumping-goat">
      <img className="jumping-goat-trampoline" src="/hackeps/goat-trampoline.png" alt="" width={1774} height={887} draggable={false} />
      <span className="jumping-goat-shadow" aria-hidden="true" />
      <button className="jumping-goat-character" onClick={tapGoat} aria-label="Cabra saltant"><img src="/hackeps/jumping-goat.png" alt="" width={1254} height={1254} draggable={false} /></button>
    </div>}
  </>;
}
