"use client";

import { useEffect } from "react";

/**
 * Met en évidence l'élément visé par l'ancre de l'URL (#seance-…), y compris après une navigation
 * côté client, où le sélecteur CSS :target ne se déclenche pas. À placer après le contenu visé.
 */
export function HashHighlight() {
  useEffect(() => {
    const apply = () => {
      document.querySelectorAll("[data-target]").forEach((el) => el.removeAttribute("data-target"));
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      el.setAttribute("data-target", "");
      el.scrollIntoView({ block: "start" });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
  return null;
}
