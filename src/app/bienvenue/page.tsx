import type { Metadata } from "next";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Bienvenue · Bloomy" };

// Onboarding après la première connexion (étapes : voir onboarding.tsx). Protégé par proxy.ts comme le reste.
export default function WelcomePage() {
  return <Onboarding />;
}
