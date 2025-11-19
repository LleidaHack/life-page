"use client";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchSchedule, type ScheduleEntry } from "@/lib/api";
import {
  Instagram,
  Linkedin,
  Slack,
  Twitch,
  Twitter,
  Youtube,
} from "lucide-react";

const TWITCH_CHANNEL = "lleidahack"; // lleidahack
const TWITCH_STATUS_URL = `https://decapi.me/twitch/uptime/${TWITCH_CHANNEL}`;
const TWITCH_POLL_INTERVAL_MS = 60_000;
const INITIAL_TWITCH_PARENTS = process.env.NEXT_PUBLIC_TWITCH_PARENT
  ? process.env.NEXT_PUBLIC_TWITCH_PARENT.split(",")
      .map((parent) => parent.trim())
      .filter(Boolean)
  : [];
const CRAB_MESSAGES = [
  "No me toquis!",
  "Cangrejo #1",
  "Cangrejo #2",
  "Cangrejo #3",
];
const DECORATIVE_IMAGE_QUALITY = 70;
const FEATURED_REFRESH_INTERVAL_MS = 60_000;

type FeaturedEventContent = {
  title: string;
  description: string;
  time: string;
  location: string;
  link?: string | null;
};

const FALLBACK_FEATURED_EVENT: { isActive: boolean; content: FeaturedEventContent } = {
  isActive: false,
  content: {
    title: "Cerimònia d'obertura",
    description:
      "Ens veiem totes a l'auditori per explicar el format del cap de setmana i els reptes sorpresa.",
    time: "Dissabte · 10:00h",
    location: "Sala Magna (planta 2)",
    link: "https://leidahack.com",
  },
};

const deriveFeaturedEvent = (day: string, entry: ScheduleEntry): FeaturedEventContent => {
  const fallback = FALLBACK_FEATURED_EVENT.content;
  const title = entry.Title ?? entry.title ?? fallback.title;
  const description = entry.Description ?? entry.description ?? fallback.description;
  const hasStart = Boolean(entry.start);
  const hasEnd = Boolean(entry.end);
  const normalizedTime = hasStart
    ? `${day} · ${entry.start}${hasEnd ? ` - ${entry.end}` : ""}`
    : fallback.time;

  return {
    title,
    description,
    time: normalizedTime,
    location: entry.location ?? fallback.location,
    link: entry.link ?? fallback.link,
  };
};

export default function Home() {
  const [scared, setScared] = useState({
    f1: false,
    f2: false,
    f3: false,
    f4: false,
  });
  const [bubble, setBubble] = useState({
    f1: false,
    f2: false,
    f3: false,
    f4: false,
  });
  const [paused, setPaused] = useState({
    f1: false,
    f2: false,
    f3: false,
    f4: false,
  });
  const [featuredEvent, setFeaturedEvent] = useState<FeaturedEventContent | null>(
    FALLBACK_FEATURED_EVENT.isActive ? FALLBACK_FEATURED_EVENT.content : null
  );
  const [isTwitchLive, setIsTwitchLive] = useState(false);
  const [twitchParents, setTwitchParents] = useState<string[]>(
    INITIAL_TWITCH_PARENTS
  );
  const [crabMessagePointer, setCrabMessagePointer] = useState(0);
  const [crabBubbleText, setCrabBubbleText] = useState<string | null>(null);
  const crabBubbleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mermaidMessage, setMermaidMessage] = useState<string | null>(null);
  const mermaidBubbleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socialLinks = [
    {
      name: "Instagram",
      handle: "@hackeps",
      icon: Instagram,
      url: "https://instagram.com/lleidahack",
    },
    {
      name: "Twitter",
      handle: "@hackeps",
      icon: Twitter,
      url: "https://x.com/lleidahack",
    },
    {
      name: "LinkedIn",
      handle: "HackEPS",
      icon: Linkedin,
      url: "https://linkedin.com/company/lleidahack",
    },
    {
      name: "YouTube",
      handle: "HackEPS",
      icon: Youtube,
      url: "https://youtube.com/@lleidahack",
    },
    {
      name: "Twitch",
      handle: "hackeps",
      icon: Twitch,
      url: "https://twitch.tv/lleidahack",
    },
  ];
  const slackChannel = {
    label: "Slack",
    value: "#help",
    url: "https://hackeps2025.slack.com/archives/C09SE2QMWUS",
    message: "Canal oficial per dubtes",
  };
  const twitchParentQuery = twitchParents
    .map((parent) => `parent=${encodeURIComponent(parent)}`)
    .join("&");
  const twitchEmbedSrc =
    twitchParentQuery.length > 0
      ? `https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&${twitchParentQuery}&muted=true&autoplay=true`
      : null;

  // Helper to trigger bubble + escape, then resume swim
  const spook = (key: keyof typeof scared) => {
    // Show bubble and pause current swim so it can be read
    setBubble((b) => ({ ...b, [key]: true }));
    setPaused((p) => ({ ...p, [key]: true }));

    // After 1s, trigger fast escape
    setTimeout(() => {
      setScared((s) => ({ ...s, [key]: true }));
      setPaused((p) => ({ ...p, [key]: false }));

      // After the dart ends, hide bubble and resume normal swim
      setTimeout(() => {
        setBubble((b) => ({ ...b, [key]: false }));
        setScared((s) => ({ ...s, [key]: false }));
      }, 1100);
    }, 1000);
  };

  const handleCrabClick = () => {
    setCrabBubbleText(CRAB_MESSAGES[crabMessagePointer]);
    setCrabMessagePointer((prev) => (prev + 1) % CRAB_MESSAGES.length);
    if (crabBubbleTimeout.current) {
      clearTimeout(crabBubbleTimeout.current);
    }
    crabBubbleTimeout.current = setTimeout(() => {
      setCrabBubbleText(null);
    }, 1500);
  };

  useEffect(() => {
    setTwitchParents((prev) => {
      const currentHost =
        typeof window !== "undefined" ? window.location.hostname : null;
      if (!currentHost || prev.includes(currentHost)) {
        return prev;
      }
      return [...prev, currentHost];
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    let currentController: AbortController | null = null;

    const loadFeaturedEvent = async () => {
      if (currentController) {
        currentController.abort();
      }
      const controller = new AbortController();
      currentController = controller;

      try {
        const schedule = await fetchSchedule(controller.signal);
        if (!mounted) {
          return;
        }

        const entries = Object.entries(schedule) as [string, ScheduleEntry[]][];
        for (const [day, tasks] of entries) {
          const candidate = tasks.find(
            (task) => task.showInMainPage && task.isRunningNow
          );
          if (candidate) {
            setFeaturedEvent(deriveFeaturedEvent(day, candidate));
            return;
          }
        }

        setFeaturedEvent(
          FALLBACK_FEATURED_EVENT.isActive ? FALLBACK_FEATURED_EVENT.content : null
        );
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          return;
        }
        console.error("Failed to load featured schedule event", error);
      }
    };

    loadFeaturedEvent();
    const interval = window.setInterval(loadFeaturedEvent, FEATURED_REFRESH_INTERVAL_MS);

    return () => {
      mounted = false;
      if (currentController) {
        currentController.abort();
      }
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkTwitchStatus = async () => {
      try {
        const response = await fetch(TWITCH_STATUS_URL, { cache: "no-store" });
        const statusText = (await response.text()).toLowerCase();
        if (!isMounted) {
          return;
        }
        const live =
          !statusText.includes("is offline") &&
          !statusText.includes("no such user") &&
          !statusText.includes("unable to get data");
        setIsTwitchLive((prev) => (prev === live ? prev : live));
      } catch (error) {
        console.error("Failed to check Twitch status", error);
      }
    };

    checkTwitchStatus();
    const interval = setInterval(checkTwitchStatus, TWITCH_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (crabBubbleTimeout.current) {
        clearTimeout(crabBubbleTimeout.current);
      }
      if (mermaidBubbleTimeout.current) {
        clearTimeout(mermaidBubbleTimeout.current);
      }
    };
  }, []);

  const handleMermaidClick = () => {
    setMermaidMessage("Hola guap@!");
    if (mermaidBubbleTimeout.current) {
      clearTimeout(mermaidBubbleTimeout.current);
    }
    mermaidBubbleTimeout.current = setTimeout(() => {
      setMermaidMessage(null);
    }, 2000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 sm:px-8">
      {/* Decorative, global keyframes */}
      <style jsx global>{`
        @keyframes swim-right {
          0% {
            transform: translateX(-120vw);
          }
          100% {
            transform: translateX(120vw);
          }
        }
        @keyframes swim-left {
          0% {
            transform: translateX(120vw);
          }
          100% {
            transform: translateX(-120vw);
          }
        }
        @keyframes dart-right {
          from {
            transform: none;
          }
          to {
            transform: translateX(150vw);
          }
        }
        @keyframes dart-left {
          from {
            transform: none;
          }
          to {
            transform: translateX(-150vw);
          }
        }
        @keyframes bubble-pop {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          20% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          80% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
        }
        @keyframes bob-soft-1 {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes bob-soft-2 {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes bob-soft-3 {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes bob-soft-4 {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-9px);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes live-pulse {
          0%,
          100% {
            transform: scale(0.9);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.25);
            opacity: 1;
          }
        }
        @keyframes wave-slide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes boat-bob {
          0%,
          100% {
            transform: translate(-50%, 0) rotate(-1deg);
          }
          50% {
            transform: translate(-50%, -14px) rotate(1deg);
          }
        }
        @keyframes boat-flag {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(3px);
          }
        }
        @keyframes crab-walk {
          0% {
            transform: translateX(-20vw) scaleX(1);
          }
          49% {
            transform: translateX(80vw) scaleX(1);
          }
          50% {
            transform: translateX(80vw) scaleX(-1);
          }
          100% {
            transform: translateX(-20vw) scaleX(-1);
          }
        }
        .paused {
          animation-play-state: paused !important;
        }

        .boat-mast {
          position: absolute;
          bottom: 40px;
          left: 50%;
          width: 6px;
          height: 70px;
          transform: translateX(-50%);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.7),
            rgba(148, 163, 184, 0.8)
          );
          border-radius: 999px;
        }
        .boat-sail {
          position: absolute;
          bottom: 40px;
          left: 50%;
          width: 90px;
          height: 80px;
          transform-origin: left bottom;
          clip-path: polygon(0% 0%, 0% 100%, 100% 50%);
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.95),
            rgba(191, 219, 254, 0.85)
          );
        }
        .boat-sail--secondary {
          width: 70px;
          height: 60px;
          transform: translateX(-70px) scaleX(-1);
          opacity: 0.85;
        }
        .boat-hull {
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 160px;
          height: 48px;
          transform: translateX(-50%);
          background: linear-gradient(
            180deg,
            rgba(15, 118, 110, 0.9),
            rgba(8, 47, 73, 0.95)
          );
          border-radius: 0 0 40px 40px;
          box-shadow: 0 10px 25px rgba(5, 18, 29, 0.4);
        }
        .boat-hull::after {
          content: "";
          position: absolute;
          inset: 8px 20px 10px;
          border-radius: 0 0 30px 30px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .boat-flag {
          position: absolute;
          bottom: 102px;
          left: 50%;
          width: 32px;
          height: 12px;
          transform-origin: left center;
          transform: translateX(2px);
          background: linear-gradient(
            90deg,
            rgba(248, 113, 113, 0.8),
            rgba(248, 113, 113, 0.4)
          );
          clip-path: polygon(0% 0%, 100% 40%, 80% 100%, 0% 100%);
          animation: boat-flag 4s ease-in-out infinite;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-white/5" />
        <div className="absolute inset-x-10 top-16 h-32 rounded-full bg-white/15 blur-3xl" />
      </div>

      {/* Fishes as background, but interactive */}
      {/* Fish 1: swims left->right */}
      <div
        className={`absolute top-20 left-0 opacity-80 select-none ${
          scared.f1
            ? "animate-[dart-right_1.1s_ease-in_forwards]"
            : "animate-[swim-right_28s_linear_infinite]"
        } ${paused.f1 ? "paused" : ""}`}
        style={!scared.f1 ? { animationDelay: "-9s" } : undefined}
        onClick={() => spook("f1")}
      >
        <div
          className="relative pointer-events-auto cursor-pointer animate-[bob-soft-1_3.6s_ease-in-out_infinite]"
          style={{ willChange: "transform" }}
        >
          <Image
            src="/animals/fish_1.webp"
            alt="fish1"
            width={150}
            height={100}
            loading="lazy"
            sizes="150px"
            quality={DECORATIVE_IMAGE_QUALITY}
          />
          {bubble.f1 && (
            <div
              className={`absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 text-black ${
                paused.f1 ? "text-lg" : "text-sm"
              } font-bold px-3 py-1.5 rounded-xl shadow animate-[bubble-pop_1.1s_ease-out_forwards]`}
            >
              que no me toquiss!!
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-white/90 border-x-8 border-x-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Fish 2: swims right->left */}
      <div
        className={`absolute top-40 right-0 opacity-80 select-none ${
          scared.f2
            ? "animate-[dart-left_1.1s_ease-in_forwards]"
            : "animate-[swim-left_34s_linear_infinite]"
        } ${paused.f2 ? "paused" : ""}`}
        style={!scared.f2 ? { animationDelay: "-11s" } : undefined}
        onClick={() => spook("f2")}
      >
        <div
          className="relative pointer-events-auto cursor-pointer animate-[bob-soft-2_4.2s_ease-in-out_infinite]"
          style={{ willChange: "transform" }}
        >
          <Image
            src="/animals/fish_2.webp"
            alt="fish2"
            width={150}
            height={100}
            loading="lazy"
            sizes="150px"
            quality={DECORATIVE_IMAGE_QUALITY}
          />
          {bubble.f2 && (
            <div
              className={`absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 text-black ${
                paused.f2 ? "text-lg" : "text-sm"
              } font-bold px-3 py-1.5 rounded-xl shadow animate-[bubble-pop_1.1s_ease-out_forwards]`}
            >
              que no me toquiss!!
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-white/90 border-x-8 border-x-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Fish 3: swims left->right (slower) */}
      <div
        className={`absolute left-0 top-[45%] opacity-80 select-none ${
          scared.f3
            ? "animate-[dart-right_1.1s_ease-in_forwards]"
            : "animate-[swim-right_40s_linear_infinite]"
        } ${paused.f3 ? "paused" : ""}`}
        style={!scared.f3 ? { animationDelay: "-13s" } : undefined}
        onClick={() => spook("f3")}
      >
        <div
          className="relative pointer-events-auto cursor-pointer animate-[bob-soft-3_5s_ease-in-out_infinite]"
          style={{ willChange: "transform" }}
        >
          <Image
            src="/animals/fish_3.webp"
            alt="fish3"
            width={150}
            height={100}
            loading="lazy"
            sizes="150px"
            quality={DECORATIVE_IMAGE_QUALITY}
          />
          {bubble.f3 && (
            <div
              className={`absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 text-black ${
                paused.f3 ? "text-lg" : "text-sm"
              } font-bold px-3 py-1.5 rounded-xl shadow animate-[bubble-pop_1.1s_ease-out_forwards]`}
            >
              que no me toquiss!!
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-white/90 border-x-8 border-x-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Fish 4: swims right->left (faster) */}
      <div
        className={`absolute right-0 top-[30%] opacity-80 select-none ${
          scared.f4
            ? "animate-[dart-left_1.1s_ease-in_forwards]"
            : "animate-[swim-left_26s_linear_infinite]"
        } ${paused.f4 ? "paused" : ""}`}
        style={!scared.f4 ? { animationDelay: "-7s" } : undefined}
        onClick={() => spook("f4")}
      >
        <div
          className="relative pointer-events-auto cursor-pointer animate-[bob-soft-4_3.3s_ease-in-out_infinite]"
          style={{ willChange: "transform" }}
        >
          <Image
            src="/animals/fish_4.webp"
            alt="fish4"
            width={150}
            height={100}
            loading="lazy"
            sizes="150px"
            quality={DECORATIVE_IMAGE_QUALITY}
          />
          {bubble.f4 && (
            <div
              className={`absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 text-black ${
                paused.f4 ? "text-lg" : "text-sm"
              } font-bold px-3 py-1.5 rounded-xl shadow animate-[bubble-pop_1.1s_ease-out_forwards]`}
            >
              que no me toquiss!!
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-white/90 border-x-8 border-x-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Crab friend walking on the sand */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10">
        <div
          className="pointer-events-auto relative w-28 cursor-pointer animate-[crab-walk_40s_linear_infinite]"
          onClick={handleCrabClick}
        >
          {crabBubbleText && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-white/95 px-3 py-1 text-sm font-semibold text-black shadow">
              {crabBubbleText}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0 w-0 border-t-8 border-t-white/90 border-x-8 border-x-transparent" />
            </div>
          )}
          <Image
            src="/animals/crab.webp"
            alt="sand crab"
            width={160}
            height={120}
            className="w-full"
            loading="lazy"
            sizes="7rem"
            quality={DECORATIVE_IMAGE_QUALITY}
          />
        </div>
      </div>

      {/* Mermaid friend anchored to the bottom-left corner */}
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 hidden pb-6 pl-4 md:block">
        <div className="pointer-events-auto relative w-80 cursor-pointer" onClick={handleMermaidClick}>
          {mermaidMessage && (
            <div className="absolute -top-12 left-24 flex -translate-x-1/2 items-center rounded-2xl bg-white/95 px-4 py-2 text-sm font-semibold text-black shadow">
              {mermaidMessage}
              <span className="absolute -bottom-2 left-8 h-0 w-0 border-t-8 border-t-white/90 border-x-8 border-x-transparent" />
            </div>
          )}
          <Image
            src="/animals/sirena.webp"
            alt="sirena"
            width={200}
            height={200}
            className="w-80"
            loading="lazy"
            sizes="(min-width: 768px) 20rem, 0px"
            quality={DECORATIVE_IMAGE_QUALITY}
          />
        </div>
      </div>

      {/* <Image
        src="/hackeps-logo.png"
        alt="Logo"
        width={300}
        height={300}
        className="mx-auto my-4"
      /> */}

      <div className="relative z-10 mx-auto mb-16 max-w-5xl px-4">
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-5xl uppercase tracking-[0.4em] font-bold text-cta">
            HackEPS 2025
          </h1>
          {/* <h1 className="text-4xl font-semibold">Benvingudes a la zona d'informació</h1>
          <p className="text-base text-white/80">
            Tot el que necessites per al cap de setmana: agenda, connexions, xarxes socials i punts de contacte.
          </p> */}
        </div>

        {isTwitchLive ? (
          <Card className="mb-8 border border-blue-100/30 bg-gradient-to-r from-blue-500/40 via-blue-400/20 to-transparent p-10">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="flex items-center gap-3 text-sm uppercase tracking-widest text-white">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-[live-pulse_1.4s_ease-in-out_infinite] rounded-full bg-red-500/80"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.85)]"></span>
                  </span>
                  Ara mateix
                </p>
                <CardTitle className="text-3xl">HackEPS en directe</CardTitle>
              </div>
              <div className="text-right space-y-2">
                <p className="font-semibold">Canal oficial</p>
                <p className="text-black/70">twitch.tv/{TWITCH_CHANNEL}</p>
                <Link
                  href={`https://twitch.tv/${TWITCH_CHANNEL}`}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-1 text-sm font-medium hover:border-white"
                >
                  Obrir a Twitch →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="mt-6 space-y-3">
              {twitchEmbedSrc ? (
                <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-black shadow-2xl">
                  <iframe
                    title="LleidaHack Live Stream"
                    src={twitchEmbedSrc}
                    allowFullScreen
                    className="aspect-video w-full"
                    loading="lazy"
                  />
                </div>
              ) : (
                <p className="text-sm text-white/70">
                  Estem preparant el reproductor. Torna-ho a intentar en uns
                  segons.
                </p>
              )}
              <p className="text-sm text-black/60">
                Si no es carrega correctament, obre la transmissió directament a
                Twitch.
              </p>
            </CardContent>
          </Card>
        ) : featuredEvent ? (
          <Card className="mb-8 border border-blue-100/30 bg-gradient-to-r from-blue-500/40 via-blue-400/20 to-transparent p-10">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="flex items-center gap-3 text-sm uppercase tracking-widest text-white">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-[live-pulse_1.4s_ease-in-out_infinite] rounded-full bg-red-500/80"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.85)]"></span>
                  </span>
                  Ara mateix
                </p>
                <CardTitle className="text-3xl">
                  {featuredEvent.title}
                </CardTitle>
                <p className="text-white/80 mt-2 max-w-2xl">
                  {featuredEvent.description}
                </p>
              </div>
              <div className="text-right space-y-2">
                <p className="font-semibold">{featuredEvent.time}</p>
                <p className="text-white/70">{featuredEvent.location}</p>
                {featuredEvent.link && (
                  <Link
                    href={featuredEvent.link}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-1 text-sm font-medium hover:border-white"
                  >
                    Detalls →
                  </Link>
                )}
              </div>
            </CardHeader>
          </Card>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl text-cta/80">Wifi</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 text-center">
              <Image
                src="/qr_wifi.webp"
                alt="Wifi QR"
                width={140}
                height={140}
                className="rounded-3xl border border-white/20 bg-white/10 p-3"
                loading="lazy"
                sizes="140px"
                quality={80}
              />
              <div>
                <p className="text-sm uppercase tracking-widest text-cta/60">
                  Xarxa
                </p>
                <p className="text-2xl font-semibold text-cta/80">HackEPS-Guest</p>
                <p className="text-base text-cta/80">
                  Contrasenya: staycreative!
                </p>
              </div>
            </CardContent>
            <CardFooter className="text-center text-xs text-cta/60">
              Si tens problemes de connexió, acosta&apos;t al help desk o escriu-nos
              per Slack.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl text-cta/80">Contacte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  Xarxes
                </p> */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {socialLinks.map((network) => {
                    const Icon = network.icon;
                    return (
                      <Link
                        key={network.name}
                        href={network.url}
                        target="_blank"
                        aria-label={`${network.name} ${network.handle}`}
                        className="group flex h-11 w-11 items-center justify-center rounded-full border border-black/20 bg-white/5 transition hover:border-black hover:bg-white/10"
                      >
                        <Icon className="h-5 w-5 text-cta transition group-hover:text-black-100" />
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-black/15 bg-white/8 p-4 mt-10 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10">
                    <Slack className="h-6 w-6 text-cta/90" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-cta/70">
                      {slackChannel.label}
                    </p>
                    <p className="text-lg font-semibold text-cta/80">
                      {slackChannel.value}
                    </p>
                    <p className="text-sm text-cta/70">
                      {slackChannel.message}
                    </p>
                  </div>
                </div>
                <Link
                  href={slackChannel.url}
                  target="_blank"
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-black/25 px-4 py-1.5 text-sm font-medium text-cta/90"
                >
                  Obrir Slack
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
