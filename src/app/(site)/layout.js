import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";

export default function SiteLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-6">{children}</main>
      <Footer />
    </>
  );
}