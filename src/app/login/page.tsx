import type { Metadata } from "next";
import { defaultInstanceUrl, isSingleInstance } from "@/lib/pronote/network";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion · Bloomy" };

// Bienvenue + connexion en un seul écran : une étape « Bienvenue » à part ne ferait
// qu'ajouter un appui sans rien apprendre à l'élève.
export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-[440px] sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-10">
        <h1 className="text-display">Bloomy</h1>
        <p className="mt-1 mb-8 text-body text-ink-muted">
          Connecte-toi avec ton compte Pronote.
        </p>
        <LoginForm askUrl={!isSingleInstance()} defaultUrl={defaultInstanceUrl()} />
      </div>
    </main>
  );
}
