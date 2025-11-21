import Image from "next/image";
import Link from "next/link";
import { Instagram, Linkedin, Twitter } from "lucide-react";

const socials = [
  {
    icon: Twitter,
    href: "https://x.com/lleidahack",
    label: "LleidaHack on X",
  },
  {
    icon: Instagram,
    href: "https://instagram.com/lleidahack",
    label: "LleidaHack on Instagram",
  },
  {
    icon: Linkedin,
    href: "https://linkedin.com/company/lleidahack",
    label: "LleidaHack on LinkedIn",
  },
];

export default function Footer() {
  return (
    <footer className="w-full bg-cta px-6 py-8 text-primary">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center md:flex-row md:items-center md:text-left">
        <div className="flex flex-col items-center justify-center gap-4 md:items-start">
          <div className="flex items-center justify-center gap-x-5">
            {socials.map(({ icon: Icon, href, label }) => (
              <Link
                key={href}
                href={href}
                target="_blank"
                aria-label={label}
                className="text-white transition hover:text-primary "
              >
                <Icon className="h-6 w-6" />
              </Link>
            ))}
          </div>
          <Link
            href="https://lleidahack.dev/hackeps/terms"
            className="text-primary"
            target="_blank"
          >
            <p>Termes i condicions</p>
          </Link>
          <Link
            href="https://lleidahack.dev/hackeps/privacy"
            className="text-primary text-sm"
            target="_blank"
          >
            <p>Política de privacitat</p>
          </Link>
        </div>
        <div className="block text-center">
                  <p className="text-white text-base">Made with love by LleidaHack</p>
        <Link href="https://clouding.io/" target="_blank">
          <p>Powered By Clouding.io</p>
        </Link>
        </div>


        <div className="flex items-center justify-center gap-x-5">
          <Image
            src="/background/lleidahack-key.webp"
            alt="Logo"
            className="h-20 w-20 object-contain sm:h-24 sm:w-24"
            width={150}
            height={100}
          />
        </div>
      </div>
    </footer>
  );
}
