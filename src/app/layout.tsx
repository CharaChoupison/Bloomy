import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { preferencesBootScript, THEME_COLOR } from "@/lib/preferences";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pronoti",
  description: "Ton Pronote, en plus simple.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  viewportFit: "cover", // pour que la barre d'onglets puisse utiliser la zone de sécurité de l'iPhone
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning : data-accent / data-theme sont posés par le script avant React.
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Couleur et thème choisis appliqués avant le premier affichage (pas de flash). */}
        <script dangerouslySetInnerHTML={{ __html: preferencesBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
