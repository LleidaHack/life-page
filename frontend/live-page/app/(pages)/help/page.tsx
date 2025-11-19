import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { fetchFaqs, type Faq } from "@/lib/api";

export default async function HelpPage() {
  let faqs: Faq[] = [];
  let failed = false;

  try {
    faqs = await fetchFaqs();
  } catch (error) {
    console.error("Failed to fetch FAQs:", error);
    failed = true;
  }

  const isEmpty = faqs.length === 0;
  return (
    <div className="relative min-h-screen px-4 pb-24 pt-28 sm:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-x-10 top-12 h-32 rounded-full bg-black/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-cta tracking-[0.4em]">FAQ</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {failed || isEmpty ? (
            <div className="col-span-full rounded-3xl border border-cta/10 bg-white/c p-8 text-center text-cta/80">
              {failed
                ? "No hem pogut carregar les FAQs. Torna-ho a intentar aviat."
                : "Encara no hi ha FAQs disponibles. Torna quan l'organització les publiqui."}
            </div>
          ) : (
            faqs.map((faq) => (
              <Card
                key={faq.id ?? faq.question}
                className="border-white/15 bg-white/10 px-6 py-6 text-cta backdrop-blur-2xl"
              >
                <CardHeader className="px-0">
                  <CardTitle className="text-2xl font-semibold">
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <CardDescription className="text-base leading-relaxed text-cta/90">
                    {faq.answer}
                  </CardDescription>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
