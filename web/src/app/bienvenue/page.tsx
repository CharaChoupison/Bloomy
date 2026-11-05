import type { Metadata } from "next";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Bienvenue · Pronoti" };

// Onboarding après la première connexion (étape 1 = la connexion elle-même) :
// étape 2 la couleur, étape 3 l'apparence. Protégé par proxy.ts comme le reste.
export default function WelcomePage() {
  return <Onboarding />;
}
