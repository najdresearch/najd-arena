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
  description: "Reproducible Arabic-first evaluation for language models.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const study=await publicEvaluation();
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><CatalogProvider models={study?.catalog??[]}><Header /><div id="main-content">{children}</div><Footer /></CatalogProvider></body></html>;
}
