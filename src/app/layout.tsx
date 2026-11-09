import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { CustomCssPathGuard } from "@/components/custom-themes";
import { ServiceWorkerRegistration } from "@/components/offline";
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
  title: "Bloomy",
  description: "Ton Pronote, en plus simple.",
  robots: { index: false, follow: false },
  applicationName: "Bloomy",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // iOS (« Sur l'écran d'accueil ») : plein écran, nom court sous l'icône. Barre d'état « default » :
  // elle prend la couleur de theme-color et le contenu reste dessous (pas de safe-area-inset-top à gérer).
  appleWebApp: { capable: true, title: "Bloomy", statusBarStyle: "default" },
  formatDetection: { telephone: false },
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
    // suppressHydrationWarning : data-accent / data-theme / data-scheme sont posés par le script avant React.
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Couleur, thème et thèmes personnalisés appliqués avant le premier affichage (pas de flash). */}
        <script dangerouslySetInnerHTML={{ __html: preferencesBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <Suspense fallback={null}>
          <CustomCssPathGuard />
        </Suspense>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
