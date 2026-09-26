export const dynamic="force-dynamic";
import {publicEvaluation} from "@/lib/db";
import {CatalogProvider} from "@/components/CatalogProvider";
import type { Metadata } from "next";
import "./globals.css";
import "./analysis.css";
import "./responsive.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: { default: "Najd Arena", template: "%s · Najd Arena" },
  metadataBase: new URL("https://najdarena.com"),
  description: "The benchmark for Arabic and Saudi AI. Compare model performance on language, local knowledge, and real-world tasks.",
  openGraph: {
    type: "website",
    siteName: "Najd Arena",
    title: "Najd Arena — The benchmark for Arabic and Saudi AI",
    description: "Compare model performance on language, local knowledge, and real-world tasks.",
    images: [{url: "/social-card.png", width: 1200, height: 630, alt: "Najd Arena — The benchmark for Arabic and Saudi AI"}],
  },
  twitter: {
    card: "summary_large_image",
    site: "@najdresearch",
    creator: "@najdresearch",
    title: "Najd Arena — The benchmark for Arabic and Saudi AI",
    description: "Compare model performance on language, local knowledge, and real-world tasks.",
    images: [{url: "/social-card.png", alt: "Najd Arena — The benchmark for Arabic and Saudi AI"}],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const study=await publicEvaluation();
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><CatalogProvider models={study?.catalog??[]}><Header /><div id="main-content">{children}</div><Footer /></CatalogProvider></body></html>;
}
