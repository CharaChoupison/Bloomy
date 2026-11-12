"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { segmentedItem, segmentedPill, segmentedTrack } from "@/components/ui/segmented";

/**
 * Contrôle segmenté fait de liens (filtre dans l'URL) : défile horizontalement sur téléphone.
 * Utilisé pour la période (Notes, Vie scolaire) et la matière (Ressources).
 *
 * Comme la barre d'onglets : une seule pastille glisse sous le segment actif, avec un léger rebond.
 * Les segments n'ont pas la même largeur, donc la pastille se cale sur la mesure du segment actif.
 */
export function SegmentedLinks({
  label,
  items,
  currentKey,
}: {
  label: string;
  items: { key: string; label: string; href: string }[];
  currentKey: string;
}) {
  // Le segment touché devient actif tout de suite, sans attendre la réponse du serveur.
  // Dès que la clé courante change, c'est de nouveau elle qui fait foi.
  const [pending, setPending] = useState<{ key: string; from: string } | null>(null);
  const activeKey = pending?.from === currentKey ? pending.key : currentKey;

  const scrollerRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  // Pas de glissement au tout premier placement : la pastille apparaît directement à sa place.
  const placedRef = useRef(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;

    const place = () => {
      const active = list.querySelector<HTMLElement>(`[data-key="${CSS.escape(activeKey)}"]`);
      if (!active) {
        pill.style.opacity = "0";
        return;
      }
      pill.style.width = `${active.offsetWidth}px`;
      pill.style.translate = `${active.offsetLeft}px 0`;
      pill.style.opacity = "1";
    };

    place();
    if (!placedRef.current) {
      placedRef.current = true;
      // Laisse le navigateur appliquer la position initiale avant d'activer la transition.
      requestAnimationFrame(() => pill.setAttribute("data-ready", ""));
    }

    // Garde le segment actif visible quand la liste défile (téléphone), sans faire défiler la page.
    const scroller = scrollerRef.current;
    const active = list.querySelector<HTMLElement>(`[data-key="${CSS.escape(activeKey)}"]`);
    if (scroller && active && scroller.scrollWidth > scroller.clientWidth) {
      const left = active.offsetLeft - 16;
      const right = active.offsetLeft + active.offsetWidth + 16 - scroller.clientWidth;
      if (scroller.scrollLeft > left) scroller.scrollTo({ left, behavior: "smooth" });
      else if (scroller.scrollLeft < right) scroller.scrollTo({ left: right, behavior: "smooth" });
    }

    // Le texte peut changer de largeur (police chargée, zoom du texte) : on recale la pastille.
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeKey]);

  return (
    <nav ref={scrollerRef} aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul ref={listRef} className={`flex w-max ${segmentedTrack}`}>
        <span
          ref={pillRef}
          aria-hidden="true"
          className={`${segmentedPill} left-0 opacity-0`}
        />
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            // « relative » : le segment passe au-dessus de la pastille. La mesure se fait donc sur le <li>
            // (positionné par rapport à la liste), pas sur le lien (positionné par rapport au <li>).
            <li key={item.key} data-key={item.key} className="relative">
              <Link
                href={item.href}
                onNavigate={() => setPending({ key: item.key, from: currentKey })}
                aria-current={active ? "page" : undefined}
                className={`${segmentedItem(active)} px-4 whitespace-nowrap`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Choix de la période (Semestre 1, Semestre 2…) via `?periode=`. Partagé par Notes et Vie scolaire. */
export function PeriodPicker({
  periods,
  currentId,
  basePath,
}: {
  periods: { id: string; name: string }[];
  currentId: string;
  basePath: string;
}) {
  if (periods.length < 2) return null;
  return (
    <SegmentedLinks
      label="Période"
      currentKey={currentId}
      items={periods.map((p) => ({ key: p.id, label: p.name, href: `${basePath}?periode=${encodeURIComponent(p.id)}` }))}
    />
  );
}
