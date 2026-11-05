"use client";
import { useEffect, useRef, useState } from "react";
export default function TractorRun({ onClose }: { onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    lane = useRef(1),
    [score, setScore] = useState(0),
    [over, setOver] = useState(false),
    [round, setRound] = useState(0);
  useEffect(() => {
    const c = canvas.current!,
      ctx = c.getContext("2d")!;
    let frame = 0,
      last = 0,
      distance = 0,
      spawn = 0;
    let obstacles: { lane: number; y: number }[] = [];
    let stopped = false;
    lane.current = 1;
    setScore(0);
    setOver(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        lane.current = Math.max(
          0,
          Math.min(2, lane.current + (e.key === "ArrowLeft" ? -1 : 1)),
        );
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    const draw = (time: number) => {
      if (stopped) return;
      const delta = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      distance += delta * 10;
      spawn += delta;
      const speed = 160 + Math.min(distance, 180);
      if (spawn > 1) {
        obstacles.push({ lane: Math.floor(Math.random() * 3), y: -50 });
        spawn = 0;
      }
      ctx.fillStyle = "#78c6bd";
      ctx.fillRect(0, 0, 360, 540);
      ctx.fillStyle = "#3c3c3c";
      ctx.fillRect(35, 0, 290, 540);
      ctx.strokeStyle = "#ffffff";
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = -distance * 10;
      for (const x of [132, 228]) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 540);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const o of obstacles) {
        o.y += delta * speed;
        ctx.fillStyle = "#ff7430";
        ctx.fillRect(52 + o.lane * 96, o.y, 62, 42);
        ctx.strokeStyle = "#2e2e2e";
        ctx.strokeRect(52 + o.lane * 96, o.y, 62, 42);
        if (o.lane === lane.current && o.y + 42 > 430 && o.y < 496) {
          stopped = true;
          setOver(true);
        }
      }
      obstacles = obstacles.filter((o) => o.y < 560);
      const x = 54 + lane.current * 96;
      ctx.fillStyle = "#2e2e2e";
      ctx.fillRect(x - 6, 452, 16, 40);
      ctx.fillRect(x + 44, 452, 16, 40);
      ctx.fillStyle = "#ff7430";
      ctx.fillRect(x, 430, 50, 66);
      ctx.fillStyle = "#94cbf5";
      ctx.fillRect(x + 9, 440, 32, 24);
      setScore(Math.floor(distance));
      if (!stopped) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", key);
    };
  }, [round, onClose]);
  return (
    <div
      className="tractor-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Tractor Run"
    >
      <h2>Tractor Run · {score} m</h2>
      <p>Esquiva les bales de palla. ← → o botons tàctils.</p>
      <canvas ref={canvas} width={360} height={540} />
      {over && (
        <>
          <strong>Fi de la collita! {score} metres</strong>
          <button onClick={() => setRound(round + 1)}>Tornar a jugar</button>
        </>
      )}
      <div className="tractor-controls">
        <button
          aria-label="Esquerra"
          onClick={() => (lane.current = Math.max(0, lane.current - 1))}
        >
          ←
        </button>
        <button
          aria-label="Dreta"
          onClick={() => (lane.current = Math.min(2, lane.current + 1))}
        >
          →
        </button>
        <button onClick={onClose}>Tancar</button>
      </div>
    </div>
  );
}
