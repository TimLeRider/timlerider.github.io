import type { Metadata } from "next";
import "./globals.css";
import { SimulationProvider } from "@/lib/simulationContext";
import { MainNav } from "@/components/MainNav";

export const metadata: Metadata = {
  title: "Simulateur d'achat immobilier ancien & PTZ",
  description:
    "Simulez votre capacité d'emprunt, votre PTZ et le financement d'une maison ancienne à rénover.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SimulationProvider>
          <MainNav />
          <main className="container">{children}</main>
        </SimulationProvider>
      </body>
    </html>
  );
}
