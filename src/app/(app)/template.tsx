import { ViewTransition } from "react";

// Transition entre écrans : l'écran quitté s'efface, le nouveau apparaît en fondu en montant de 6px
// (classes « page-out » / « page-in » dans globals.css). Un template, contrairement au layout, est
// recréé à chaque navigation : c'est ce qui déclenche les animations d'entrée et de sortie.
// La barre d'onglets et la barre latérale sont dans le layout : elles restent immobiles.
// Une navigation pendant l'animation la termine aussitôt (voir InterruptPageTransition).
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
