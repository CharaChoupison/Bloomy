import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion · Pronoti" };

// Bienvenue + connexion en un seul écran : une étape « Bienvenue » à part ne ferait
// qu'ajouter un appui sans rien apprendre à l'élève.
export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-[440px] sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-10">
        <h1 className="text-display">Pronoti</h1>
        <p className="mt-1 mb-8 text-body text-ink-muted">
          Ton emploi du temps Pronote, en plus simple.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
