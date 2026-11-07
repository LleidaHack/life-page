"use client";

import { useEffect, useRef, useState } from "react";
import "./goat-climb.css";

const WIDTH = 360;
const HEIGHT = 560;
type Platform = { x: number; y: number; width: number };

export default function GoatClimb({ onClose }: { onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const direction = useRef(0);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    element.width = WIDTH * scale;
    element.height = HEIGHT * scale;
    context.scale(scale, scale);
    const goat = new Image();
    goat.src = "/hackeps/jumping-goat.png";
    const keys = new Set<string>();
    let frame = 0, last = 0, lastHud = 0, camera = 0, score = 0, ended = false;
    const player = { x: WIDTH / 2 - 20, y: HEIGHT - 100, velocity: -430 };
    let platforms: Platform[] = [{ x: 0, y: HEIGHT - 38, width: WIDTH }];
    let highest = HEIGHT - 38, previousX = WIDTH / 2 - 40;
    function addPlatform() {
      const level = Math.floor(score / 50);
      highest -= 66 + Math.random() * Math.min(20, 8 + level * 2);
      const width = Math.max(58, 92 - level * 4);
      const x = Math.max(12, Math.min(WIDTH - width - 12, previousX + (Math.random() - .5) * 220));
      platforms.push({ x, y: highest, width });
      previousX = x;
    }
    while (highest > -150) addPlatform();
    setResult(null); setHeight(0); direction.current = 0;

    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D", " "].includes(event.key)) {
        event.preventDefault(); keys.add(event.key.toLowerCase());
        if (event.key === " " && ended) setRound(value => value + 1);
      }
      if (event.key === "Tab") {
        const buttons = Array.from(element.closest('[role="dialog"]')!.querySelectorAll<HTMLButtonElement>("button"));
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.shiftKey ? (index <= 0 ? buttons.length - 1 : index - 1) : (index + 1) % buttons.length;
        event.preventDefault(); buttons[next]?.focus();
      }
    };
    const keyup = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const resetKeys = () => { keys.clear(); direction.current = 0; last = 0; };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", resetKeys);
    document.addEventListener("visibilitychange", resetKeys);

    function draw(timestamp: number) {
      if (!context) return;
      const dt = last ? Math.min((timestamp - last) / 1000, .032) : 0;
      last = timestamp;
      if (!document.hidden && !ended) {
        const move = direction.current || (Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a")));
        player.x += move * 260 * dt;
        if (player.x > WIDTH) player.x = -40;
        if (player.x < -40) player.x = WIDTH;
        const previousFeet = player.y + 44;
        player.velocity += 1000 * dt;
        player.y += player.velocity * dt;
        if (player.velocity > 0) {
          const landing = platforms.find(p => previousFeet <= p.y && player.y + 44 >= p.y && player.x + 32 > p.x && player.x + 8 < p.x + p.width);
          if (landing) { player.y = landing.y - 44; player.velocity = -430; }
        }
        camera = Math.min(camera, player.y - HEIGHT * .42);
        score = Math.max(score, Math.floor((HEIGHT - 100 - player.y) / 10));
        while (highest > camera - 150) addPlatform();
        platforms = platforms.filter(p => p.y < camera + HEIGHT + 80);
        if (timestamp - lastHud > 150) { setHeight(score); lastHud = timestamp; }
        if (player.y > camera + HEIGHT + 50) { ended = true; setHeight(score); setResult(score); }
      }
      context.fillStyle = "#94cbf5"; context.fillRect(0, 0, WIDTH, HEIGHT);
      context.fillStyle = "#ffffff60";
      for (let i = 0; i < 5; i++) {
        const y = ((i * 157 - camera * .22) % (HEIGHT + 100) + HEIGHT + 100) % (HEIGHT + 100) - 50;
        context.beginPath(); context.ellipse((i * 113) % WIDTH, y, 44, 12, 0, 0, Math.PI * 2); context.fill();
      }
      for (const p of platforms) {
        const y = p.y - camera;
        context.fillStyle = "#2e2e2e"; context.fillRect(p.x - 2, y - 2, p.width + 4, 16);
        context.fillStyle = "#94623d"; context.fillRect(p.x, y + 5, p.width, 7);
        context.fillStyle = "#73b837"; context.fillRect(p.x, y, p.width, 6);
        context.fillStyle = "#c4e878"; context.fillRect(p.x, y, p.width, 2);
      }
      if (goat.complete && goat.naturalWidth) context.drawImage(goat, player.x - 9, player.y - camera - 12, 58, 58);
      else { context.fillStyle = "#fff1d8"; context.fillRect(player.x, player.y - camera, 40, 44); }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", resetKeys); document.removeEventListener("visibilitychange", resetKeys);
      direction.current = 0;
    };
  }, [round, onClose]);

  return (
    <div className="goat-game-overlay">
      <section className="goat-game" role="dialog" aria-modal="true" aria-labelledby="goat-game-title">
        <div className="goat-game-heading"><h2 id="goat-game-title">Cabra amunt!</h2><button ref={closeButton} onClick={onClose} aria-label="Tancar el joc">×</button></div>
        <div className="goat-game-score"><span>Nivell {Math.floor(height / 50) + 1}</span><strong>{height} m</strong></div>
        <div className="goat-game-board">
          <canvas ref={canvas} aria-label="Joc de saltar plataformes. Mou la cabra amb les fletxes o els botons." />
          {result !== null && <div className="goat-game-result"><h3>{result} metres!</h3><button onClick={() => setRound(value => value + 1)}>Torna-hi</button></div>}
        </div>
        <div className="goat-game-controls">{[-1, 1].map(value => <button key={value} aria-label={value < 0 ? "Moure a l’esquerra" : "Moure a la dreta"} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); direction.current = value; }} onPointerUp={() => { direction.current = 0; }} onPointerCancel={() => { direction.current = 0; }} onLostPointerCapture={() => { direction.current = 0; }}>{value < 0 ? "←" : "→"}</button>)}</div>
        <p className="goat-game-help">← → o A / D per moure’t · Esc per sortir</p>
      </section>
    </div>
  );
}
