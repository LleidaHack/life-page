"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JumpingGoat from "./JumpingGoat";
import WalkingHen from "./WalkingHen";
import WalkingPig from "./WalkingPig";
import "./ambient-scenes.css";

type Scene = "hidden" | "bounce" | "flyby" | "hen" | "pig";
const DURATION: Record<Scene, number> = { hidden: 0, bounce: 6600, flyby: 4200, hen: 28000, pig: 30000 };

export default function AmbientScenes({ fullscreen = false }: { fullscreen?: boolean }) {
  const [scene, setScene] = useState<Scene>("hidden");
  const paused = useRef(false);
  const onGameChange = useCallback((open: boolean) => { paused.current = open; }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preview = process.env.NODE_ENV === "development";
    const sequence: Scene[] = fullscreen
      ? ["bounce", "bounce", "bounce", "flyby"]
      : ["bounce", "hen", "pig"];
    let index = 0;
    const initialDelay = fullscreen ? 90000 : preview ? 4000 : 12000;
    let remaining = initialDelay;
    let current: Scene = "hidden";
    const reset = () => { current = "hidden"; remaining = initialDelay; setScene("hidden"); };
    motion.addEventListener("change", reset);
    const timer = setInterval(() => {
      if (document.hidden || motion.matches || paused.current) return;
      remaining -= 100;
      if (remaining > 0) return;
      if (current !== "hidden") {
        current = "hidden";
        remaining = fullscreen
          ? 120000 + Math.random() * 120000
          : preview ? 8000 + Math.random() * 8000 : 20000 + Math.random() * 20000;
      } else {
        current = sequence[index++ % sequence.length];
        if (!fullscreen && current === "bounce" && index > 1 && Math.random() < .08) current = "flyby";
        remaining = DURATION[current];
      }
      setScene(current);
    }, 100);
    return () => { clearInterval(timer); motion.removeEventListener("change", reset); };
  }, [fullscreen]);

  return <>
    {!fullscreen && <div className="ambient-grass" aria-hidden="true" />}
    <JumpingGoat scene={scene === "bounce" || scene === "flyby" ? scene : "hidden"} onGameChange={onGameChange} />
    {!fullscreen && <WalkingHen active={scene === "hen"} />}
    {!fullscreen && scene === "pig" && <WalkingPig />}
  </>;
}
