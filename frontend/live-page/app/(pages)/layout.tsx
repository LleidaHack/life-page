import LiveNavigation from "@/components/LiveNavigation";

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return <LiveNavigation>{children}</LiveNavigation>;
}
