"use client";

import Link from "next/link";
import Image from "next/image";

import { useOfficialTimer } from "@/hooks/useOfficialTimer";
import { HACKATHON_END } from "@/lib/constants";
const instruccions = [
  {
    titol: "Inscriu-te al hackató",
    descripcio:
      "Abans de res, assegura’t d’estar registrada al hackató on vols participar.",
  },
  {
    titol: "Accedeix a la pàgina del hackeps",
    descripcio:
      "Un cop tinguis el teu compte, ves a la pàgina del hackeps a Devpost. Pots trobar l'enllaç a la pàgina del hackeps al correu electrònic de confirmació que vas rebre després de registrar-te.",
  },
  {
    titol: "Crea una nova submissió",
    descripcio:
      "A la pàgina del hackeps, fes clic al botó 'Submit Project' o 'Create Submission'. Això et portarà a un formulari on podràs introduir els detalls del teu projecte.",
  },
];

export default function DevpostPage() {
  const { countdown } = useOfficialTimer({
    fallbackTarget: HACKATHON_END,
  });


  const countdownBlocks = [
    { label: "Dies", value: countdown.days },
    { label: "Hores", value: countdown.hours },
    { label: "Min", value: countdown.minutes },
    { label: "Seg", value: countdown.secondsRemainder },
  ];

  return (
    <div className="relative px-4 md:pt-20 pb-16 sm:px-6 lg:px-8">
      <Image
        src="/stars.webp"
        alt="Stars"
        width={150}
        height={150}
        className="absolute top-160 left-10 opacity-60 pointer-events-none"
      />
      <Image
        src="/star.webp"
        alt="Star"
        width={100}
        height={100}
        className="absolute bottom-10 right-10 opacity-60 pointer-events-none"
      />
      <div className="px-2 py-10 text-center">
        <h1 className="text-5xl tracking-[0.4em] font-bold text-cta sm:text-5xl lg:text-6xl">
          Devpost
        </h1>
      </div>
      <div className="mx-auto mb-16 w-full max-w-4xl space-y-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {countdownBlocks.map((block) => (
            <div
              key={block.label}
              className="rounded-2xl border border-cta/30 bg-cta/5 px-4 py-6 text-cta shadow-sm text-center"
            >
              <div className="text-4xl font-semibold sm:text-5xl">
                {String(block.value).padStart(2, "0")}
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.3em] text-cta/70">
                {block.label}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            href={"https://hackeps-2025.devpost.com"}
            target="_blank"
            className="inline-flex items-center justify-center rounded-full border border-cta/40 px-6 py-3 text-base font-semibold text-cta transition hover:bg-cta/10 sm:text-lg"
          >
            Ves a Devpost
          </Link>
        </div>
      </div>
      <div className="mx-auto my-20 w-full max-w-4xl space-y-6 pt-30">
        <h2 className="text-center text-3xl text-cta sm:text-4xl">
          Com presentar el teu projecte a Devpost?
        </h2>
        <ul className="space-y-4">
          {instruccions.map((instruccio, index) => (
            <li
              className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-black/90 backdrop-blur md:p-10"
              key={index}
            >
              <h3 className="text-xl font-bold sm:text-2xl">
                {instruccio.titol}
              </h3>
              <p className="mt-3 text-base sm:text-lg">
                {instruccio.descripcio}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
