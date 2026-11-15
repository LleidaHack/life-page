export type EventSponsor = {
  id: number;
  name: string;
  image: string | null;
  tier: number;
};

function logoSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // Some directory logos use the legacy data:@image prefix (e.g. JCA).
  const source = value.replace(/^data:@image\//i, "data:image/");
  if (/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,/i.test(source)) return source;
  try {
    return new URL(source).protocol === "https:" ? source : null;
  } catch {
    return null;
  }
}

// Match hackeps.dev's sponsor section: tiers 0–4, including collaborators,
// ordered by tier while retaining the API's order within each category.
export function parseEventSponsors(value: unknown): EventSponsor[] {
  if (!Array.isArray(value)) throw new Error("Invalid event sponsors response");
  const seen = new Set<number>();
  return value.flatMap((row): EventSponsor[] => {
    if (!row || typeof row.id !== "number" || typeof row.name !== "string") return [];
    const name = row.name.trim();
    const tier = Number(row.tier);
    if (!name || !Number.isInteger(tier) || tier < 0 || tier > 4 || seen.has(row.id)) return [];
    seen.add(row.id);
    return [{ id: row.id, name, tier, image: logoSource(row.image) }];
  }).sort((a, b) => a.tier - b.tier);
}
