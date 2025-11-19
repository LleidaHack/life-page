"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import CountdownShell from "./CountdownShell";

export default function Navbar() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/schedule", label: "Horari" },
    { href: "/map", label: "Mapa" },
    { href: "/challenges", label: "Reptes" },
    { href: "/devpost", label: "Devpost" },
    { href: "/help", label: "Help" },
  ];
  const leftLinks = links.slice(0, 3);
  const rightLinks = links.slice(3);
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const renderLink = (link: { href: string; label: string }) => (
    <Link
      href={link.href}
      className={`transition hover:opacity-80 ${
        pathname === link.href ? "underline font-bold" : ""
      }`}
      prefetch
    >
      {link.label}
    </Link>
  );

  return (
    <nav className="relative z-50 mb-12 w-full bg-cta px-4 pb-4 pt-3 text-primary shadow-sm sm:mb-16 sm:px-6 lg:mb-0 lg:pb-4 lg:pt-4">
      <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap lg:justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" prefetch>
            <Image
              src="/background/lleidahack-key.png"
              alt="Logo"
              width={120}
              height={60}
              className="h-12 w-28 object-contain sm:h-14 sm:w-32"
              priority
            />
          </Link>
          <ul className="hidden space-x-10 text-lg lg:flex xl:space-x-14">
            {leftLinks.map((link) => (
              <li key={link.href}>{renderLink(link)}</li>
            ))}
          </ul>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <ul className="hidden space-x-10 text-lg lg:flex xl:space-x-14">
            {rightLinks.map((link) => (
              <li key={link.href}>{renderLink(link)}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
            aria-label="Obrir el menú de navegació"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="mt-4 w-full rounded-2xl border border-primary/20 bg-cta/95 p-4 shadow-lg lg:hidden">
          <ul className="flex flex-col gap-3 text-lg">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block rounded-xl px-3 py-2 transition hover:bg-primary/10 ${
                    pathname === link.href ? "underline font-bold" : ""
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isMenuOpen && (
        <div className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 lg:-bottom-24 lg:translate-y-0 lg:top-auto">
          <CountdownShell className="pointer-events-auto drop-shadow-2xl" />
        </div>
      )}
    </nav>
  );
}
