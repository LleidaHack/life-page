import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy } from "lucide-react";

import { fetchChallenges, type Challenge } from "@/lib/api";

export default async function ChallengesPage() {
  let challenges: Challenge[] = [];
  let failed = false;

  try {
    challenges = await fetchChallenges();
  } catch (error) {
    console.error("Failed to fetch challenges:", error);
    failed = true;
  }

  const isEmpty = challenges.length === 0;

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 sm:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute inset-x-12 top-16 h-32 rounded-full bg-black/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl space-y-8">
        <header className="space-y-4 text-cta tracking-[0.4em]">
          <h1 className="text-5xl font-bold text-cta uppercase text-center">Reptes HackEPS 2025</h1>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {failed || isEmpty ? (
            <div className="col-span-full rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/80">
              {failed
                ? "No hem pogut carregar els reptes. Torna-ho a intentar en uns instants."
                : "Encara no hi ha reptes disponibles. Torna més tard!"}
            </div>
          ) : (
            challenges.map((challenge) => (
              <Card
                key={challenge.id ?? challenge.titol}
                className="border-white/10 bg-white/5 px-6 py-6 text-cta backdrop-blur-2xl"
              >
                <CardHeader className="px-0">
                  <p className="text-xs uppercase tracking-[0.3em] text-cta/60">
                    {challenge.empresa}
                  </p>
                  <CardTitle className="text-2xl">{challenge.titol}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-0">
                  <CardDescription className="text-base leading-relaxed text-cta/85">
                    {challenge.descripcio}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {challenge.badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-black/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cta/75"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </CardContent>
                {(challenge.premi || challenge.link) && (
                  <CardFooter className="mt-4 flex flex-col gap-3 px-0">
                    {challenge.premi && (
                      <p className="flex items-center gap-3 text-sm text-cta/90">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <span>
                          <span className="font-semibold">Premi:</span> {challenge.premi}
                        </span>
                      </p>
                    )}
                    {challenge.link && (
                      <Link
                        href={challenge.link}
                        target="_blank"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-cta/20 bg-white/10 px-4 py-2 text-sm font-medium text-cta transition hover:border-black"
                      >
                        Veure brief
                      </Link>
                    )}
                  </CardFooter>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 right-4 z-10 hidden md:block">
        <Image
          src="/animals/duck.webp"
          alt="Duck Duck"
          width={160}
          height={160}
          className="w-80"
        />
      </div>
    </div>
  );
}
