"use client";
import { useEffect, useRef, useState } from "react";
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function drawHayBale(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  roundedRect(ctx, x + 3, y + 5, 62, 42, 6, "#30241455");
  roundedRect(ctx, x, y, 62, 42, 5, "#9b6223");
  roundedRect(ctx, x + 2, y + 2, 58, 32, 4, "#e8b94e");
  ctx.lineWidth = 1;
  for (let row = 0; row < 6; row++) {
    for (let column = 0; column < 7; column++) {
      const offset = (row * 7 + column * 3) % 5;
      ctx.strokeStyle = (row + column) % 2 ? "#f9d881" : "#be8830";
      ctx.beginPath();
      ctx.moveTo(x + 4 + column * 8, y + 5 + row * 5);
      ctx.lineTo(x + 9 + column * 8, y + 3 + row * 5 + offset);
      ctx.stroke();
    }
  }
  for (const band of [15, 45]) {
    roundedRect(ctx, x + band, y + 1, 4, 40, 1, "#68512c");
    ctx.fillStyle = "#a28a52";
    ctx.fillRect(x + band, y + 2, 1, 30);
  }
  ctx.restore();
}

function drawTractor(ctx: CanvasRenderingContext2D, x: number, distance: number) {
  ctx.save();
  roundedRect(ctx, x - 7, 433, 68, 66, 12, "#30241455");
  // Front wheels and large rear wheels, seen from above.
  for (const wheel of [{x: x - 5, y: 431, w: 12, h: 22}, {x: x + 43, y: 431, w: 12, h: 22},
    {x: x - 9, y: 464, w: 17, h: 31}, {x: x + 42, y: 464, w: 17, h: 31}]) {
    roundedRect(ctx, wheel.x, wheel.y, wheel.w, wheel.h, 4, "#202322");
    ctx.strokeStyle = "#555b54";
    ctx.lineWidth = 2;
    for (let tread = 3; tread < wheel.h - 3; tread += 6) {
      const offset = (distance * 3) % 3;
      ctx.beginPath();
      ctx.moveTo(wheel.x + 2, wheel.y + tread + offset);
      ctx.lineTo(wheel.x + wheel.w - 2, wheel.y + tread + 2 + offset);
      ctx.stroke();
    }
  }
  roundedRect(ctx, x + 3, 430, 44, 66, 6, "#af431d");
  roundedRect(ctx, x + 8, 430, 34, 31, 6, "#ff7430");
  roundedRect(ctx, x + 12, 433, 5, 23, 2, "#ffac65");
  roundedRect(ctx, x + 10, 430, 30, 5, 2, "#343b38");
  for (const light of [x + 6, x + 39]) roundedRect(ctx, light, 435, 5, 7, 2, "#fff1b3");
  roundedRect(ctx, x + 34, 442, 5, 16, 2, "#393d39");
  roundedRect(ctx, x + 2, 461, 46, 32, 5, "#31473e");
  roundedRect(ctx, x + 7, 462, 36, 18, 3, "#8dd2e4");
  ctx.fillStyle = "#d4f3ef";
  ctx.beginPath();
  ctx.moveTo(x + 10, 464); ctx.lineTo(x + 28, 464); ctx.lineTo(x + 10, 477); ctx.fill();
  roundedRect(ctx, x, 480, 50, 13, 3, "#ff853b");
  roundedRect(ctx, x + 5, 482, 40, 3, 1, "#ffb878");
  for (const light of [x + 4, x + 41]) roundedRect(ctx, light, 490, 5, 4, 1, "#ffcf75");
  ctx.restore();
}

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
      ctx.fillStyle = "#809951";
      ctx.fillRect(0, 0, 360, 540);
      ctx.fillStyle = "#a78051";
      ctx.fillRect(35, 0, 290, 540);
      ctx.strokeStyle = "#dac29a";
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
        drawHayBale(ctx, 52 + o.lane * 96, o.y);
        if (o.lane === lane.current && o.y + 42 > 430 && o.y < 496) {
          stopped = true;
          setOver(true);
        }
      }
      obstacles = obstacles.filter((o) => o.y < 560);
      const x = 54 + lane.current * 96;
      drawTractor(ctx, x, distance);
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
