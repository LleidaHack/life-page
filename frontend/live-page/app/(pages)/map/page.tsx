import Image from "next/image";

export default function Map() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#76B1C8] px-4 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute inset-x-10 top-20 h-32 rounded-full bg-white/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-2 pb-10">
          <h1 className="text-5xl font-bold text-cta uppercase tracking-[0.4em]">Mapa</h1>
        </div>
        <div className="relative w-full max-w-[640px]">
          <Image
            src="/mapa/mapa-del-tressor.webp"
            alt="Mapa del tresor"
            width={640}
            height={480}
            className="h-auto w-full object-contain"
            priority
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Image
              src="/mapa/eps-mapa.webp"
              alt="Overlay EPS"
              width={420}
              height={420}
              className="h-auto w-[70%] -translate-y-3 object-contain drop-shadow-2xl sm:-translate-y-12"
              priority
            />
          </div>
        </div>
      </div>

      <Image
        src="/bottle.webp"
        alt="Bottle message"
        width={160}
        height={160}
        className="pointer-events-none absolute -right-6 top-24 z-20 hidden rotate-[10deg] drop-shadow-2xl sm:right-12 sm:block"
        priority
      />
      <Image
        src="/bottle.webp"
        alt="Bottle message"
        width={140}
        height={140}
        className="pointer-events-none absolute -left-8 bottom-12 z-20 hidden -rotate-[8deg] drop-shadow-2xl sm:left-12 sm:block"
        priority
      />
    </div>
  );
}
