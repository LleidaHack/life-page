"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useOfficialTimer } from "@/hooks/useOfficialTimer";
import { HACKATHON_END } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Tooltip simple (abajo)
function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-[-40px] z-50 w-max rounded-md bg-black/90 px-2 py-1 text-sm text-white shadow">
          {content}
        </div>
      )}
    </div>
  );
}

type CountdownShellProps = {
  className?: string;
};

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

export default function CountdownShell({ className }: CountdownShellProps = {}) {
  const { countdown, timer } = useOfficialTimer({ fallbackTarget: HACKATHON_END });
  const hours = countdown.hours + countdown.days * 24;
  const hh = useMemo(() => String(hours).padStart(2, "0"), [hours]);
  const mm = useMemo(() => String(countdown.minutes).padStart(2, "0"), [countdown.minutes]);
  const ss = useMemo(
    () => String(countdown.secondsRemainder).padStart(2, "0"),
    [countdown.secondsRemainder]
  );
  const router = useRouter();

  const goFullscreenAndOpen = async () => {
    try {
      const el = document.documentElement as FullscreenCapableElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) await el.msRequestFullscreen();
    } catch (e) {
      console.warn("Fullscreen denegado:", e);
    } finally {
      router.push("/fullscreen");
    }
  };

  return (
    <Tooltip
      content={
        timer?.status === "finished"
          ? "Hackathon finalitzat"
          : timer?.status === "pending"
          ? "Comença aviat"
          : "Pantalla complerta"
      }
    >
      <button
        type="button"
        onClick={goFullscreenAndOpen}
        className={cn("relative flex items-center justify-center cursor-pointer transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60", className)}
        aria-label="Abrir /fullscreen a pantalla completa"
        disabled={timer?.status === "finished"}
      >
        <div className="relative h-[150px] w-[220px] sm:h-[180px] sm:w-[260px] lg:h-[200px] lg:w-[300px]">
          <Image
            src="/concha.png"
            alt="Countdown shell"
            fill
            priority
            className="object-contain select-none"
            draggable={false}
          />
          <div className="absolute inset-0 flex items-center justify-center font-mono text-white ">
            <div className="relative -left-2 top-2 sm:-left-4">
              <span className="text-2xl font-bold sm:text-3xl">
                {hh}:{mm}
              </span>
              <span className="absolute -top-3 -right-5 text-lg font-bold sm:-top-4 sm:-right-6 sm:text-xl">
                {ss}
              </span>
            </div>
          </div>
        </div>
      </button>
    </Tooltip>
  );
}
