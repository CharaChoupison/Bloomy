import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold text-body select-none " +
  "transition-[transform,opacity,border-color] duration-[120ms] ease-enter active:scale-[0.98] motion-reduce:active:scale-100 " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress";

const variants: Record<ButtonVariant, string> = {
  primary: "min-h-control rounded-full bg-accent px-6 text-on-accent hover:opacity-90",
  secondary: "min-h-control rounded-full border border-line-strong bg-surface px-6 text-ink hover:border-ink-muted",
  ghost: "min-h-touch rounded-full px-3 text-accent hover:bg-accent-soft",
  icon: "size-touch rounded-full border border-line bg-surface text-ink hover:border-line-strong",
};

/** Classes d'un bouton du Design System, pour les <Link> qui doivent ressembler à un bouton. */
export function buttonClasses(variant: ButtonVariant = "secondary", { block = false } = {}): string {
  return `${base} ${variants[variant]}${block ? " w-full" : ""}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  block?: boolean;
  /** Envoi en cours : spinner + aria-busy (le libellé doit passer au présent continu, ex. « Connexion… »). */
  busy?: boolean;
};

export function Button({ variant = "secondary", block, busy, className = "", children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      aria-busy={busy || undefined}
      className={`${buttonClasses(variant, { block })} ${className}`}
    >
      {busy && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}
