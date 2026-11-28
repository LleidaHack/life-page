"use client";

import { type CSSProperties, useEffect, useState } from "react";
import "./bull-reveal.css";

import { enableLiveAudio, playBullHorn, playPosterPop } from "@/lib/liveAudio";

// Each sheet lands around the perimeter before the final one covers the centre.
const posters = [
  [14, 17, -13], [81, 77, 12], [71, 9, -8], [8, 60, 16],
  [94, 34, 11], [34, 88, -9], [43, 19, 9], [66, 61, -18],
  [17, 91, 7], [90, 96, -7], [26, 45, -17], [64, 88, 15],
  [89, 54, -11], [48, 50, -3],
];

export default function BullReveal() {
  const [visible, setVisible] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setPreview(process.env.NODE_ENV === "development" && new URLSearchParams(location.search).get("preview") === "bull");
    const reveal = () => setVisible(true);
    window.addEventListener("hackeps-bull-reveal", reveal);
    return () => window.removeEventListener("hackeps-bull-reveal", reveal);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const sound = setTimeout(playBullHorn, 600);
    const finish = setTimeout(() => setVisible(false), 12_000);
    return () => { clearTimeout(sound); clearTimeout(finish); };
  }, [visible]);

  return <>
    {preview && !visible && <button className="bull-preview" type="button" onClick={async () => {
      await enableLiveAudio().catch(() => {});
      setVisible(true);
    }}>Provar animació amb so</button>}
    <div role="status">
    {visible && <div className="bull-reveal">
      <span className="sr-only">Toro mecànic a les 16:00!</span>
      <div aria-hidden="true" className="bull-charge"><i /></div>
      <div aria-hidden="true" className="bull-wall" onAnimationStart={event => {
        if (event.animationName === "bull-paste") playPosterPop();
      }}>
        {posters.map(([x, y, angle], index) => (
          <div key={index} className="bull-poster" style={{
            left: `${x}%`, top: `${y}%`, "--angle": `${angle}deg`,
            "--delay": `${3.6 + index * .17}s`,
          } as CSSProperties}>
            <strong>Toro<br />mecànic</strong>
            <span>A les <b>16:00</b></span>
          </div>
        ))}
      </div>
    </div>}
    </div>
  </>;
}
