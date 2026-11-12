import { useId, type InputHTMLAttributes } from "react";
import { AlertCircleIcon } from "@/components/icons";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  help?: string;
  error?: string;
  /** Bouton posé dans le champ, à droite (ex. afficher le mot de passe). 44px de large au plus. */
  trailing?: React.ReactNode;
};

/** Champ avec libellé visible, aide et message d'erreur reliés au champ. */
export function TextField({ label, help, error, trailing, id, className = "", ...props }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? help;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={inputId} className="text-callout font-medium text-ink">
        {label}
      </label>
      <div className="relative flex">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={
            "min-h-control min-w-0 flex-1 rounded-md border bg-surface pl-4 text-input text-ink transition-colors duration-[120ms] " +
            "outline-none focus-visible:outline-none focus:ring-1 " +
            (trailing ? "pr-12 " : "pr-4 ") +
            (error
              ? "border-danger ring-1 ring-danger focus:border-danger focus:ring-danger"
              : "border-line-strong focus:border-accent focus:ring-accent")
          }
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0.5 flex items-center">{trailing}</div>}
      </div>
      {message && (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={`flex items-start gap-1 text-caption ${error ? "text-danger" : "text-ink-muted"}`}
        >
          {error && <AlertCircleIcon size={16} className="mt-px shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
}
