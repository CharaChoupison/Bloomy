"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MAX_THEME_BYTES, SAFE_MODE_PARAM, type CustomTheme } from "@/lib/custom-themes";
import {
  installTheme,
  removeTheme,
  restoreTheme,
  setQuickCss,
  setThemeEnabled,
  syncCustomCssWithPath,
  ThemeStorageError,
  useCustomThemes,
  useSafeMode,
} from "@/lib/custom-themes-client";
import { AlertCircleIcon, ExternalLinkIcon, FileTextIcon, Trash2Icon, UploadIcon } from "@/components/icons";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

/** Thèmes livrés avec l'app (public/themes), installables en un geste : servent aussi d'exemples. */
const EXAMPLE_THEMES = [
  { file: "minuit.css", name: "Minuit", description: "Noir profond et violet, pensé pour les écrans OLED." },
  { file: "papier.css", name: "Papier", description: "Tons crème et encre, angles plus doux à lire." },
] as const;

const GUIDE_HREF = "/themes/guide.md";

type Status = { tone: "success" | "danger"; text: string; undo?: { theme: CustomTheme; index: number } } | null;

/**
 * Réglages › Thèmes personnalisés : importer un .css, activer / désactiver / supprimer,
 * installer un exemple, écrire du CSS rapide. Tout s'applique immédiatement.
 */
export function CustomThemesSettings() {
  const { themes, quickCss } = useCustomThemes();
  const safeMode = useSafeMode();
  const [status, setStatus] = useState<Status>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function importFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    const installed: string[] = [];
    try {
      for (const file of list) {
        if (!/\.css$/i.test(file.name) && file.type !== "text/css") {
          throw new ThemeStorageError(`« ${file.name} » n'est pas un fichier .css.`);
        }
        if (file.size > MAX_THEME_BYTES) {
          throw new ThemeStorageError(`« ${file.name} » est trop lourd (${Math.round(MAX_THEME_BYTES / 1024)} Ko maximum).`);
        }
        installed.push(installTheme(await file.text(), file.name).name);
      }
      setStatus({
        tone: "success",
        text: installed.length > 1 ? `${installed.length} thèmes installés et activés.` : `« ${installed[0]} » installé et activé.`,
      });
    } catch (e) {
      setStatus({ tone: "danger", text: e instanceof ThemeStorageError ? e.message : "Impossible de lire ce fichier." });
    }
  }

  async function installExample(file: string) {
    try {
      const res = await fetch(`/themes/${file}`);
      if (!res.ok) throw new Error();
      const theme = installTheme(await res.text(), file);
      setStatus({ tone: "success", text: `« ${theme.name} » installé et activé.` });
    } catch (e) {
      setStatus({
        tone: "danger",
        text: e instanceof ThemeStorageError ? e.message : "Téléchargement impossible. Vérifie ta connexion et réessaie.",
      });
    }
  }

  function remove(theme: CustomTheme) {
    const index = themes.findIndex((t) => t.id === theme.id);
    removeTheme(theme.id);
    setStatus({ tone: "success", text: `« ${theme.name} » supprimé.`, undo: { theme, index } });
  }

  return (
    <div className="flex flex-col gap-4">
      {safeMode && (
        <Banner tone="warn">
          Thèmes désactivés pour cette visite (mode secours). Désactive ou supprime le thème qui pose problème, puis
          recharge l&apos;app.
        </Banner>
      )}

      {/* Zone de dépôt : un clic ouvre le sélecteur, on peut aussi glisser des fichiers dessus. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          importFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-start gap-3 rounded-lg border border-dashed p-4 transition-colors duration-[120ms] ${
          dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface"
        }`}
      >
        <p className="text-callout text-ink-muted">
          Un thème est un fichier <span className="font-mono text-ink">.css</span> qui change les couleurs, les arrondis ou
          la police de l&apos;app. Il reste sur cet appareil.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".css,text/css"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            if (e.target.files) importFiles(e.target.files);
            e.target.value = ""; // permet de réimporter le même fichier après modification
          }}
        />
        <Button onClick={() => fileInput.current?.click()}>
          <UploadIcon />
          Importer un thème
        </Button>
      </div>

      {status && (
        <div
          role={status.tone === "danger" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-md px-4 py-3 text-callout ${
            status.tone === "danger" ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
          }`}
        >
          {status.tone === "danger" && <AlertCircleIcon />}
          <p className="flex-1">{status.text}</p>
          {status.undo && (
            <button
              type="button"
              onClick={() => {
                restoreTheme(status.undo!.theme, status.undo!.index);
                setStatus({ tone: "success", text: `« ${status.undo!.theme.name} » remis.` });
              }}
              className="rounded-sm font-semibold whitespace-nowrap underline underline-offset-[3px]"
            >
              Annuler
            </button>
          )}
        </div>
      )}

      {themes.length > 0 ? (
        <ul aria-label="Thèmes installés" className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          {themes.map((theme) => (
            <ThemeRow key={theme.id} theme={theme} onRemove={() => remove(theme)} />
          ))}
        </ul>
      ) : (
        <p className="text-caption text-ink-muted">Aucun thème installé : l&apos;app utilise son apparence d&apos;origine.</p>
      )}

      <ExampleThemes installedNames={themes.map((t) => t.name)} onInstall={installExample} />

      <QuickCssEditor value={quickCss} />

      <a
        href={GUIDE_HREF}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-touch items-center gap-2 self-start rounded-md text-callout font-medium text-accent"
      >
        <FileTextIcon size={18} />
        Guide pour créer un thème
        <ExternalLinkIcon size={16} />
        <span className="sr-only">(nouvel onglet)</span>
      </a>
      <p className="-mt-3 text-caption text-ink-muted">
        Un thème cache l&apos;app ? Ouvre{" "}
        <span className="font-mono text-ink">/reglages?{SAFE_MODE_PARAM}</span> pour la retrouver sans thème.
      </p>
    </div>
  );
}

function ThemeRow({ theme, onRemove }: { theme: CustomTheme; onRemove: () => void }) {
  const titleId = useId();
  return (
    <li aria-labelledby={titleId} className="flex items-start gap-2 py-3 pr-2 pl-4">
      <div className="min-w-0 flex-1 py-1">
        <p id={titleId} className="text-body font-semibold break-words">
          {theme.name}
          {theme.version && <span className="ml-2 text-caption font-normal text-ink-muted">v{theme.version}</span>}
        </p>
        {theme.author && <p className="text-caption text-ink-muted">par {theme.author}</p>}
        {theme.description && <p className="mt-1 text-callout text-ink-muted">{theme.description}</p>}
      </div>
      <Switch
        checked={theme.enabled}
        onChange={(enabled) => setThemeEnabled(theme.id, enabled)}
        label={`Activer ${theme.name}`}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Supprimer ${theme.name}`}
        className="grid size-touch shrink-0 place-items-center rounded-full text-ink-muted hover:bg-danger-soft hover:text-danger"
      >
        <Trash2Icon />
      </button>
    </li>
  );
}

function ExampleThemes({
  installedNames,
  onInstall,
}: {
  installedNames: string[];
  onInstall: (file: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const available = EXAMPLE_THEMES.filter((t) => !installedNames.includes(t.name));
  if (!available.length) return null;
  return (
    <section aria-labelledby="themes-exemples" className="flex flex-col gap-2">
      <h3 id="themes-exemples" className="text-callout font-medium">
        Exemples à essayer
      </h3>
      <ul className="flex flex-col gap-2">
        {available.map((t) => (
          <li key={t.file} className="flex items-center gap-3 rounded-lg border border-line bg-surface py-2 pr-2 pl-4">
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold">{t.name}</p>
              <p className="text-caption text-ink-muted">{t.description}</p>
            </div>
            <Button
              variant="ghost"
              busy={busy === t.file}
              disabled={busy !== null}
              aria-label={`Installer ${t.name}`}
              onClick={async () => {
                setBusy(t.file);
                await onInstall(t.file);
                setBusy(null);
              }}
            >
              {busy === t.file ? "Installation…" : "Installer"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** CSS rapide (« QuickCSS » chez Vencord) : appliqué en direct, après tous les thèmes. */
function QuickCssEditor({ value }: { value: string }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(value.trim() !== "");
  // Dernière valeur connue du stockage. Si le stockage change sans nous (lecture après hydratation,
  // autre onglet), on recharge le brouillon ; nos propres enregistrements, eux, ne l'écrasent pas.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
    if (value.trim()) setOpen(true);
  }

  // Appliqué après une courte pause dans la frappe, pour ne pas recalculer tout l'affichage à chaque touche.
  useEffect(() => {
    if (draft === synced) return;
    const timer = window.setTimeout(() => {
      try {
        setQuickCss(draft);
        setSynced(draft); // après l'enregistrement : en cas d'échec, le brouillon est gardé
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Enregistrement impossible.");
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, synced]);

  return (
    <details
      className="rounded-lg border border-line bg-surface"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="flex min-h-touch cursor-pointer items-center justify-between gap-2 rounded-lg px-4 text-callout font-medium">
        CSS rapide
        <span className="text-caption font-normal text-ink-muted">
          {value.trim() ? "Actif" : "Pour les retouches"}
        </span>
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <label htmlFor={id} className="sr-only">
          CSS rapide
        </label>
        <textarea
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          rows={8}
          placeholder={":root {\n  --accent: #e8590c;\n  --radius-lg: 6px;\n}"}
          aria-describedby={`${id}-help`}
          aria-invalid={error ? true : undefined}
          className="min-h-40 w-full resize-y rounded-md border border-line-strong bg-surface-sunken px-3 py-2 font-mono text-caption text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <p id={`${id}-help`} role={error ? "alert" : undefined} className={`text-caption ${error ? "text-danger" : "text-ink-muted"}`}>
          {error ?? "S'applique en direct, après les thèmes activés. Vide le champ pour l'enlever."}
        </p>
      </div>
    </details>
  );
}

/** Coupe le CSS personnalisé sur la page de connexion, même en navigation côté client. */
export function CustomCssPathGuard() {
  const pathname = usePathname();
  useEffect(() => syncCustomCssWithPath(pathname), [pathname]);
  return null;
}
