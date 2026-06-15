import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: {
    default: "Næringsinnhold.no — Komplett matdatabase for Norge",
    template: "%s | Næringsinnhold.no",
  },
  description:
    "Finn næringsinnhold i alle matvarer. Kalorier, protein, karbohydrater, fett, vitaminer og mineraler — basert på den norske matvaretabellen.",
  keywords: ["næringsinnhold", "kalorier", "matvaretabell", "protein", "karbohydrater"],
  openGraph: { type: "website", locale: "nb_NO", url: "https://naeringsinnhold.no", siteName: "Næringsinnhold.no" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
