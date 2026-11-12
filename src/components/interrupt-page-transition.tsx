"use client";

import { useEffect } from "react";

type ViewTransitionDocument = Document & {
  /** Transition en cours (API standard, navigateurs récents). */
  activeViewTransition?: ViewTransition | null;
  /** Même transition, mémorisée par React : repli pour les navigateurs sans l'API standard. */
  __reactViewTransition?: ViewTransition | null;
};

/** Termine tout de suite la transition entre écrans en cours (le nouvel écran est déjà en place). */
function skipPageTransition() {
  const doc = document as ViewTransitionDocument;
  (doc.activeViewTransition ?? doc.__reactViewTransition)?.skipTransition();
}

/** Lien interne qui va déclencher une navigation dans l'app (pas de nouvel onglet ni de téléchargement). */
function isInAppLink(event: MouseEvent): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(link instanceof HTMLAnchorElement)) return false;
  if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return false;
  return link.origin === location.origin;
}

/**
 * Rend les changements d'écran immédiats même pendant une animation.
 *
 * React ne démarre pas une transition de vue tant que la précédente n'est pas terminée : toucher un
 * onglet pendant le fondu d'entrée de l'écran (≈ 200 ms) faisait attendre la fin du fondu avant que
 * quoi que ce soit ne bouge. On termine donc l'animation en cours dès le toucher (ou le retour arrière) :
 * l'écran courant se pose instantanément, et le suivant arrive sans délai.
 */
export function InterruptPageTransition() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isInAppLink(event)) skipPageTransition();
    };
    // Phase de capture : avant que <Link> ne lance la navigation.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", skipPageTransition);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", skipPageTransition);
    };
  }, []);
  return null;
}
