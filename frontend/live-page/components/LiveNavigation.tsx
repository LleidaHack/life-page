"use client";

import { usePathname } from "next/navigation";
import EventLive from "./EventLive";

const views: Record<string, string> = {
  "/": "home",
  "/challenges": "challenges",
  "/schedule": "schedule",
  "/map": "map",
  "/help": "help",
  "/leaderboard": "leaderboard",
  "/judging": "judging",
  "/fullscreen": "fullscreen",
};

// Keep the data, clock and connections mounted across ordinary Live navigation.
export default function LiveNavigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const view = views[pathname];
  return view ? <EventLive view={view} /> : children;
}
