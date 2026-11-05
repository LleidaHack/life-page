import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-2xl font-bold">Gestió de HackEPS</h1>
      <p>
        Els avisos, horaris, reptes i permisos es gestionen des del panell de
        LleidaHack.
      </p>
      {process.env.NEXT_PUBLIC_ADMIN_URL && (
        <a className="block underline" href={process.env.NEXT_PUBLIC_ADMIN_URL}>
          Obrir el panell de gestió
        </a>
      )}
      <Link className="block underline" href="/">
        Tornar al directe
      </Link>
    </main>
  );
}
