import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Données et confidentialité · Bloomy" };

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Ce qui est enregistré",
    body: [
      "Ton mot de passe Pronote n'est jamais enregistré. Il sert une seule fois, pour obtenir de Pronote un jeton de connexion.",
      "Ce jeton est conservé sur le serveur de Bloomy, chiffré. La clé qui permet de le lire n'existe que dans le cookie de ton appareil : sans ton appareil, le fichier est illisible.",
      "Tes notes, devoirs et autres informations ne sont pas enregistrées. Le serveur les garde en mémoire quelques minutes, pour aller plus vite.",
    ],
  },
  {
    title: "Ce qui reste sur ton appareil",
    body: [
      "Ton thème, ta couleur d'accent et tes thèmes personnalisés restent dans ton navigateur. Seule exception : quand tu crées un widget, sa couleur d'accent est enregistrée avec lui.",
    ],
  },
  {
    title: "Widget iPhone",
    body: [
      "Si tu crées un widget (Réglages › Widget iPhone), Bloomy te donne un code d'accès en lecture seule : emploi du temps, devoirs et dernières notes. Il est rangé dans le trousseau de ton iPhone par l'app Scriptable.",
      "Le serveur ne garde pas ce code, seulement de quoi le vérifier. Il s'arrête quand tu le désactives, quand tu en crées un nouveau, quand tu te déconnectes ou quand ta session expire.",
    ],
  },
  {
    title: "Combien de temps",
    body: [
      "Ta session dure 30 jours au plus. « Se déconnecter », dans Réglages, la supprime tout de suite du serveur.",
      "Si Pronote refuse le jeton (mot de passe changé, par exemple), la session est supprimée et tu devras te reconnecter.",
    ],
  },
  {
    title: "Ce que fait Bloomy dans Pronote",
    body: [
      "Bloomy lit tes informations. La seule chose qu'il modifie, c'est la case « fait » d'un devoir, quand tu la coches.",
      "Bloomy n'est pas une application officielle d'Index Éducation. Il utilise la bibliothèque libre Pawnote.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-12 sm:px-6">
      <article className="flex w-full max-w-[640px] flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Link
            href="/login"
            className="self-start rounded-sm text-callout font-medium text-accent underline-offset-2 hover:underline"
          >
            ← Retour
          </Link>
          <h1 className="text-title">Données et confidentialité</h1>
        </header>
        {SECTIONS.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <h2 className="text-headline">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-body text-ink-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
