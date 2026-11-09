"use client";

import { useEffect, useState } from "react";
import { liveApi } from "@/lib/liveEvent";

type Company = { name: string; image: string | null };
let directory: Promise<Company[]> | null = null;

// Load the existing company directory once, never on each Live polling update.
function companies() {
  directory ??= fetch(`${liveApi}/v1/company/all`, {
    signal: AbortSignal.timeout(15000),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Company logos unavailable");
      return (await response.json()) as Company[];
    })
    .catch((error) => {
      directory = null;
      throw error;
    });
  return directory;
}

function normalizedName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+s\s*[al](?:\s*u)?$/, "")
    .replace(/\s+/g, "");
}

function imageSource(value: string | null) {
  if (!value) return null;
  if (/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,/i.test(value))
    return value;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export default function CompanyLogo({ name }: { name: string }) {
  const [logo, setLogo] = useState<{ name: string; source: string } | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    void companies()
      .then((rows) => {
        const exact = rows.filter((row) => row.name === name);
        const matches = exact.length
          ? exact
          : rows.filter(
              (row) => normalizedName(row.name) === normalizedName(name),
            );
        const source =
          matches.length === 1 ? imageSource(matches[0].image) : null;
        if (active) setLogo(source ? { name, source } : null);
      })
      .catch(() => {
        if (active) setLogo(null);
      });
    return () => {
      active = false;
    };
  }, [name]);
  if (!logo || logo.name !== name) return null;
  // Stored logos include data URLs; preserve them without a remote image proxy.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      className="company-logo"
      src={logo.source}
      alt={`Logo de ${name}`}
      width={160}
      height={64}
      loading="lazy"
      decoding="async"
      onError={() => setLogo(null)}
    />
  );
}
