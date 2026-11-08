// Illustrations des écrans vides : dessins au trait, épais et arrondis, légèrement penchés,
// avec de petits traits d'éclat. Même grammaire pour toutes (viewBox 160, trait 3.5,
// currentColor) afin qu'elles forment une famille. Décoratives : toujours aria-hidden.
import type { SVGProps } from "react";

type IllustrationProps = SVGProps<SVGSVGElement>;

/** Remplissage = fond de page : masque ce qui passe derrière un objet posé par-dessus (crayon, feuille…). */
const MASK = "var(--color-bg)";

function Illustration({ children, ...props }: IllustrationProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Trois petits traits qui rayonnent, comme dans un croquis (« ça brille »). */
function Sparkle({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d="M0 -6 v-9" />
      <path d="M8 -1 l7 -6" />
      <path d="M10 9 h9" />
    </g>
  );
}

/** Étoile à 5 branches aux pointes arrondies (par le strokeLinejoin). */
function starPath(cx: number, cy: number, r: number) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  });
  return `M${points.join(" L")} Z`;
}

/** Devoirs : cahier à spirale et crayon qui écrit. */
export const HomeworkIllustration = (p: IllustrationProps) => (
  <Illustration {...p}>
    <g transform="rotate(-8 80 80)">
      <rect x="42" y="32" width="70" height="88" rx="5" />
      <path d="M46 128 h62" />
      {[48, 72, 96].map((y) => (
        <path key={y} d={`M50 ${y} c-12 -4 -18 6 -12 12 c3 3 8 2 10 -1`} />
      ))}
      <path d="M60 52 h38" />
      <path d="M60 68 h30" />
      <path d="M60 84 h20" />
    </g>
    <g transform="translate(114 82) rotate(45)">
      <rect x="-7" y="-40" width="14" height="44" rx="3" fill={MASK} />
      <path d="M-7 4 L0 18 L7 4 Z" fill={MASK} />
      <path d="M-2.5 13 L0 18 L2.5 13" />
      <path d="M-7 -30 h14" />
    </g>
    <Sparkle x={128} y={30} rotate={-10} />
  </Illustration>
);

/** Notes : copie corrigée, note entourée, étoile. */
export const GradesIllustration = (p: IllustrationProps) => (
  <Illustration {...p}>
    <g transform="rotate(6 80 80)">
      <rect x="40" y="30" width="74" height="96" rx="5" />
      <path d="M52 48 h24" />
      <path d="M52 86 h50" />
      <path d="M52 100 h50" />
      <path d="M52 114 h30" />
      <path d="M106 52 a15 15 0 1 1 -6 -12" />
      <path d="M84 56 l5 5 l10 -11" />
    </g>
    <path d={starPath(30, 44, 11)} />
    <Sparkle x={130} y={24} rotate={-5} />
  </Illustration>
);

/** Vie scolaire : presse-papiers validé, rien à signaler. */
export const SchoolLifeIllustration = (p: IllustrationProps) => (
  <Illustration {...p}>
    <g transform="rotate(-5 80 80)">
      <rect x="40" y="34" width="78" height="96" rx="8" />
      <rect x="63" y="25" width="32" height="18" rx="5" fill={MASK} />
      <path d="M60 84 l13 13 l27 -30" />
    </g>
    <Sparkle x={128} y={34} rotate={-10} />
    <path d={starPath(28, 112, 8)} />
  </Illustration>
);

/** Contenu des cours : livre ouvert et marque-page. */
export const LessonsIllustration = (p: IllustrationProps) => (
  <Illustration {...p}>
    <g transform="rotate(-4 80 80)">
      <path d="M80 52 C66 42 46 42 28 46 v70 c18 -4 38 -4 52 6" />
      <path d="M80 52 C94 42 114 42 132 46 v70 c-18 -4 -38 -4 -52 6" />
      <path d="M80 52 v70" />
      <path d="M40 62 c9 -2 19 -2 28 2" />
      <path d="M40 78 c9 -2 19 -2 28 2" />
      <path d="M40 94 c9 -2 19 -2 28 2" />
      <path d="M92 78 c9 -4 19 -4 28 -2" />
      <path d="M92 94 c9 -4 19 -4 28 -2" />
      <path d="M104 40 v26 l6 -5 l6 5 v-26 z" fill={MASK} />
    </g>
    <Sparkle x={58} y={24} rotate={-30} />
  </Illustration>
);

/** Ressources : dossier ouvert, feuille et trombone. */
export const ResourcesIllustration = (p: IllustrationProps) => (
  <Illustration {...p}>
    <path d="M30 60 v-18 a6 6 0 0 1 6 -6 h24 l9 9 h47 a6 6 0 0 1 6 6 v9" />
    <g transform="rotate(-7 74 62)">
      <rect x="46" y="32" width="56" height="56" rx="4" fill={MASK} />
      <path d="M58 48 h30" />
      <path d="M58 60 h22" />
      <path d="M92 22 v24 a6 6 0 0 1 -12 0 v-18 a3.5 3.5 0 0 1 7 0 v16" />
    </g>
    <path
      d="M22 68 a6 6 0 0 1 6 -7 h104 a6 6 0 0 1 6 7 l-8 52 a6 6 0 0 1 -6 5 h-88 a6 6 0 0 1 -6 -5 z"
      fill={MASK}
    />
    <Sparkle x={128} y={30} rotate={-10} />
  </Illustration>
);

/** Actualités : journal plié. */
export const NewsIllustration = (p: IllustrationProps) => (
  <Illustration {...p}>
    <g transform="rotate(-6 80 80)">
      <path d="M44 36 h70 a5 5 0 0 1 5 5 v78 a8 8 0 0 1 -8 8 h-73 a10 10 0 0 1 -10 -10 v-58 h11 z" />
      <path d="M39 59 v58 a5 5 0 0 1 -10 0" />
      <path d="M54 52 h52" />
      <rect x="54" y="64" width="24" height="20" rx="3" />
      <path d="M86 66 h20" />
      <path d="M86 75 h20" />
      <path d="M86 84 h12" />
      <path d="M54 98 h52" />
      <path d="M54 110 h36" />
    </g>
    <Sparkle x={130} y={28} rotate={-10} />
  </Illustration>
);

/** Messagerie : enveloppe qui arrive. */
export const MessagesIllustration = (p: IllustrationProps) => (
  <Illustration {...p}>
    <g transform="rotate(-8 80 80)">
      <rect x="36" y="48" width="96" height="66" rx="7" />
      <path d="M38 54 l46 32 l46 -32" />
      <path d="M40 110 l30 -26" />
      <path d="M128 110 l-30 -26" />
    </g>
    <path d="M10 72 h14" />
    <path d="M6 88 h16" />
    <path d="M14 104 h8" />
    <Sparkle x={132} y={32} rotate={-10} />
  </Illustration>
);

/** Calendrier vide : page de calendrier ensoleillée (vacances). */
export const CalendarIllustration = (p: IllustrationProps) => (
  <Illustration {...p}>
    <g transform="rotate(-5 80 80)">
      <rect x="34" y="40" width="88" height="84" rx="9" />
      <path d="M34 62 h88" />
      <path d="M58 30 v18" />
      <path d="M98 30 v18" />
      <circle cx="78" cy="94" r="10" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 4) * i;
        const [x1, y1] = [78 + 16 * Math.cos(a), 94 + 16 * Math.sin(a)];
        const [x2, y2] = [78 + 21 * Math.cos(a), 94 + 21 * Math.sin(a)];
        return <path key={i} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`} />;
      })}
    </g>
    <Sparkle x={130} y={30} rotate={-10} />
  </Illustration>
);
