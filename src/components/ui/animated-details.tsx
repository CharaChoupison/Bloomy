"use client";

import { useRef, type ComponentProps, type MouseEvent } from "react";

const DURATION = 280;
// Repli si la variable n'est pas exposée : même courbe que --ease-spring (globals.css).
const SPRING = "cubic-bezier(0.2, 1, 0.32, 1)";

/**
 * <details> qui déplie et replie sa hauteur au lieu de s'ouvrir d'un coup (cartes de matière,
 * couleurs des matières, CSS rapide). L'ouverture reste native : clavier (Entrée, Espace),
 * lecteurs d'écran et recherche dans la page fonctionnent comme avant ; seul le clic sur le
 * <summary> est intercepté pour animer. Web Animations plutôt que CSS : animer jusqu'à une
 * hauteur « auto » n'est possible en CSS que dans Chrome (interpolate-size).
 * Si l'appareil demande moins d'animations, rien n'est intercepté.
 */
export function AnimatedDetails({ onClick, children, ...props }: ComponentProps<"details">) {
  const ref = useRef<HTMLDetailsElement>(null);
  const animation = useRef<Animation | null>(null);
  const closing = useRef(false);

  function handleClick(event: MouseEvent<HTMLDetailsElement>) {
    onClick?.(event);
    const details = ref.current;
    const summary = (event.target as Element).closest("summary");
    // Seulement le <summary> de ce bloc : pas les clics dans le contenu ni un <details> imbriqué.
    if (event.defaultPrevented || !details || !summary || summary.parentElement !== details) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    event.preventDefault();
    // Hauteur affichée à l'instant, y compris au milieu d'une animation qu'on inverse.
    const from = details.offsetHeight;
    animation.current?.cancel();

    const opening = !details.open || closing.current;
    closing.current = !opening;
    if (opening) details.open = true;
    const to = opening ? details.offsetHeight : summary.offsetHeight;

    const easing = getComputedStyle(details).getPropertyValue("--ease-spring").trim() || SPRING;
    details.style.overflow = "clip";
    const run = details.animate({ height: [`${from}px`, `${to}px`] }, { duration: DURATION, easing });
    animation.current = run;

    if (opening) {
      // Le contenu apparaît en fondu, juste après le début du dépliage.
      for (const child of details.children) {
        if (child === summary) continue;
        child.animate({ opacity: [0, 1], translate: ["0 -4px", "0 0"] }, { duration: 220, delay: 60, easing, fill: "backwards" });
      }
    }

    run.onfinish = () => {
      if (closing.current) details.open = false;
      closing.current = false;
      details.style.overflow = "";
      animation.current = null;
    };
  }

  return (
    <details ref={ref} onClick={handleClick} {...props}>
      {children}
    </details>
  );
}
