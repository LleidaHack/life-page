"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JumpingGoat from "./JumpingGoat";
import WalkingHen from "./WalkingHen";
import WalkingPig from "./WalkingPig";
import "./ambient-scenes.css";

type Scene = "hidden" | "bounce" | "flyby" | "hen" | "pig" | "tractor" | "marraco";
const DURATION: Record<Scene, number> = { hidden: 0, bounce: 6600, flyby: 4200, hen: 28000, pig: 30000, tractor: 12000, marraco: 12000 };

export default function AmbientScenes({ fullscreen = false }: { fullscreen?: boolean }) {
  const [scene, setScene] = useState<Scene>("hidden");
  const paused = useRef(false);
  const onGameChange = useCallback((open: boolean) => { paused.current = open; }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preview = process.env.NODE_ENV === "development";
    const sequence: Scene[] = fullscreen
      ? ["bounce", "hen", "pig", "tractor", "bounce", "hen", "marraco", "pig"]
      : ["bounce", "hen", "pig"];
    let index = 0;
    let remaining = preview ? 4000 : 12000;
    let current: Scene = "hidden";
    const reset = () => { current = "hidden"; remaining = 4000; setScene("hidden"); };
    motion.addEventListener("change", reset);
    const timer = setInterval(() => {
      if (document.hidden || motion.matches || paused.current) return;
      remaining -= 100;
      if (remaining > 0) return;
      if (current !== "hidden") {
        current = "hidden";
        remaining = preview ? 8000 + Math.random() * 8000 : 20000 + Math.random() * 20000;
      } else {
        current = sequence[index++ % sequence.length];
        if (current === "bounce" && index > 1 && Math.random() < .08) current = "flyby";
        remaining = DURATION[current];
      }
      setScene(current);
    }, 100);
    return () => { clearInterval(timer); motion.removeEventListener("change", reset); };
  }, [fullscreen]);

  return <>
    <div className="ambient-grass" aria-hidden="true" />
    <JumpingGoat scene={scene === "bounce" || scene === "flyby" ? scene : "hidden"} onGameChange={onGameChange} />
    <WalkingHen active={scene === "hen"} />
    {scene === "pig" && <WalkingPig />}
      <div className="screen-parade" aria-hidden="true">
        {scene === "tractor" && <div className="screen-parade-tractor">
          <svg viewBox="0 0 360 250">
            <path d="M65 145V65H170V145H260L290 185H55Z" fill="#ff7430" />
            <path d="M83 80H148V135H83Z" fill="#94cbf5" />
            <path
              d="M190 115V70H204V145"
              fill="none"
              stroke="#eee"
              strokeWidth="12"
            />
            <circle cx="100" cy="190" r="48" fill="#111" />
            <circle cx="100" cy="190" r="25" fill="#eee" />
            <circle cx="260" cy="200" r="31" fill="#111" />
            <circle cx="260" cy="200" r="15" fill="#eee" />
          </svg>
        </div>}
        {scene === "marraco" && <div className="screen-parade-marraco">
          <img
            src="/hackeps/marraco-hacker.webp"
            alt=""
            width={64}
            height={64}
          />
        </div>}
      </div>
  </>;
}
