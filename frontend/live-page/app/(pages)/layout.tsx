import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <nav>
        <Navbar />
      </nav>
      <main className="flex-1">{children}</main>
      <footer>
        <Footer />
      </footer>
    </div>
  );
}
